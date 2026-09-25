import { ArrowDownToLine, ArrowUpFromLine, FolderGit2, GitCommitHorizontal, GitCompare, History } from 'lucide-react';
import type { CommandSource } from '../../app/commands';
import { initWithToast, showPanel, startCommit, syncWithToast } from './actions';

/** ⌘⇧Enter: commit from the Changes panel, or open it from anywhere. */
export const COMMIT_SHORTCUT = 'mod+shift+enter';

/** Git commands. Outside a repository only Initialize is offered. Pull and push run only from here or their buttons. */
export const gitCommands: CommandSource = ({ activePath, inRepo }) => [
  ...(inRepo
    ? [
        { id: 'git.commit', group: 'Git', label: 'Commit…', icon: GitCommitHorizontal, shortcut: COMMIT_SHORTCUT, keywords: 'git save message', run: startCommit },
        { id: 'git.pull', group: 'Git', label: 'Pull', icon: ArrowDownToLine, keywords: 'git fetch sync rebase', run: () => syncWithToast('pull') },
        { id: 'git.push', group: 'Git', label: 'Push', icon: ArrowUpFromLine, keywords: 'git sync upload', run: () => syncWithToast('push') },
        { id: 'git.changes', group: 'Git', label: 'Show changes', icon: GitCompare, keywords: 'git status diff', run: () => showPanel('changes') },
      ] as const
    : ([{ id: 'git.init', group: 'Git', label: 'Initialize repository', icon: FolderGit2, keywords: 'git init create', run: initWithToast }] as const)),
  ...(activePath
    ? ([{ id: 'git.history', group: 'Git', label: 'Show history', icon: History, keywords: 'git log versions commits local copies restore', run: () => showPanel('history') }] as const)
    : []),
];
