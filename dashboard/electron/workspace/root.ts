import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { DomainError } from '../errors';
import { writeStarterContent } from './starter';
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

/** Create (or reuse) `~/Documents/myOS` and select it. A new or empty folder gets the starter content. */
export function createStarterWorkspace(): string {
  const documents = app.getPath('documents');
  // Electron falls back to HOME when XDG_DOCUMENTS_DIR does not exist yet.
  const parent = process.platform === 'linux' && documents === app.getPath('home') ? join(documents, 'Documents') : documents;
  const target = join(parent, 'myOS');
  mkdirSync(target, { recursive: true });
  if (readdirSync(target).every((name) => name.startsWith('.'))) writeStarterContent(target);
  return selectWorkspace(target);
}
