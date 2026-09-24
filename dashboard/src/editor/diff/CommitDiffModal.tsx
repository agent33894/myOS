import { useEffect, useMemo, useState } from 'react';
import { Columns2, Rows3 } from 'lucide-react';
import type { CommitSummary } from '@shared/ipc/contracts';
import { invoke } from '../../data/ipc';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyState, LoadingState, SegmentedControl } from '../../ui';
import { DiffFileSection, DiffStat, type DiffLayout } from './DiffView';
import { parseDiff } from './parseDiff';

interface CommitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitHash: string;
  commitMessage?: string;
  /** Repository the commit lives in. */
  projectPath: string;
  summary?: CommitSummary | null;
}

const LAYOUTS = [
  { value: 'unified', label: 'Unified', icon: Rows3 },
  { value: 'split', label: 'Split', icon: Columns2 },
] as const;

/** Every file a commit changed, as a unified or side-by-side diff. */
export function CommitDiffModal({ isOpen, onClose, commitHash, commitMessage, projectPath, summary }: CommitDiffModalProps) {
  const [diff, setDiff] = useState<{ raw: string } | { error: string } | null>(null);
  const [layout, setLayout] = useState<DiffLayout>('unified');

  useEffect(() => {
    if (!isOpen || !commitHash || !projectPath) return;
    let current = true;
    setDiff(null);
    invoke('git:commit-diff', projectPath, commitHash).then(
      (raw) => current && setDiff({ raw }),
      (error: unknown) => current && setDiff({ error: error instanceof Error ? error.message : 'Couldn’t load this commit' }),
    );
    return () => {
      current = false;
    };
  }, [isOpen, commitHash, projectPath]);

  const files = useMemo(() => (diff && 'raw' in diff ? parseDiff(diff.raw) : []), [diff]);
  const totals = files.reduce((sum, file) => ({ additions: sum.additions + file.additions, deletions: sum.deletions + file.deletions }), { additions: 0, deletions: 0 });
  const date = summary?.date ? new Date(summary.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="max-h-full max-w-5xl">
        <DialogHeader>
          <DialogTitle>{commitMessage || summary?.message || 'Commit'}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 text-sm">
            <span className="font-mono">{commitHash.slice(0, 7)}</span>
            {summary?.author ? <span>{summary.author}</span> : null}
            {date ? <span>{date}</span> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3">
          <DiffStat additions={totals.additions} deletions={totals.deletions}>
            <span className="font-sans text-sm text-text-secondary">
              {files.length} {files.length === 1 ? 'file' : 'files'} changed
            </span>
          </DiffStat>
          <SegmentedControl aria-label="Diff layout" size="sm" options={LAYOUTS} value={layout} onValueChange={setLayout} />
        </div>
        <div className="-mx-2 flex min-h-0 flex-col gap-3 overflow-y-auto px-2 pb-1">
          {diff === null ? <LoadingState label="Loading changes" /> : null}
          {diff && 'error' in diff ? <EmptyState tone="danger" icon={Rows3} title="Couldn’t load this commit" description={diff.error} /> : null}
          {diff && 'raw' in diff && files.length === 0 ? <EmptyState icon={Rows3} title="No file changes in this commit" /> : null}
          {files.map((file, index) => (
            <DiffFileSection key={`${file.newPath}-${index}`} file={file} layout={layout} defaultOpen={files.length <= 10} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
