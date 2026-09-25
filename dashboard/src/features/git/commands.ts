import { ArrowDownToLine, ArrowUpFromLine, GitCommitHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { CommandSource } from '../../app/commands';
import { pull, push } from '../../data/git';
import { setRightPanel, useUIStore } from '../../store/ui';
import { updateSettings, useSettings } from '../../store/settings';

const report = (work: Promise<string>, done: string) =>
  void work.then(
    (output) => toast.success(done, { description: output.split('\n').slice(-2).join('\n') || undefined }),
    (error: unknown) => toast.error(error instanceof Error ? error.message : 'Git reported a problem'),
  );

function showChanges() {
  setRightPanel('changes');
  const { sidebar } = useSettings.getState();
  if (sidebar.right.collapsed) void updateSettings({ sidebar: { ...sidebar, right: { ...sidebar.right, collapsed: false } } });
  useUIStore.setState({ focusMode: false });
}

/** Git commands; offered only when the folder is in a repository. Pull and push run only from here. */
export const gitCommands: CommandSource = ({ inRepo }) => {
  if (!inRepo) return [];
  return [
    { id: 'git.changes', group: 'Git', label: 'Show changes', icon: GitCommitHorizontal, keywords: 'commit status diff', run: showChanges },
    { id: 'git.pull', group: 'Git', label: 'Pull', icon: ArrowDownToLine, keywords: 'fetch sync rebase', run: () => report(pull(), 'Pulled') },
    { id: 'git.push', group: 'Git', label: 'Push', icon: ArrowUpFromLine, keywords: 'sync upload', run: () => report(push(), 'Pushed') },
  ];
};
