import { useEffect } from 'react';
import { create } from 'zustand';
import type { IpcEventMap } from '@shared/ipc/contracts';
import type { Artifact, ArtifactSummary } from '@shared/types';
import { IpcError, invoke, subscribe } from './ipc';

interface Body {
  content: string;
  rev: string;
}

interface DataState {
  byPath: Record<string, ArtifactSummary>;
  /** Bodies the app has opened, keyed by path and stamped with the rev they were read at. */
  bodies: Record<string, Body>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

/** Changes only through `load`, gateway results (`applyArtifact`, `dropArtifact`), and watcher events. */
export const useDataStore = create<DataState>(() => ({ byPath: {}, bodies: {}, status: 'idle', error: null }));

export async function load(): Promise<void> {
  useDataStore.setState({ status: 'loading', error: null });
  try {
    const list = await invoke('artifacts:list');
    useDataStore.setState((state) => {
      const byPath = Object.fromEntries(list.map((summary) => [summary.filePath, summary]));
      const bodies = Object.fromEntries(
        Object.entries(state.bodies).filter(([path, body]) => byPath[path]?.rev === body.rev),
      );
      return { byPath, bodies, status: 'ready' };
    });
  } catch (error) {
    useDataStore.setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

/** Record a file as it now is on disk; its body is kept when asked or when it was already open. */
export function applyArtifact({ content, ...summary }: Artifact, keepBody = true): void {
  useDataStore.setState((state) => {
    const path = summary.filePath;
    const cache = keepBody || path in state.bodies;
    return {
      byPath: { ...state.byPath, [path]: { ...summary, searchText: content } },
      bodies: cache ? { ...state.bodies, [path]: { content, rev: summary.rev } } : state.bodies,
    };
  });
}

export function dropArtifact(path: string): void {
  useDataStore.setState((state) => {
    if (!(path in state.byPath) && !(path in state.bodies)) return state;
    const { [path]: _summary, ...byPath } = state.byPath;
    const { [path]: _body, ...bodies } = state.bodies;
    return { byPath, bodies };
  });
}

const READ_CONCURRENCY = 6;

/**
 * Follow the main process's (already debounced) change events. Edits we
 * made ourselves arrive with a rev the store already has and are skipped.
 */
function followChanges(): () => void {
  const queue = new Map<string, IpcEventMap['artifacts:changed']>();
  let active = 0;

  const refresh = async (path: string) => {
    try {
      applyArtifact(await invoke('artifacts:read', path), false);
    } catch (error) {
      if (error instanceof IpcError && error.code === 'NOT_FOUND') dropArtifact(path);
      else console.warn(`Could not refresh ${path}:`, error);
    }
  };

  const pump = () => {
    for (const [path, change] of queue) {
      if (active >= READ_CONCURRENCY) return;
      queue.delete(path);
      if (change.kind === 'deleted') {
        dropArtifact(path);
        continue;
      }
      if (useDataStore.getState().byPath[path]?.rev === change.rev) continue;
      active += 1;
      void refresh(path).finally(() => {
        active -= 1;
        pump();
      });
    }
  };

  return subscribe('artifacts:changed', (change) => {
    queue.set(change.path, change);
    pump();
  });
}

/** Load the workspace and keep the store following disk changes while the app shell is mounted. */
export function useArtifactSync(): void {
  useEffect(() => {
    void load();
    return followChanges();
  }, []);
}
