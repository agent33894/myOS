import { execFile, spawn } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, readlink, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') {
  throw new Error('The packaged Linux smoke test must run on Linux.');
}

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const executable = resolve(dashboardRoot, 'release/linux-unpacked/myos');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'myos-linux-smoke-'));
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
delete environment.VAULT_PATH;
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
    const state = await evaluate('({welcome: !!document.querySelector("#welcome-title"), preload: typeof window.electronAPI?.createDefaultVault === "function"})');
    return state?.welcome && state?.preload;
  });

  await evaluate('document.querySelector(".myos-welcome-actions button:last-child").click()');
  const workspacePath = await until('default workspace', async () => {
    const state = await evaluate('(async () => ({welcome: !!document.querySelector("#welcome-title"), path: await window.electronAPI.getVaultPath()}))()');
    return !state.welcome && state.path?.endsWith('/Documents/myOS') ? state.path : null;
  });
  if (!workspacePath.startsWith(home + '/')) {
    throw new Error(`Default workspace escaped temporary home: ${workspacePath}`);
  }
  await stat(join(workspacePath, 'Welcome to myOS.md'));

  await evaluate(`(() => {
    window.__myosSmokeEvents = [];
    window.electronAPI.onFileChanged((event, data) => window.__myosSmokeEvents.push({event, path: data.filePath}));
  })()`);
  const externalRelativePath = 'work/memos/external-linux-smoke.md';
  await writeFile(join(workspacePath, externalRelativePath), '# External Linux smoke\n', 'utf8');
  await until('nested external Markdown watcher', async () => {
    const events = await evaluate('window.__myosSmokeEvents');
    return events.some((event) => event.path === 'work/memos/external-linux-smoke.md' && (event.event === 'created' || event.event === 'updated'));
  });
  const externalContent = await evaluate(`window.electronAPI.readArtifactContent(${JSON.stringify(externalRelativePath)})`);
  if (externalContent !== '# External Linux smoke') {
    throw new Error(`External Markdown read failed: ${externalContent}`);
  }

  const roundTrip = await evaluate(`(async () => {
    const api = window.electronAPI;
    const created = await api.createArtifact({title: 'Linux smoke memo', type: 'memo', domain: 'work', content: 'Packaged IPC round trip'});
    const content = await api.readArtifactContent(created.filePath);
    const read = await api.readArtifact(created.filePath);
    await api.deleteArtifact(created.filePath);
    return {path: created.filePath, content, title: read?.title};
  })()`);
  if (roundTrip.title !== 'Linux smoke memo' || roundTrip.content !== 'Packaged IPC round trip') {
    throw new Error(`IPC round trip returned unexpected data: ${JSON.stringify(roundTrip)}`);
  }
  try {
    await stat(join(workspacePath, roundTrip.path));
    throw new Error('Deleted smoke artifact remains on disk.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const configJson = JSON.parse(await readFile(join(config, 'myOS', 'myos-config.json'), 'utf8'));
  if (configJson.vaultPath !== workspacePath) {
    throw new Error('Selected workspace was not persisted in isolated config.');
  }

  // Terminal commands run headless next to the open window. ELECTRON_RUN_AS_NODE
  // is set on purpose: the packaged fuse must ignore it.
  const runCli = (args) => new Promise((done, fail) => {
    execFile(executable, ['--no-sandbox', ...args], { env: { ...environment, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30_000 },
      (error, stdout, stderr) => (error ? fail(new Error(`myos ${args.join(' ')} failed: ${stderr || error.message}`)) : done(stdout)));
  });
  const captured = await runCli(['capture', 'Linux smoke capture #smoke']);
  const capturedPath = captured.match(/Captured to Unfiled: (inbox\/\S+\.md)/)?.[1];
  if (!capturedPath) throw new Error(`Unexpected capture output: ${captured}`);
  await until('CLI capture reaches the running window', async () => {
    const events = await evaluate('window.__myosSmokeEvents');
    return events.some((event) => event.path === capturedPath);
  });
  const found = await runCli(['search', 'smoke', 'capture']);
  if (!found.includes('Linux smoke capture')) throw new Error(`myos search missed the capture: ${found}`);
  const today = await runCli(['today']);
  if (!/^In play \(\d+\)$/m.test(today) || !/^Next \(\d+\)$/m.test(today)) throw new Error(`Unexpected myos today output: ${today}`);

  await runCli(['--install-desktop-entry']);
  const desktopEntry = await readFile(join(data, 'applications', 'myos.desktop'), 'utf8');
  for (const line of ['StartupWMClass=myos', 'Icon=myos', 'MimeType=x-scheme-handler/myos;', `Exec="${executable}" %U`]) {
    if (!desktopEntry.includes(line)) throw new Error(`Desktop entry is missing ${line}:\n${desktopEntry}`);
  }
  await stat(join(data, 'icons', 'hicolor', '512x512', 'apps', 'myos.png'));
  const commandLink = join(home, '.local', 'bin', 'myos');
  if (!(await lstat(commandLink)).isSymbolicLink() || (await readlink(commandLink)) !== executable) {
    throw new Error('myos was not linked into ~/.local/bin');
  }

  console.log(`Packaged Linux smoke passed: onboarding, default workspace, nested watcher, preload IPC create/read/delete (${roundTrip.path}), terminal capture/search/today, desktop entry.`);
} finally {
  socket?.close();
  child.kill('SIGTERM');
  await Promise.race([new Promise((done) => child.once('exit', done)), pause(3_000)]);
  if (childExit === null) child.kill('SIGKILL');
  await rm(temporaryRoot, { recursive: true, force: true });
}
