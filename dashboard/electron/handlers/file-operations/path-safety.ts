import { existsSync, realpathSync } from 'fs';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { getVaultPath } from '../../utils/paths.js';

function isWithinDirectory(parentDir: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentDir);
  const normalizedTarget = resolve(targetPath);

  if (normalizedParent === normalizedTarget) {
    return true;
  }

  const rel = relative(normalizedParent, normalizedTarget);
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel);
}

function findNearestExistingAncestor(startPath: string): string {
  let currentPath = resolve(startPath);

  while (!existsSync(currentPath)) {
    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`No existing ancestor found for path: ${startPath}`);
    }
    currentPath = parentPath;
  }

  return currentPath;
}

/**
 * Resolve a user-supplied relative path safely within the active vault root.
 * Throws when the path is empty, absolute, or attempts traversal outside vault.
 */
export function resolvePathWithinVault(inputPath: string): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string');
  }

  if (isAbsolute(inputPath)) {
    throw new Error('Absolute paths are not allowed for vault operations');
  }

  const vaultPath = getVaultPath();
  if (!existsSync(vaultPath)) {
    throw new Error('Vault path does not exist');
  }

  const resolvedPath = resolve(vaultPath, inputPath);
  if (!isWithinDirectory(vaultPath, resolvedPath)) {
    throw new Error(`Path escapes vault boundary: ${inputPath}`);
  }

  const vaultRealPath = resolve(realpathSync(vaultPath));
  const pathToValidate = existsSync(resolvedPath)
    ? resolvedPath
    : findNearestExistingAncestor(resolvedPath);
  const validatedRealPath = resolve(realpathSync(pathToValidate));

  if (!isWithinDirectory(vaultRealPath, validatedRealPath)) {
    throw new Error(`Path escapes vault boundary via symlink: ${inputPath}`);
  }

  return resolvedPath;
}
