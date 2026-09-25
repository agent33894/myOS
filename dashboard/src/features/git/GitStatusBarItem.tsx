import { useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { useGitStore } from '../../data/git';
import { hasPrimaryModifier } from '../../lib/platform';
import { Button, Icon, Spinner } from '../../ui';
import { showPanel, startCommit } from './actions';

/** ⌘⇧Enter outside the Changes panel opens it with the cursor in the summary (inside, it commits). */
function useCommitShortcut(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !event.shiftKey || !hasPrimaryModifier(event) || event.defaultPrevented) return;
      if ((event.target as HTMLElement | null)?.closest('[data-commit-box]')) return;
      event.preventDefault();
      startCommit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

/** Status bar: branch, number of changes, and commits ahead (↑) or behind (↓). Opens Changes. Nothing outside a repository. */
export function GitStatusBarItem() {
  const status = useGitStore((state) => state.status);
  const syncing = useGitStore((state) => state.syncing);
  useCommitShortcut(Boolean(status?.repo));
  if (!status?.repo) return null;
  const changes = status.files.length;
  const label = [
    status.branch ?? 'detached',
    changes ? `${changes} ${changes === 1 ? 'change' : 'changes'}` : 'no changes',
    status.ahead ? `${status.ahead} ahead` : '',
    status.behind ? `${status.behind} behind` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Git: ${label}. Show changes`}
      title="Show changes"
      className="-ml-1.5 h-5 gap-1.5 px-1.5 font-mono text-xs font-normal text-text-tertiary"
      onClick={() => showPanel('changes')}
    >
      <Icon icon={GitBranch} size="sm" />
      <span className="max-w-40 truncate">{status.branch ?? 'detached'}</span>
      {changes ? (
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-warning" />
          {changes}
        </span>
      ) : null}
      {status.ahead ? <span>↑{status.ahead}</span> : null}
      {status.behind ? <span>↓{status.behind}</span> : null}
      {syncing ? <Spinner size="sm" label={syncing === 'pull' ? 'Pulling' : 'Pushing'} /> : null}
    </Button>
  );
}
