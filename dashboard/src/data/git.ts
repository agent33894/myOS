import { useEffect } from 'react';
import { create } from 'zustand';
import type { GitFileStatus, GitStatus } from '@shared/ipc/contracts';
import { invoke, subscribe } from './ipc';

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
/** @public A file's text at a commit. */
export const showAt = (path: string, hash: string) => invoke('git:show', path, hash);
/** @public The working tree against HEAD, for one file or the folder. */
export const diff = (path?: string) => invoke('git:diff', path);
export const commitDiff = (hash: string) => invoke('git:commit-diff', hash);
export const commitSummary = (hash: string) => invoke('git:commit-summary', hash);
