import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { DomainError } from '../errors';
import { appDataPath } from '../utils/app-data';
import { writeStarterContent } from './starter';

/**
 * The open folder. Only the main process sets it, from the native folder
 * dialog or starter creation, so the renderer can never point file
 * operations somewhere else.
 */
let root: string | null = null;

const configPath = () => join(appDataPath(), 'workspace.json');

function readConfiguredPath(): string | undefined {
  try {
    const { path } = JSON.parse(readFileSync(configPath(), 'utf-8')) as { path?: unknown };
    return typeof path === 'string' ? path : undefined;
  } catch {
    return undefined;
  }
}

const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** Pick up the configured folder at startup (and in the headless CLI). */
export function loadWorkspace(): void {
  const dev = Boolean(process.env.VITE_DEV_SERVER_URL);
  const candidate = [
    dev ? process.env.MYOS_QA_VAULT_PATH : undefined,
    readConfiguredPath(),
    dev ? resolve(process.cwd(), '..', 'vault') : undefined,
  ].find((path): path is string => Boolean(path && isDirectory(path)));
  root = candidate ? realpathSync(candidate) : null;
}

export function currentWorkspace(): string | null {
  return root;
}

export function workspaceRoot(): string {
  if (!root || !isDirectory(root)) throw new DomainError('NOT_FOUND', 'No folder is open.');
  return root;
}

export function selectWorkspace(path: string): string {
  const resolved = realpathSync(path);
  if (resolved === '/' || !isDirectory(resolved)) throw new DomainError('INVALID', 'Choose a folder other than the filesystem root.');
  root = resolved;
  mkdirSync(dirname(configPath()), { recursive: true });
  writeFileSync(configPath(), JSON.stringify({ path: resolved }, null, 2));
  return resolved;
}

const isEmpty = (path: string) => !existsSync(path) || readdirSync(path).every((name) => name.startsWith('.'));

/**
 * Create `~/Documents/Notes` with the starter files and select it. A folder
 * of that name that already has files is left alone: `Notes 2`, `Notes 3`, …
 */
export function createStarterWorkspace(): string {
  const documents = app.getPath('documents');
  // Electron falls back to HOME when XDG_DOCUMENTS_DIR does not exist yet.
  const parent = process.platform === 'linux' && documents === app.getPath('home') ? join(documents, 'Documents') : documents;
  let target = join(parent, 'Notes');
  for (let count = 2; !isEmpty(target); count += 1) target = join(parent, `Notes ${count}`);
  mkdirSync(target, { recursive: true });
  writeStarterContent(target);
  return selectWorkspace(target);
}

/** Whether the open folder is an Obsidian vault. */
export const isObsidianVault = (): boolean => isDirectory(join(workspaceRoot(), '.obsidian'));
