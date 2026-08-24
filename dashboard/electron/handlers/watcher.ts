import { watch, existsSync } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';
import { getVaultPath } from '../utils/paths.js';

let watcher: ReturnType<typeof watch> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingEvents = new Map<string, 'created' | 'updated' | 'deleted'>();
const EVENT_FLUSH_DELAY_MS = 150;

function mergeEvents(
  previous: 'created' | 'updated' | 'deleted' | undefined,
  next: 'created' | 'updated' | 'deleted'
): 'created' | 'updated' | 'deleted' {
  if (!previous) {
    return next;
  }
  if (next === 'deleted') {
    return 'deleted';
  }
  if (previous === 'deleted' && next === 'created') {
    return 'updated';
  }
  if (previous === 'created') {
    return 'created';
  }
  return next;
}

function queueEvent(
  callback: (event: 'created' | 'updated' | 'deleted', data: { filePath: string }) => void,
  event: 'created' | 'updated' | 'deleted',
  filePath: string
) {
  pendingEvents.set(filePath, mergeEvents(pendingEvents.get(filePath), event));

  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    const events = Array.from(pendingEvents.entries());
    pendingEvents.clear();
    flushTimer = null;

    for (const [nextPath, nextEvent] of events) {
      callback(nextEvent, { filePath: nextPath });
    }
  }, EVENT_FLUSH_DELAY_MS);
}

function clearPendingEvents() {
  pendingEvents.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function setupFileWatcher(
  callback: (event: 'created' | 'updated' | 'deleted', data: { filePath: string }) => void
) {
  try {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    clearPendingEvents();

    const vaultPath = getVaultPath();

    // Check if vault exists before watching
    if (!existsSync(vaultPath)) {
      console.error(`Vault directory does not exist: ${vaultPath}`);
      console.error('Please ensure the vault directory exists or set VAULT_PATH environment variable');
      return;
    }

    // Watch the entire vault directory recursively
    watcher = watch(
      vaultPath,
      { recursive: true },
      async (eventType, filename) => {
        if (!filename || !filename.endsWith('.md')) {
          return;
        }

        const filePath = join(vaultPath, filename);
        if (eventType === 'change') {
          queueEvent(callback, 'updated', filename);
          return;
        }

        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            queueEvent(callback, 'created', filename);
          }
        } catch {
          // File doesn't exist, it was deleted (or renamed away)
          queueEvent(callback, 'deleted', filename);
        }
      }
    );

    console.log(`File watcher started for ${vaultPath}`);
  } catch (error) {
    console.error('Failed to setup file watcher:', error);
  }
}
