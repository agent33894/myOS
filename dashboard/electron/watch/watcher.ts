import { watch, type FSWatcher } from 'fs';
import { stat } from 'fs/promises';
import { join, sep } from 'path';
import type { IpcEventMap } from '../../shared/ipc/contracts';
import { revOf } from '../documents/markdown';

type Change = IpcEventMap['artifacts:changed'];

const FLUSH_DELAY_MS = 150;
const IGNORED = /(^|\/)(\.[^/]*|node_modules)\//;

let watcher: FSWatcher | null = null;

/** Report Markdown changes under `root`, coalesced per path, with the file's new rev. */
export function watchWorkspace(root: string | null, onChange: (change: Change) => void): void {
  watcher?.close();
  watcher = null;
  if (!root) return;

  // path -> whether the batch saw a rename (a new file, or an editor's atomic save)
  const pending = new Map<string, boolean>();
  let timer: NodeJS.Timeout | null = null;

  const flush = () => {
    timer = null;
    const batch = [...pending];
    pending.clear();
    for (const [path, renamed] of batch) {
      stat(join(root, path)).then(
        (stats) => onChange({ path, kind: renamed ? 'created' : 'updated', rev: revOf(stats) }),
        () => onChange({ path, kind: 'deleted' }),
      );
    }
  };

  try {
    watcher = watch(root, { recursive: true }, (event, filename) => {
      const path = filename?.split(sep).join('/');
      if (!path?.endsWith('.md') || IGNORED.test(path)) return;
      pending.set(path, pending.get(path) || event === 'rename');
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, FLUSH_DELAY_MS);
    });
  } catch (error) {
    console.error('Failed to watch the workspace:', error);
  }
}
