import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, FileCode, GitCommit } from 'lucide-react';
import type { CommitSummary } from '@shared/ipc/contracts';
import { invoke } from '../../data/ipc';
import { Button, Icon, LoadingState, Popover, PopoverAnchor, PopoverContent } from '../../ui';
import { CommitDiffModal } from './CommitDiffModal';
import { DiffStat } from './DiffView';

const summaries = new Map<string, Promise<CommitSummary>>();

/** A commit's summary, fetched once per repository and hash. */
export function useCommitSummary(projectPath: string, hash: string, enabled: boolean) {
  const [state, setState] = useState<{ summary?: CommitSummary; error?: string }>({});
  useEffect(() => {
    if (!enabled || !projectPath || !hash) return;
    const key = `${projectPath}\u0000${hash}`;
    let request = summaries.get(key);
    if (!request) {
      request = invoke('git:commit-summary', projectPath, hash);
      summaries.set(key, request);
      request.catch(() => summaries.delete(key));
    }
    let current = true;
    request.then(
      (summary) => current && setState({ summary }),
      (error: unknown) => current && setState({ error: error instanceof Error ? error.message : 'Couldn’t load this commit' }),
    );
    return () => {
      current = false;
    };
  }, [enabled, projectPath, hash]);
  return state;
}

/** The hover card: message, changed files, and a way into the full diff. */
export function CommitSummaryCard({ hash, message, summary, error, onOpenDiff }: {
  hash: string;
  message?: string;
  summary?: CommitSummary;
  error?: string;
  onOpenDiff: () => void;
}) {
  return (
    <div className="flex w-80 flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-mono text-xs font-medium text-text">{hash.slice(0, 7)}</span>
        <span className="min-w-0 flex-1 truncate text-text-secondary">{summary?.message || message}</span>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!summary && !error ? <LoadingState rows={3} label="Loading commit" /> : null}
      {summary ? (
        <>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {summary.files.map((file) => (
              <li key={file.path} className="flex items-center gap-2 text-xs">
                <Icon icon={FileCode} size="sm" className="text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate font-mono text-text-secondary">{file.path}</span>
                <DiffStat additions={file.additions} deletions={file.deletions} />
              </li>
            ))}
          </ul>
          <DiffStat additions={summary.totalAdditions} deletions={summary.totalDeletions}>
            <span className="font-sans text-text-tertiary">
              {summary.files.length} {summary.files.length === 1 ? 'file' : 'files'}
            </span>
          </DiffStat>
        </>
      ) : null}
      <Button size="sm" variant="ghost" className="self-end" onClick={onOpenDiff}>
        View changes
        <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
}

interface CommitDiffPopoverProps {
  commitHash: string;
  commitMessage?: string;
  projectPath: string;
  /** Custom trigger content; defaults to the short hash with a commit icon. */
  children?: ReactNode;
}

/**
 * An inline commit reference: hovering shows the files it changed, clicking
 * opens the full diff.
 */
export function CommitDiffPopover({ commitHash, commitMessage, projectPath, children }: CommitDiffPopoverProps) {
  const [hovering, setHovering] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const timer = useRef<number>();
  const { summary, error } = useCommitSummary(projectPath, commitHash, hovering || diffOpen);

  const hover = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHovering(next), next ? 300 : 150);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const openDiff = () => {
    setHovering(false);
    setDiffOpen(true);
  };

  return (
    <>
      <Popover open={hovering} onOpenChange={setHovering}>
        <PopoverAnchor asChild>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={GitCommit}
            className="font-mono text-accent-text"
            onClick={openDiff}
            onMouseEnter={() => hover(true)}
            onMouseLeave={() => hover(false)}
            onFocus={() => hover(true)}
            onBlur={() => hover(false)}
          >
            {children ?? commitHash.slice(0, 7)}
          </Button>
        </PopoverAnchor>
        <PopoverContent side="top" onOpenAutoFocus={(event) => event.preventDefault()} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
          <CommitSummaryCard hash={commitHash} message={commitMessage} summary={summary} error={error} onOpenDiff={openDiff} />
        </PopoverContent>
      </Popover>
      <CommitDiffModal
        isOpen={diffOpen}
        onClose={() => setDiffOpen(false)}
        commitHash={commitHash}
        commitMessage={summary?.message || commitMessage}
        projectPath={projectPath}
        summary={summary}
      />
    </>
  );
}
