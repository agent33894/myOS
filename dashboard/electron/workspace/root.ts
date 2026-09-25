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

/** Create (or reuse) `~/Documents/myOS Next` and select it. A new or empty folder gets the welcome note. */
export function createStarterWorkspace(): string {
  const documents = app.getPath('documents');
  // Electron falls back to HOME when XDG_DOCUMENTS_DIR does not exist yet.
  const parent = process.platform === 'linux' && documents === app.getPath('home') ? join(documents, 'Documents') : documents;
  const target = join(parent, 'myOS Next');
  mkdirSync(target, { recursive: true });
  if (!existsSync(target) || readdirSync(target).every((name) => name.startsWith('.'))) writeStarterContent(target);
  return selectWorkspace(target);
}
