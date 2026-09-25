import { execFile, spawn } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, readlink, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') {
  throw new Error('The packaged Linux smoke test must run on Linux.');
}

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const executable = resolve(dashboardRoot, 'release/linux-unpacked/myos-next');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'myos-next-smoke-'));
const home = join(temporaryRoot, 'home');
const config = join(temporaryRoot, 'config');
const cache = join(temporaryRoot, 'cache');
const data = join(temporaryRoot, 'data');
await Promise.all([home, config, cache, data].map((path) => mkdir(path, { recursive: true })));

const environment = {
  ...process.env,
  HOME: home,
  XDG_CONFIG_HOME: config,
  XDG_CACHE_HOME: cache,
  XDG_DATA_HOME: data,
};
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.MYOS_QA_VAULT_PATH;
delete environment.VITE_DEV_SERVER_URL;

const child = spawn(executable, ['--no-sandbox', '--disable-gpu', '--remote-debugging-port=0'], {
  cwd: dashboardRoot,
  env: environment,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let childExit = null;
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });
child.on('exit', (code, signal) => { childExit = `${code ?? signal}`; });
child.on('error', (error) => { childExit = error.message; });

const pause = (duration) => new Promise((done) => setTimeout(done, duration));

async function until(label, action, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  let latestError;
  while (Date.now() < deadline) {
    if (childExit !== null) {
      throw new Error(`${label}: app exited (${childExit})\n${output}`);
    }
    try {
      const value = await action();
      if (value) return value;
    } catch (error) {
      latestError = error;
    }
    await pause(250);
  }
  throw new Error(`${label} timed out${latestError ? `: ${latestError.message}` : ''}\n${output}`);
}

let socket;
try {
  const port = await until('DevTools endpoint', () => {
    const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
    return match?.[1];
  });
  const page = await until('renderer target', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await response.json();
    return targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  });

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data: raw }) => {
    const message = JSON.parse(raw);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve: complete, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else complete(message.result);
  });

  async function evaluate(expression) {
    const id = ++nextId;
    const response = new Promise((complete, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`DevTools evaluation ${id} timed out`));
      }, 10_000);
      pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); complete(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
    });
    socket.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
    const result = await response;
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description ?? ''));
    }
    return result.result?.value;
  }

  await until('onboarding and preload', async () => {
    const state = await evaluate('({welcome: !!document.querySelector("#welcome-title"), preload: typeof window.electronAPI?.invoke === "function"})');
    return state?.welcome && state?.preload;
  });

  await evaluate(`document.querySelector('[data-testid="onboarding-start-fresh"]').click()`);
  const workspacePath = await until('starter folder', async () => {
    const state = await evaluate('(async () => ({welcome: !!document.querySelector("#welcome-title"), path: (await window.electronAPI.invoke("workspace:current")).value}))()');
    return !state.welcome && state.path?.endsWith('/Documents/myOS Next') ? state.path : null;
  });
  if (!workspacePath.startsWith(home + '/')) throw new Error(`The starter folder escaped the temporary home: ${workspacePath}`);
  await stat(join(workspacePath, 'Welcome.md'));
  await until('the shell shows Today and the files', () =>
    evaluate(`!!document.querySelector('nav[aria-label="Places"]') && document.body.innerText.includes('Welcome') && !document.body.innerText.includes('hit a problem')`),
  );

  await evaluate(`(() => {
    window.__smokeEvents = [];
    window.electronAPI.on('files:changed', (change) => window.__smokeEvents.push(change));
  })()`);
  await mkdir(join(workspacePath, 'notes/deep'), { recursive: true });
  await writeFile(join(workspacePath, 'notes/deep/external.md'), '# External\n\n- [ ] Outside task 📅 2026-01-01\n', 'utf8');
  await until('watcher reports nested files and folders', async () => {
    const events = await evaluate('window.__smokeEvents');
    return events.some((event) => event.path === 'notes/deep/external.md' && event.entry === 'file' && event.kind !== 'deleted') &&
      events.some((event) => event.entry === 'folder');
  });

  const roundTrip = await evaluate(`(async () => {
    const call = async (channel, ...args) => {
      const result = await window.electronAPI.invoke(channel, ...args);
      if (!result.ok) throw new Error(channel + ': ' + result.error.code + ' ' + result.error.message);
      return result.value;
    };
    const listing = await call('files:list');
    const created = await call('files:create', 'notes/Smoke.md', '---\\nkeep: me\\n---\\nFirst');
    const saved = await call('files:save', created.path, {content: 'Saved once', properties: {status: 'draft'}}, created.rev);
    const stale = await window.electronAPI.invoke('files:save', created.path, {content: 'Stale'}, created.rev);
    const moved = await call('files:move', saved.path, 'notes/Renamed smoke.md', saved.rev);
    const versions = await call('history:list', moved.path);
    const snapshot = await call('files:delete', moved.path, moved.rev);
    const restored = await call('files:restore', snapshot);
    const welcome = await call('files:read', 'Welcome.md');
    const toggled = await call('tasks:toggle', welcome.tasks[0], welcome.rev);
    const captured = await call('daily:capture', 'Smoke capture tomorrow #smoke');
    await call('folders:create', 'empty/inner');
    const folder = await call('folders:move', 'empty', 'moved');
    const removed = await call('folders:delete', folder);
    const settings = await call('settings:set', {captureHeading: 'Log', vimKeys: true});
    const badSetting = await window.electronAPI.invoke('settings:set', {theme: 'purple'});
    const git = await call('git:status');
    const outside = await window.electronAPI.invoke('files:read', '../escape.md');
    return {
      folders: listing.folders, content: restored.content, properties: restored.properties, stale: stale.ok ? 'ok' : stale.error.code,
      path: restored.path, versions: versions.length, toggled: toggled.tasks[0].status, captured: captured.path,
      capturedTasks: captured.tasks.map((task) => task.text), removed, heading: settings.captureHeading,
      badSetting: badSetting.ok ? 'ok' : badSetting.error.code, repo: git.repo, outside: outside.ok ? 'ok' : outside.error.code,
    };
  })()`);
  const expectations = [
    roundTrip.folders.includes('notes/deep'),
    roundTrip.content === 'Saved once',
    roundTrip.properties.keep === 'me' && roundTrip.properties.status === 'draft',
    roundTrip.stale === 'CONFLICT',
    roundTrip.path === 'notes/Renamed smoke.md',
    roundTrip.versions >= 1,
    roundTrip.toggled === 'done',
    /^daily\/\d{4}-\d{2}-\d{2}\.md$/.test(roundTrip.captured),
    roundTrip.capturedTasks.includes('Smoke capture #smoke'),
    roundTrip.removed.length === 0,
    roundTrip.heading === 'Log',
    roundTrip.badSetting === 'INVALID',
    roundTrip.repo === false,
    ['INVALID', 'OUTSIDE_WORKSPACE'].includes(roundTrip.outside),
  ];
  if (expectations.includes(false)) throw new Error(`IPC round trip returned unexpected data: ${JSON.stringify(roundTrip)}`);
  const welcomeText = await readFile(join(workspacePath, 'Welcome.md'), 'utf8');
  if (!/^- \[x\] Check this task off ✅ \d{4}-\d{2}-\d{2}$/m.test(welcomeText)) throw new Error(`The task line was not checked off:\n${welcomeText}`);
  try {
    await stat(join(workspacePath, 'moved'));
    throw new Error('The deleted folder is still on disk.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  // Its own app data folder, apart from myOS 3.0.
  const appData = join(config, 'myOS Next');
  const workspaceJson = JSON.parse(await readFile(join(appData, 'workspace.json'), 'utf8'));
  if (workspaceJson.path !== workspacePath) throw new Error('The open folder was not saved in the app data folder.');
  const settingsJson = JSON.parse(await readFile(join(appData, 'settings.json'), 'utf8'));
  if (settingsJson.captureHeading !== 'Log') throw new Error('Settings were not saved in the app data folder.');
  for (const legacy of ['myOS', 'myos-markdown', 'myos-next']) {
    try {
      await stat(join(config, legacy));
      throw new Error(`Found an app data folder that is not myOS Next's: ${legacy}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  // Terminal commands run headless next to the open window. ELECTRON_RUN_AS_NODE
  // is set on purpose: the packaged fuse must ignore it.
  const runCli = (args, okCodes = [0]) => new Promise((done, fail) => {
    execFile(executable, ['--no-sandbox', ...args], { env: { ...environment, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30_000 },
      (error, stdout, stderr) => (error && !okCodes.includes(error.code) ? fail(new Error(`myos-next ${args.join(' ')} failed: ${stderr || error.message}`)) : done(stdout)));
  });
  const added = await runCli(['add', '[ ] Terminal task #smoke']);
  const addedPath = added.match(/Added to (daily\/\S+\.md)/)?.[1];
  if (!addedPath) throw new Error(`Unexpected add output: ${added}`);
  await until('CLI add reaches the running window', async () => {
    const events = await evaluate('window.__smokeEvents');
    return events.filter((event) => event.path === addedPath).length > 0;
  });
  const tasks = await runCli(['tasks', 'open #smoke']);
  if (!tasks.includes('Terminal task #smoke') || !tasks.includes('Smoke capture #smoke')) throw new Error(`myos-next tasks missed tasks: ${tasks}`);
  const today = await runCli(['today']);
  if (!/^Daily note: daily\/\d{4}-\d{2}-\d{2}\.md$/m.test(today) || !/^Late \(\d+\)$/m.test(today) || !today.includes('Outside task')) {
    throw new Error(`Unexpected myos-next today output: ${today}`);
  }
  const found = await runCli(['find', 'External']);
  if (!found.includes(join(workspacePath, 'notes/deep/external.md'))) throw new Error(`myos-next find missed the note: ${found}`);

  // `open` goes to the running window.
  await runCli(['open', 'notes/deep/external.md']);
  await until('open shows the note in the editor', async () =>
    (await evaluate('decodeURIComponent(window.location.hash)')).includes('/note?path=notes/deep/external.md') &&
    (await evaluate(`document.querySelector('.ProseMirror')?.innerText.includes('Outside task') ?? false`)),
  );

  await runCli(['--install-desktop-entry']);
  const desktopEntry = await readFile(join(data, 'applications', 'myos-next.desktop'), 'utf8');
  for (const line of ['Name=myOS Next', 'StartupWMClass=myos-next', 'Icon=myos-next', 'MimeType=x-scheme-handler/myos-next;', `Exec="${executable}" %U`, 'Name=Capture']) {
    if (!desktopEntry.includes(line)) throw new Error(`Desktop entry is missing ${line}:\n${desktopEntry}`);
  }
  await stat(join(data, 'icons', 'hicolor', '512x512', 'apps', 'myos-next.png'));
  const commandLink = join(home, '.local', 'bin', 'myos-next');
  if (!(await lstat(commandLink)).isSymbolicLink() || (await readlink(commandLink)) !== executable) {
    throw new Error('myos-next was not linked into ~/.local/bin');
  }

  console.log('Packaged Linux smoke passed: onboarding, starter folder, watcher (files and folders), files/folders/tasks/daily/settings/git IPC with conflicts and path checks, own app data folder, terminal add/tasks/today/find/open, desktop entry.');
} finally {
  socket?.close();
  child.kill('SIGTERM');
  await Promise.race([new Promise((done) => child.once('exit', done)), pause(3_000)]);
  if (childExit === null) child.kill('SIGKILL');
  await rm(temporaryRoot, { recursive: true, force: true });
}
