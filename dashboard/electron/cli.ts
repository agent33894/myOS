import { app } from 'electron';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { captureDraft } from '../shared/inbox';
import { selectToday } from '../shared/today';
import { ArtifactType, type ArtifactSummary } from '../shared/types';
import { createArtifact, listArtifacts } from './documents/artifacts';
import { currentWorkspace, loadWorkspace } from './workspace/root';

/**
 * Terminal entry points. They run against the configured workspace without
 * opening a window, so they work whether or not the app is running — the
 * app's file watcher picks up anything written here.
 */
const USAGE = `Usage: myos [command]

  myos                          Open myOS
  myos capture <text>           Capture to the Inbox, or as a task when it has a date,
                                flag, or @project (reads stdin when no text is given)
  myos today                    List overdue, today, upcoming, and done-today tasks
  myos search <query>           Find notes by title, tag or text
  myos --capture                Open Quick Capture in the running app
  myos --install-desktop-entry  Add myOS to the app launcher, register myos: links
                                and link the \`myos\` command into ~/.local/bin
`;

const COMMANDS = ['capture', 'today', 'search', 'help', '--help', '--install-desktop-entry'] as const;
type CliCommandName = (typeof COMMANDS)[number];

interface CliCommand {
  name: CliCommandName;
  args: string[];
}

/** `args` excludes the executable (and the app path in development). */
export function parseCliCommand(args: string[]): CliCommand | null {
  const index = args.findIndex((arg) => (COMMANDS as readonly string[]).includes(arg));
  // Only the first user argument selects a command; Chromium switches that
  // wrappers add (e.g. --no-sandbox) may precede it.
  if (index < 0 || args.slice(0, index).some((arg) => !arg.startsWith('--'))) return null;
  return { name: args[index] as CliCommandName, args: args.slice(index + 1) };
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function projectTitles(artifacts: ArtifactSummary[]): Map<string, string> {
  return new Map(
    artifacts
      .filter((artifact) => artifact.type === ArtifactType.PROJECT)
      .map((project) => [project.id, project.title]),
  );
}

function taskLine(task: ArtifactSummary, projects: Map<string, string>): string {
  const detail = [task.due ? `due ${task.due}` : null, task.project ? projects.get(task.project) ?? task.project : null]
    .filter(Boolean)
    .join(' · ');
  return `  ${task.title}${detail ? `  (${detail})` : ''}`;
}

async function capture(args: string[]): Promise<number> {
  const text = (args.join(' ') || (await readStdin())).trim();
  if (!text) {
    console.error('Nothing to capture. Usage: myos capture <text>');
    return 1;
  }
  const projects = (await listArtifacts()).filter((artifact) => artifact.type === ArtifactType.PROJECT);
  const draft = captureDraft(text, projects);
  const artifact = await createArtifact(draft);
  console.log(`${draft.type === ArtifactType.TODO ? 'Added task' : 'Captured to Inbox'}: ${artifact.filePath}`);
  return 0;
}

async function today(): Promise<number> {
  const artifacts = await listArtifacts();
  const projects = projectTitles(artifacts);
  const { overdue, today, upcoming, doneToday } = selectToday(artifacts);
  const sections: Array<[string, ArtifactSummary[]]> = [
    ['Overdue', overdue],
    ['Today', today],
    ['Upcoming', upcoming],
    ['Done today', doneToday],
  ];
  for (const [heading, tasks] of sections) {
    console.log(`${heading} (${tasks.length})`);
    for (const task of tasks) console.log(taskLine(task, projects));
  }
  return 0;
}

async function search(args: string[]): Promise<number> {
  const terms = args.join(' ').toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    console.error('Usage: myos search <query>');
    return 1;
  }
  const root = currentWorkspace() ?? '';
  const matches = (await listArtifacts())
    .filter((artifact) => {
      const haystack = [artifact.title, ...artifact.tags, artifact.searchText ?? '']
        .join('\n')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => b.updated.localeCompare(a.updated));
  for (const artifact of matches) {
    console.log(`${artifact.title}\t${artifact.type}\t${join(root, artifact.filePath)}`);
  }
  return matches.length > 0 ? 0 : 1;
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
  if (existsSync(bundledIcon)) copyFileSync(bundledIcon, join(icons, 'myos.png'));

  // The file name must match package.json `desktopName`, which Electron uses
  // as the Wayland app_id — that's how launchers match the running window.
  writeFileSync(
    join(applications, 'myos.desktop'),
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=myOS',
      'Comment=Local Markdown workspace',
      `Exec="${executable}" %U`,
      'Icon=myos',
      'Terminal=false',
      'Categories=Office;',
      'MimeType=x-scheme-handler/myos;',
      'StartupWMClass=myos',
      'Actions=capture;',
      '',
      '[Desktop Action capture]',
      'Name=Quick Capture',
      `Exec="${executable}" --capture`,
      '',
    ].join('\n'),
  );

  // Replace the hand-written entry older docs asked for, so the launcher
  // doesn't show two myOS items.
  const legacyEntry = join(applications, 'com.myos.markdown.desktop');
  if (existsSync(legacyEntry) && readFileSync(legacyEntry, 'utf8').includes('Name=myOS')) {
    rmSync(legacyEntry);
  }

  // User-local installs should expose their own command even when an older
  // system package also provides /usr/bin/myos. Never replace a real file.
  const binDirectory = join(homedir(), '.local', 'bin');
  const command = join(binDirectory, 'myos');
  let linkedCommand = false;
  mkdirSync(binDirectory, { recursive: true });
  const isOurLink =
    existsSync(command) && lstatSync(command).isSymbolicLink() && /myos/i.test(readlinkSync(command));
  if (!existsSync(command) || isOurLink) {
    rmSync(command, { force: true });
    symlinkSync(executable, command);
    linkedCommand = true;
  }

  for (const [tool, args] of [
    ['xdg-mime', ['default', 'myos.desktop', 'x-scheme-handler/myos']],
    ['update-desktop-database', [applications]],
  ] as const) {
    try {
      execFileSync(tool, args, { stdio: 'ignore' });
    } catch {
      // Optional desktop tooling; the entry itself is already in place.
    }
  }

  console.log(`Installed ${join(applications, 'myos.desktop')}`);
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
      console.error('No workspace yet. Open myOS once to choose or create one.');
      return 1;
    }
    if (command.name === 'capture') return await capture(command.args);
    if (command.name === 'today') return await today();
    return await search(command.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

export const cliArgs = (): string[] => process.argv.slice(app.isPackaged ? 1 : 2);
