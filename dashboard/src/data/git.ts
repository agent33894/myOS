import { useEffect } from 'react';
import { create } from 'zustand';
import type { GitCommit, GitFileStatus, GitStatus } from '@shared/ipc/contracts';
import type { Note } from '@shared/spec';
import { currentRev } from './gateway';
import { invoke, subscribe } from './ipc';
import { applyNote } from './store';
import { record } from './undo';

interface GitState {
  /** Null until the first status arrives. */
  status: GitStatus | null;
  /** The last error from a status, commit, pull, or push, as Git wrote it. */
  error: string | null;
  /** A pull or push is running. */
  syncing: 'pull' | 'push' | null;
}

export const useGitStore = create<GitState>(() => ({ status: null, error: null, syncing: null }));

export async function refreshGit(): Promise<void> {
  try {
    useGitStore.setState({ status: await invoke('git:status') });
  } catch (error) {
    useGitStore.setState({ error: error instanceof Error ? error.message : String(error) });
  }
}

const REFRESH_MS = 400;

/** Keep the status current while the shell is mounted: on start, on file changes, and when the window regains focus. */
export function useGitSync(): void {
  useEffect(() => {
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refreshGit(), REFRESH_MS);
    };
    void refreshGit();
    const unsubscribe = subscribe('files:changed', soon);
    window.addEventListener('focus', soon);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('focus', soon);
    };
  }, []);
}

export const useGitStatus = () => useGitStore((state) => state.status);

/** The Git change for one file, if it has one. */
export const useGitFile = (path: string | null | undefined): GitFileStatus | undefined =>
  useGitStore((state) => (path ? state.status?.files.find((file) => file.path === path) : undefined));

async function withRefresh<T>(work: Promise<T>): Promise<T> {
  try {
    const result = await work;
    useGitStore.setState({ error: null });
    return result;
  } catch (error) {
    useGitStore.setState({ error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await refreshGit();
  }
}

/** Commit `paths`, or every change in the folder; resolves to the new commit's hash. */
export const commit = (message: string, paths?: string[]) => withRefresh(invoke('git:commit', message, paths));

async function sync(kind: 'pull' | 'push'): Promise<string> {
  useGitStore.setState({ syncing: kind });
  try {
    return await withRefresh(invoke(kind === 'pull' ? 'git:pull' : 'git:push'));
  } finally {
    useGitStore.setState({ syncing: null });
  }
}

/** `git pull --rebase --autostash`; resolves to Git's output. Only ever runs when asked. */
export const pull = () => sync('pull');
/** `git push`; resolves to Git's output. Only ever runs when asked. */
export const push = () => sync('push');

/** Commits that touched `path` (or the folder), newest first. */
export const log = (path?: string, limit?: number) => invoke('git:log', path, limit);
/** A file's text at a commit. */
export const showAt = (path: string, hash: string) => invoke('git:show', path, hash);
/** The working tree against HEAD, for one file or the folder. */
export const diff = (path?: string) => invoke('git:diff', path);
/** @public */
export const commitDiff = (hash: string) => invoke('git:commit-diff', hash);
/** @public */
export const commitSummary = (hash: string) => invoke('git:commit-summary', hash);

/** `git init` in the open folder (only offered outside a repository). */
export async function initRepo(): Promise<void> {
  useGitStore.setState({ status: await invoke('git:init'), error: null });
}

/**
 * Write the file as it was at `commit`. The text it replaces becomes the
 * newest local copy, which undo puts back. Fails with CONFLICT when the file
 * changed since the store last saw it.
 */
export async function restoreCommit(path: string, commit: GitCommit): Promise<Note> {
  const put = async (write: Promise<Note>) => {
    const note = await write;
    applyNote(note);
    void refreshGit();
    return note;
  };
  const restored = await put(invoke('git:restore', path, commit.hash, currentRev(path), commit.path));
  const [replaced] = await invoke('history:list', path);
  record({
    paths: [path],
    label: `Restore ${path} from commit ${commit.hash.slice(0, 7)}`,
    undo: () => put(invoke('history:restore', path, replaced.id, currentRev(path))),
    redo: () => put(invoke('git:restore', path, commit.hash, currentRev(path), commit.path)),
  });
  return restored;
}
