import { watch, type FSWatcher } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, sep } from 'path';
import type { IpcEventMap } from '../../shared/ipc/contracts';
import { revOf } from '../documents/markdown';
import { isHiddenName } from '../workspace/paths';

type Change = IpcEventMap['files:changed'];

const FLUSH_DELAY_MS = 150;
const HIDDEN = /(^|\/)(\.[^/]*|node_modules)(\/|$)/;

/**
 * Node's recursive watch is native on macOS and Windows. On Linux it is
 * emulated per file and loses a file once an editor or `sed -i` replaces it
 * (a new inode), so there the folder tree is watched one folder at a time:
 * inotify on a folder reports every change to the files in it, whatever
 * their inode.
 */
const NATIVE_RECURSIVE = process.platform === 'darwin' || process.platform === 'win32';

let stop: (() => void) | null = null;

/**
 * Report changes under `root`, coalesced per path: Markdown files with their
 * new rev, and folders. Other files (an editor's temporary file) are ignored.
 */
export function watchWorkspace(root: string | null, onChange: (change: Change) => void): void {
  stop?.();
  stop = null;
  if (!root) return;

  let closed = false;
  // Folders known to exist, so a removed one can be told apart from a removed temporary file.
  const folders = new Set<string>(['']);
  const watchers = new Map<string, FSWatcher>();
  // path -> whether the batch saw a rename (a new entry, or an editor's atomic save)
  const pending = new Map<string, boolean>();
  let timer: NodeJS.Timeout | null = null;

  const record = (path: string, event: string) => {
    if (!path || HIDDEN.test(path) || closed) return;
    pending.set(path, pending.get(path) || event === 'rename');
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_DELAY_MS);
  };

  const forget = (folder: string) => {
    for (const known of [...folders]) {
      if (known !== folder && !known.startsWith(`${folder}/`)) continue;
      folders.delete(known);
      watchers.get(known)?.close();
      watchers.delete(known);
    }
  };

  /** Learn (and on Linux, watch) a folder and everything under it. */
  const addTree = async (folder: string): Promise<void> => {
    if (closed) return;
    folders.add(folder);
    if (!NATIVE_RECURSIVE && !watchers.has(folder)) {
      try {
        const watcher = watch(join(root, folder), (event, name) => {
          if (name) record(folder ? `${folder}/${name}` : name, event);
        });
        watcher.on('error', () => forget(folder));
        watchers.set(folder, watcher);
      } catch {
        folders.delete(folder);
        return;
      }
    }
    const entries = await readdir(join(root, folder), { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !isHiddenName(entry.name))
        .map((entry) => addTree(folder ? `${folder}/${entry.name}` : entry.name)),
    );
  };

  const flush = () => {
    timer = null;
    const batch = [...pending];
    pending.clear();
    for (const [path, renamed] of batch) {
      const markdown = path.toLowerCase().endsWith('.md');
      stat(join(root, path)).then(
        (stats) => {
          if (closed) return;
          if (stats.isDirectory()) {
            const known = folders.has(path);
            void addTree(path);
            onChange({ path, entry: 'folder', kind: known && !renamed ? 'updated' : 'created' });
          } else if (markdown && stats.isFile()) {
            onChange({ path, entry: 'file', kind: renamed ? 'created' : 'updated', rev: revOf(stats) });
          }
        },
        () => {
          if (closed) return;
          if (markdown) onChange({ path, entry: 'file', kind: 'deleted' });
          else if (folders.has(path)) {
            forget(path);
            onChange({ path, entry: 'folder', kind: 'deleted' });
          }
        },
      );
    }
  };

  if (NATIVE_RECURSIVE) {
    try {
      const watcher = watch(root, { recursive: true }, (event, filename) => {
        if (filename) record(filename.split(sep).join('/'), event);
      });
      watchers.set('', watcher);
    } catch (error) {
      console.error('Failed to watch the folder:', error);
    }
  }
  void addTree('');

  stop = () => {
    closed = true;
    if (timer) clearTimeout(timer);
    for (const watcher of watchers.values()) watcher.close();
    watchers.clear();
  };
}
