import { existsSync, realpathSync } from 'fs';
import { readdir } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path';
import { DomainError } from '../errors';
import { workspaceRoot } from './root';

const isInside = (parent: string, target: string) => {
  const rel = relative(parent, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

function nearestExisting(path: string): string {
  let current = path;
  while (!existsSync(current)) current = dirname(current);
  return current;
}

/**
 * The only path gate: resolve a folder-relative path to an absolute one,
 * rejecting `..` traversal and symlinks that lead outside the open folder.
 */
export function resolveInWorkspace(path: string, root = workspaceRoot()): string {
  if (typeof path !== 'string' || !path.trim()) throw new DomainError('INVALID', 'A path is required.');
  const outside = new DomainError('OUTSIDE_WORKSPACE', `Path is outside the folder: ${path}`);
  if (isAbsolute(path)) throw outside;
  const realRoot = realpathSync(root);
  const target = resolve(realRoot, path);
  if (!isInside(realRoot, target) || !isInside(realRoot, realpathSync(nearestExisting(target)))) throw outside;
  return target;
}

export function toWorkspacePath(absolutePath: string, root = workspaceRoot()): string {
  return relative(realpathSync(root), absolutePath).split(sep).join('/');
}

/** Dot folders (`.git`, `.obsidian`) and `node_modules` are never listed, watched, or written. */
export const isHiddenName = (name: string) => name.startsWith('.') || name === 'node_modules';

/** Every folder and Markdown file under `dir`, as folder-relative paths. Symlinks are skipped. */
export async function scanTree(dir = workspaceRoot()): Promise<{ folders: string[]; files: string[] }> {
  const root = realpathSync(dir);
  const folders: string[] = [];
  const files: string[] = [];
  const walk = async (absolute: string, prefix: string): Promise<void> => {
    const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries.map(async (entry) => {
        if (isHiddenName(entry.name)) return;
        const path = prefix + entry.name;
        if (entry.isDirectory()) {
          folders.push(path);
          await walk(join(absolute, entry.name), `${path}/`);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          files.push(path);
        }
      }),
    );
  };
  await walk(root, '');
  return { folders: folders.sort(), files: files.sort() };
}
