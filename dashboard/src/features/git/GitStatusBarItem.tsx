import { useGitStore } from '../../data/git';

/** Status bar: branch, changes, and how far ahead or behind the remote it is. Nothing outside a repository. */
export function GitStatusBarItem() {
  const status = useGitStore((state) => state.status);
  const syncing = useGitStore((state) => state.syncing);
  if (!status?.repo) return null;
  const changes = status.files.length;
  const parts = [
    status.branch ?? 'detached',
    changes ? `${changes} ${changes === 1 ? 'change' : 'changes'}` : 'no changes',
    status.ahead ? `↑${status.ahead}` : '',
    status.behind ? `↓${status.behind}` : '',
    syncing === 'pull' ? 'pulling…' : syncing === 'push' ? 'pushing…' : '',
  ].filter(Boolean);
  return <span>{parts.join(' · ')}</span>;
}
