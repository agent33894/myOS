import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { DomainError } from '../errors';
import { ensureStableAppDataPath, getLegacyAppDataPaths, getStableAppDataPath } from '../utils/stable-app-data';

/**
 * The selected workspace folder. Only the main process sets it — from the
 * native folder dialog or starter creation — so the renderer can never point
 * file operations somewhere else.
 */
let root: string | null = null;

const configPath = () => join(getStableAppDataPath(), 'myos-config.json');

// `vaultPath` is the historical key; `myos` CLI and older builds read it too.
interface Config {
  vaultPath?: string;
}

function readConfig(): Config {
  const candidates = [configPath(), ...getLegacyAppDataPaths().map((dir) => join(dir, 'myos-config.json'))];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const config = JSON.parse(readFileSync(candidate, 'utf-8')) as Config;
      if (candidate !== configPath()) writeConfig(config);
      return config;
    } catch (error) {
      console.error(`Error reading config from ${candidate}:`, error);
    }
  }
  return {};
}

function writeConfig(config: Config) {
  ensureStableAppDataPath();
  writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** Pick up the configured workspace at startup (and in the headless CLI). */
export function loadWorkspace(): void {
  const qaPath = process.env.VITE_DEV_SERVER_URL ? process.env.MYOS_QA_VAULT_PATH : undefined;
  const devPath = process.env.VITE_DEV_SERVER_URL ? resolve(process.cwd(), '..', 'vault') : undefined;
  const candidate = [qaPath, readConfig().vaultPath, process.env.VAULT_PATH, devPath].find(
    (path): path is string => Boolean(path && isDirectory(path)),
  );
  root = candidate ? realpathSync(candidate) : null;
}

export function currentWorkspace(): string | null {
  return root;
}

export function workspaceRoot(): string {
  if (!root || !isDirectory(root)) throw new DomainError('NOT_FOUND', 'No workspace folder is selected.');
  return root;
}

export function selectWorkspace(path: string): string {
  const resolved = realpathSync(path);
  if (resolved === '/' || !isDirectory(resolved)) {
    throw new DomainError('INVALID', 'Choose a folder other than the filesystem root.');
  }
  root = resolved;
  writeConfig({ ...readConfig(), vaultPath: resolved });
  return resolved;
}

const STARTER_DIRECTORIES = [
  'inbox',
  'work/memos',
  'work/projects',
  'work/todos',
  'personal/memos',
  'personal/projects',
  'personal/todos',
  'research/topics',
  'creative/writing',
];

/** Create (or reuse) `~/Documents/myOS` with a welcome note and select it. */
export function createStarterWorkspace(): string {
  const documents = app.getPath('documents');
  // Electron falls back to HOME when XDG_DOCUMENTS_DIR does not exist yet.
  const parent = process.platform === 'linux' && documents === app.getPath('home') ? join(documents, 'Documents') : documents;
  const target = join(parent, 'myOS');
  for (const directory of STARTER_DIRECTORIES) mkdirSync(join(target, directory), { recursive: true });

  const welcome = join(target, 'Welcome to myOS.md');
  if (!existsSync(welcome)) {
    const today = new Date().toISOString().slice(0, 10);
    const modifier = process.platform === 'darwin' ? 'Command' : 'Ctrl';
    writeFileSync(
      welcome,
      `---\nid: welcome-to-myos\ntitle: Welcome to myOS\ndomain: personal\ntype: memo\ntags: [getting-started, myos]\ncreated: ${today}\nupdated: ${today}\nstatus: active\nrelated: []\n---\n\n# Welcome to myOS\n\nmyOS keeps your work in ordinary Markdown files on this computer.\n\n## Start here\n\n- Press ${modifier}-N to capture a thought or task.\n- Use Today for active work and Library for everything else.\n- Create project notes to group related tasks and context.\n- Change the workspace folder at any time in Settings.\n\nYou own this folder. Back it up, sync it with a provider you trust, or put it in Git. myOS itself never uploads it.\n`,
      'utf8',
    );
  }
  return selectWorkspace(target);
}
