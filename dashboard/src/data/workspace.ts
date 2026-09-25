import { useEffect, useState } from 'react';
import { loadSettings } from '../store/settings';
import { invoke } from './ipc';
import { load } from './store';
import { clearHistory } from './undo';

async function switched(root: string | null): Promise<string | null> {
  if (root) {
    clearHistory();
    // Daily-note defaults can come from the folder's Obsidian settings.
    await Promise.all([load(), loadSettings()]);
  }
  return root;
}

/** Native folder picker; resolves to the newly opened folder, or null when cancelled. */
export const chooseWorkspace = () => invoke('workspace:choose').then(switched);

/** Create (or reuse) the starter folder in Documents and open it. */
export const createStarterWorkspace = () => invoke('workspace:create-starter').then(switched);

/** The open folder's absolute path: undefined while asking, null when none is open. */
export function useWorkspacePath(): [string | null | undefined, (path: string | null) => void] {
  const [path, setPath] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void invoke('workspace:current').then((current) => active && setPath(current));
    return () => {
      active = false;
    };
  }, []);
  return [path, setPath];
}
