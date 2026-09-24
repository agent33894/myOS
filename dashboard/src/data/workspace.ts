import { useEffect, useState } from 'react';
import { invoke } from './ipc';
import { load } from './store';
import { clearHistory } from './undo';

async function switched(root: string | null): Promise<string | null> {
  if (root) {
    clearHistory();
    await load();
  }
  return root;
}

/** Native folder picker; resolves to the new workspace folder, or null when cancelled. */
export const chooseWorkspace = () => invoke('workspace:choose').then(switched);

/** Create (or reuse) the starter folder in Documents and switch to it. */
export const createStarterWorkspace = () => invoke('workspace:create-starter').then(switched);

/** The workspace folder's absolute path; null until one is chosen. */
export function useWorkspacePath(): [string | null, (path: string | null) => void] {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void invoke('workspace:current').then((current) => active && setPath(current));
    return () => {
      active = false;
    };
  }, []);
  return [path, setPath];
}
