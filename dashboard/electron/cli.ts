import { app } from 'electron';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { isAbsolute, join, relative, resolve } from 'path';
import { formatLocalDate } from '../shared/date';
import { runView } from '../shared/query';
import { todayBucket, type Task } from '../shared/tasks';
import { capture, dailyNotePath } from './documents/daily';
import { listFiles } from './documents/files';
import { currentWorkspace, loadWorkspace } from './workspace/root';

/**
 * Terminal entry points. They run against the open folder without a window,
 * so they work whether or not the app is running; the app's watcher picks up
 * anything written here. `open` is the exception: it goes to the window.
 */
const USAGE = `Usage: myos-next [command]

  myos-next                    Open myOS Next
  myos-next add <text>         Add a line to today's daily note (or the capture file).
                               "[ ] …", a date (tomorrow, fri, 📅 2026-10-01), a repeat
                               (every tue), or ! makes it a task. Reads stdin without text.
  myos-next today              Late tasks and tasks due, scheduled, or starting today,
                               and the daily note's path
  myos-next tasks [query]      Tasks matching a view, such as "open #work due<=today"
                               (default: open)
  myos-next find <words>       Notes whose title or text has every word
  myos-next open <path>        Show a file in myOS Next, starting it when needed
  myos-next --capture          Open quick capture in myOS Next
  myos-next --install-desktop-entry
                               Add myOS Next to the app launcher, register myos-next:
                               links, and link the command into ~/.local/bin
`;

const HEADLESS = ['add', 'today', 'tasks', 'find', 'help', '--help', '--install-desktop-entry'] as const;
type CliCommandName = (typeof HEADLESS)[number];

interface CliCommand {
  name: CliCommandName;
  args: string[];
}

/** The first argument that isn't a switch (wrappers may add Chromium switches such as --no-sandbox before it). */
function commandAt(args: string[], names: readonly string[]): number {
  const index = args.findIndex((arg) => names.includes(arg));
  return index < 0 || args.slice(0, index).some((arg) => !arg.startsWith('--')) ? -1 : index;
}

/** `args` excludes the executable (and the app path in development). */
export function parseCliCommand(args: string[]): CliCommand | null {
  const index = commandAt(args, HEADLESS);
  return index < 0 ? null : { name: args[index] as CliCommandName, args: args.slice(index + 1) };
}

/**
 * The file `myos-next open <path>` asks for, relative to the open folder. A
 * path is read against `cwd` first (so `open ./notes/a.md` works from a
 * terminal inside the folder), then as folder-relative.
 */
export function openRequest(args: string[], cwd: string): string | null {
  const index = commandAt(args, ['open']);
  const target = index < 0 ? undefined : args[index + 1];
  if (!target) return null;
  const root = currentWorkspace();
  const absolute = isAbsolute(target) ? target : resolve(cwd, target);
  if (root && existsSync(absolute)) {
    const inside = relative(root, absolute);
    if (inside && !inside.startsWith('..') && !isAbsolute(inside)) return inside.split('\\').join('/');
  }
  return isAbsolute(target) ? null : target.replace(/^\.\//, '');
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

const DATE_LABELS: Array<[keyof Task, string]> = [
  ['due', 'due'],
  ['scheduled', 'scheduled'],
  ['start', 'starts'],
  ['done', 'done'],
];

function taskLine(task: Task): string {
  const box = task.status === 'done' ? '[x]' : task.status === 'cancelled' ? '[-]' : '[ ]';
  const dates = DATE_LABELS.flatMap(([field, label]) => (task[field] ? [`${label} ${task[field] as string}`] : []));
  const where = task.line > 0 ? `${task.path}:${task.line}` : task.path;
  return `  ${box} ${task.text}${dates.length ? `  (${dates.join(', ')})` : ''}  ${where}`;
}

async function add(args: string[]): Promise<number> {
  const text = (args.join(' ') || (await readStdin())).trim();
  if (!text) {
    console.error('Nothing to add. Usage: myos-next add <text>');
    return 1;
  }
  const note = await capture(text);
  console.log(`Added to ${note.path}`);
  return 0;
}

async function today(): Promise<number> {
  const day = formatLocalDate();
  const { notes } = await listFiles();
  const daily = dailyNotePath();
  const tasks = notes.flatMap((note) => note.tasks).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.path.localeCompare(b.path) || a.line - b.line);
  const overdue = tasks.filter((task) => todayBucket(task, day) === 'overdue');
  const due = tasks.filter((task) => todayBucket(task, day) === 'today');
  console.log(`Daily note: ${daily}${notes.some((note) => note.path === daily) ? '' : ' (not written yet)'}`);
  for (const [heading, list] of [['Late', overdue], ['Today', due]] as const) {
    console.log(`${heading} (${list.length})`);
    for (const task of list) console.log(taskLine(task));
  }
  return 0;
}

async function tasks(args: string[]): Promise<number> {
  const query = args.join(' ').trim() || 'open';
  const result = runView('tasks', query, (await listFiles()).notes, formatLocalDate());
  for (const error of result.errors) console.error(error);
  if (result.kind !== 'tasks') return 1;
  for (const group of result.groups) {
    if (group.label) console.log(`${group.label} (${group.items.length})`);
    for (const task of group.items) console.log(taskLine(task));
  }
  return result.total > 0 ? 0 : 1;
}

async function find(args: string[]): Promise<number> {
  const words = args.join(' ').trim();
  if (!words) {
    console.error('Usage: myos-next find <words>');
    return 1;
  }
  const root = currentWorkspace() ?? '';
  const result = runView('notes', `${words} sort:modified`, (await listFiles()).notes, formatLocalDate());
  if (result.kind !== 'notes') return 1;
  const notes = result.groups.flatMap((group) => group.items);
  for (const note of notes) console.log(`${note.title}\t${join(root, note.path)}`);
  return notes.length > 0 ? 0 : 1;
}

function installDesktopEntry(): number {
  if (process.platform !== 'linux') {
    console.error('--install-desktop-entry is only needed on Linux.');
    return 1;
  }
  // Prefer the AppImage file itself: the mounted executable path changes on every launch.
  const executable = process.env.APPIMAGE || process.execPath;
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  const applications = join(dataHome, 'applications');
  const icons = join(dataHome, 'icons', 'hicolor', '512x512', 'apps');
  mkdirSync(applications, { recursive: true });
  mkdirSync(icons, { recursive: true });

  const bundledIcon = join(process.resourcesPath, 'icon.png');
  if (existsSync(bundledIcon)) copyFileSync(bundledIcon, join(icons, 'myos-next.png'));

  // The file name must match package.json `desktopName`, which Electron uses
  // as the Wayland app_id; that is how launchers match the running window.
  const entry = join(applications, 'myos-next.desktop');
  writeFileSync(
    entry,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=myOS Next',
      'Comment=A quiet editor for a folder of Markdown files',
      `Exec="${executable}" %U`,
      'Icon=myos-next',
      'Terminal=false',
      'Categories=Office;TextEditor;',
      'MimeType=x-scheme-handler/myos-next;',
      'StartupWMClass=myos-next',
      'Actions=capture;',
      '',
      '[Desktop Action capture]',
      'Name=Capture',
      `Exec="${executable}" --capture`,
      '',
    ].join('\n'),
  );

  // Link the command for this user; never replace a real file or someone else's link.
  const binDirectory = join(homedir(), '.local', 'bin');
  const command = join(binDirectory, 'myos-next');
  let linkedCommand = false;
  mkdirSync(binDirectory, { recursive: true });
  const isOurLink = existsSync(command) && lstatSync(command).isSymbolicLink() && /myos-next|myOS Next/i.test(readlinkSync(command));
  if (!existsSync(command) || isOurLink) {
    rmSync(command, { force: true });
    symlinkSync(executable, command);
    linkedCommand = true;
  }

  for (const [tool, args] of [
    ['xdg-mime', ['default', 'myos-next.desktop', 'x-scheme-handler/myos-next']],
    ['update-desktop-database', [applications]],
  ] as const) {
    try {
      execFileSync(tool, args, { stdio: 'ignore' });
    } catch {
      // Optional desktop tooling; the entry itself is already in place.
    }
  }

  console.log(`Installed ${entry}`);
  if (linkedCommand) console.log(`Linked ${command} -> ${executable}`);
  return 0;
}

export async function runCliCommand(command: CliCommand): Promise<number> {
  try {
    if (command.name === 'help' || command.name === '--help') {
      console.log(USAGE);
      return 0;
    }
    if (command.name === '--install-desktop-entry') return installDesktopEntry();

    loadWorkspace();
    if (!currentWorkspace()) {
      console.error('No folder is open yet. Open myOS Next once to choose one.');
      return 1;
    }
    if (command.name === 'add') return await add(command.args);
    if (command.name === 'today') return await today();
    if (command.name === 'tasks') return await tasks(command.args);
    return await find(command.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

export const cliArgs = (argv = process.argv): string[] => argv.slice(app.isPackaged ? 1 : 2);
