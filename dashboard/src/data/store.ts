import { useEffect } from 'react';
import { create } from 'zustand';
import type { IpcEventMap } from '@shared/ipc/contracts';
import type { Note, NoteSummary } from '@shared/spec';
import { IpcError, invoke, subscribe } from './ipc';

interface Body {
  content: string;
  rev: string;
}

interface DataState {
  notes: Record<string, NoteSummary>;
  /** Every folder, parents before children; empty folders included. */
  folders: string[];
  /** Bodies the app has opened, keyed by path and stamped with the rev they were read at. */
  bodies: Record<string, Body>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Where files moved this session (old path → new path), so a tab showing an old path can follow. */
  moves: Record<string, string>;
}

/** Changes only through `load`, gateway results, and watcher events. */
export const useDataStore = create<DataState>(() => ({ notes: {}, folders: [], bodies: {}, status: 'idle', error: null, moves: {} }));

const parentsOf = (path: string) => {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
};

const withFolders = (folders: string[], added: string[]) => {
  const missing = added.filter((folder) => !folders.includes(folder));
  return missing.length ? [...folders, ...missing].sort() : folders;
};

export async function load(): Promise<void> {
  if (useDataStore.getState().status === 'idle') useDataStore.setState({ status: 'loading', error: null });
  try {
    const { folders, notes: list } = await invoke('files:list');
    useDataStore.setState((state) => {
      const notes = Object.fromEntries(list.map((note) => [note.path, note]));
      const bodies = Object.fromEntries(Object.entries(state.bodies).filter(([path, body]) => notes[path]?.rev === body.rev));
      return { notes, folders, bodies, status: 'ready', error: null };
    });
  } catch (error) {
    useDataStore.setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

/** Record a file as it now is on disk; its body is kept when asked or when it was already open. */
export function applyNote({ content, ...note }: Note, keepBody = true): void {
  useDataStore.setState((state) => {
    const cache = keepBody || note.path in state.bodies;
    return {
      notes: { ...state.notes, [note.path]: { ...note, searchText: content } },
      folders: withFolders(state.folders, parentsOf(note.path)),
      bodies: cache ? { ...state.bodies, [note.path]: { content, rev: note.rev } } : state.bodies,
    };
  });
}

export function dropNote(path: string): void {
  useDataStore.setState((state) => {
    if (!(path in state.notes) && !(path in state.bodies)) return state;
    const { [path]: _note, ...notes } = state.notes;
    const { [path]: _body, ...bodies } = state.bodies;
    return { notes, bodies };
  });
}

/** Note that the file (or folder) at `from` now lives at `to`: a rename, a move, or undoing one. */
export function recordMove(from: string, to: string): void {
  if (from === to) return;
  useDataStore.setState((state) => {
    const { [to]: _arrived, ...moves } = state.moves;
    return { moves: { ...moves, [from]: to } };
  });
}

/** Where a file that was at `path` lives now, following renames and folder moves; undefined if it never moved. */
export function movedTo(state: Pick<DataState, 'notes' | 'moves'>, path: string): string | undefined {
  let current = path;
  for (let hops = 0; hops < 20 && !state.notes[current]; hops += 1) {
    const direct = state.moves[current];
    const folder = Object.keys(state.moves).find((from) => current.startsWith(`${from}/`));
    if (direct) current = direct;
    else if (folder) current = state.moves[folder] + current.slice(folder.length);
    else break;
  }
  return current !== path && state.notes[current] ? current : undefined;
}

const READ_CONCURRENCY = 6;
const FOLDER_RELOAD_MS = 200;

/**
 * Follow the main process's (already debounced) change events. Edits we made
 * ourselves arrive with a rev the store already has and are skipped. Folder
 * changes reload the listing, which is cheap: unchanged files are cached by rev.
 */
function followChanges(): () => void {
  const queue = new Map<string, IpcEventMap['files:changed']>();
  let active = 0;
  let reload: number | undefined;

  const refresh = async (path: string) => {
    try {
      applyNote(await invoke('files:read', path), false);
    } catch (error) {
      if (error instanceof IpcError && error.code === 'NOT_FOUND') dropNote(path);
      else console.warn(`Could not refresh ${path}:`, error);
    }
  };

  const pump = () => {
    for (const [path, change] of queue) {
      if (active >= READ_CONCURRENCY) return;
      queue.delete(path);
      if (change.kind === 'deleted') {
        dropNote(path);
        continue;
      }
      if (useDataStore.getState().notes[path]?.rev === change.rev) continue;
      active += 1;
      void refresh(path).finally(() => {
        active -= 1;
        pump();
      });
    }
  };

  const unsubscribe = subscribe('files:changed', (change) => {
    if (change.entry === 'folder') {
      window.clearTimeout(reload);
      reload = window.setTimeout(() => void load(), FOLDER_RELOAD_MS);
      return;
    }
    queue.set(change.path, change);
    pump();
  });
  return () => {
    window.clearTimeout(reload);
    unsubscribe();
  };
}

/** Load the folder and keep the store following disk changes while the shell is mounted. */
export function useFileSync(): void {
  useEffect(() => {
    void load();
    return followChanges();
  }, []);
}
