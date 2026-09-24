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
 * The only path gate: resolve a workspace-relative path to an absolute one,
 * rejecting `..` traversal and symlinks that lead outside the workspace.
 */
export function resolveInWorkspace(path: string, root = workspaceRoot()): string {
  if (typeof path !== 'string' || !path.trim()) throw new DomainError('INVALID', 'A path is required.');
  const outside = new DomainError('OUTSIDE_WORKSPACE', `Path is outside the workspace: ${path}`);
  if (isAbsolute(path)) throw outside;
  const realRoot = realpathSync(root);
  const target = resolve(realRoot, path);
  if (!isInside(realRoot, target) || !isInside(realRoot, realpathSync(nearestExisting(target)))) throw outside;
  return target;
}

export function toWorkspacePath(absolutePath: string, root = workspaceRoot()): string {
  return relative(realpathSync(root), absolutePath).split(sep).join('/');
}

/** Every Markdown file, skipping dot-folders, node_modules, and symlinks. */
export async function scanMarkdown(dir = workspaceRoot()): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
      if (entry.isDirectory()) return scanMarkdown(path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    }),
  );
  return nested.flat();
}
