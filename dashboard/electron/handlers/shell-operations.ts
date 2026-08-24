/**
 * Shell Operations Handler
 *
 * Provides operations for interacting with the file system and external applications:
 * - Open folders in Finder/Explorer
 * - Open external URLs in the default browser
 */

import { shell } from 'electron';
import { stat } from 'fs/promises';
import { isAbsolute, relative, resolve } from 'path';
import { getVaultPath } from '../utils/paths.js';

function isWithinDirectory(parentDir: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentDir);
  const normalizedTarget = resolve(targetPath);
  if (normalizedParent === normalizedTarget) {
    return true;
  }

  const rel = relative(normalizedParent, normalizedTarget);
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel);
}

function assertAllowedPath(inputPath: string): string {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    throw new Error('Path must be a non-empty string');
  }

  const resolvedPath = resolve(inputPath);
  if (!isWithinDirectory(getVaultPath(), resolvedPath)) {
    throw new Error(`Path is outside allowed workspace roots: ${inputPath}`);
  }

  return resolvedPath;
}

function normalizeExternalHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Show an item in the system file manager (Finder on macOS, Explorer on Windows)
 * For directories, opens the directory directly.
 * For files, opens the containing folder with the file selected.
 */
export async function showItemInFolder(itemPath: string): Promise<void> {
  const safePath = assertAllowedPath(itemPath);

  try {
    const stats = await stat(safePath);
    if (stats.isDirectory()) {
      // For directories, open the directory itself
      await shell.openPath(safePath);
    } else {
      // For files, show in containing folder with file selected
      shell.showItemInFolder(safePath);
    }
  } catch (error) {
    // Path doesn't exist or can't be accessed, try showing anyway
    console.error('showItemInFolder error:', error);
    shell.showItemInFolder(safePath);
  }
}

/**
 * Open external URLs in the default browser after strict protocol validation.
 */
export async function openExternalUrl(url: string): Promise<string> {
  const safeUrl = normalizeExternalHttpUrl(url);
  if (!safeUrl) {
    throw new Error('Only http/https URLs are allowed');
  }

  await shell.openExternal(safeUrl);
  return 'success';
}
