import { create } from 'zustand';
import { toast } from 'sonner';
import type { PanelId } from '../../app/panels';
import { initRepo, pull, push } from '../../data/git';
import { updateSettings, useSettings } from '../../store/settings';
import { setRightPanel, useUIStore } from '../../store/ui';

/** Show a right-panel section, unfolding the column and leaving focus mode if needed. */
export function showPanel(id: PanelId): void {
  setRightPanel(id);
  const { sidebar } = useSettings.getState();
  if (sidebar.right.collapsed) void updateSettings({ sidebar: { ...sidebar, right: { ...sidebar.right, collapsed: false } } });
  useUIStore.setState({ focusMode: false });
}

/** Bumped to ask the Changes panel to put the cursor in the commit summary. */
export const useCommitFocus = create<{ request: number }>(() => ({ request: 0 }));

/** Open Changes with the cursor in the summary. */
export function startCommit(): void {
  showPanel('changes');
  useCommitFocus.setState(({ request }) => ({ request: request + 1 }));
}

/** Git's own words, prefixed so it's clear who is speaking. */
export const gitSays = (error: unknown) => `Git says: ${error instanceof Error ? error.message : String(error)}`;

/** The last useful line of Git's output. */
export const lastLine = (output: string) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop() ?? '';

/** Pull or push from a command: progress and outcome as toasts. */
export function syncWithToast(kind: 'pull' | 'push'): void {
  const id = toast.loading(kind === 'pull' ? 'Pulling…' : 'Pushing…');
  (kind === 'pull' ? pull() : push()).then(
    (output) => toast.success(kind === 'pull' ? 'Pulled' : 'Pushed', { id, description: lastLine(output) || undefined }),
    (error: unknown) => toast.error(kind === 'pull' ? 'Pull failed' : 'Push failed', { id, description: gitSays(error), duration: 10_000 }),
  );
}

export function initWithToast(): void {
  initRepo().then(
    () => toast.success('Initialized a Git repository in this folder'),
    (error: unknown) => toast.error('Could not initialize a repository', { description: gitSays(error) }),
  );
}
