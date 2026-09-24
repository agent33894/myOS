import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { GitCommit, User, Calendar, Columns2, Rows3 } from 'lucide-react';
import Modal from '../ui/Modal';
import { Skeleton } from '../ui/skeleton';
import DiffFileSection from './DiffFileSection';
import { parseDiff } from '../../utils/parseDiff';
import type { CommitSummary } from '@shared/ipc/contracts';
import { invoke } from '../../data/ipc';

interface CommitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitHash: string;
  commitMessage: string;
  projectPath: string;
  summary?: CommitSummary | null;
}

const DIFF_STAT_ADD_CLASS = 'text-[hsl(var(--ed-success))] font-mono';
const DIFF_STAT_REMOVE_CLASS = 'text-[hsl(var(--ed-error))] font-mono';

export default function CommitDiffModal({
  isOpen,
  onClose,
  commitHash,
  commitMessage,
  projectPath,
  summary,
}: CommitDiffModalProps) {
  const [rawDiff, setRawDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('unified');

  useEffect(() => {
    if (!isOpen || !commitHash || !projectPath) return;

    setLoading(true);
    setError(null);
    setRawDiff(null);

    invoke('git:commit-diff', projectPath, commitHash)
      .then(setRawDiff)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load diff');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, commitHash, projectPath]);

  const files = useMemo(() => {
    if (!rawDiff) return [];
    return parseDiff(rawDiff);
  }, [rawDiff]);

  const shortHash = commitHash.slice(0, 7);
  const modal = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Commit Diff"
      subtitle={commitMessage}
      maxWidth="w-[96vw] max-w-[96vw]"
      layout="tall"
    >
      {/* Commit metadata header */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-4 border-b border-border">
        <span className="flex items-center gap-1.5 font-mono">
          <GitCommit className="w-4 h-4" />
          {shortHash}
        </span>
        {summary?.author && (
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {summary.author}
          </span>
        )}
        {summary?.date && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {new Date(summary.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg bg-secondary ">
          <button
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'unified'
                ? 'bg-card shadow-chronicle-lifted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Rows3 className="w-3 h-3" />
            Unified
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-card shadow-chronicle-lifted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns2 className="w-3 h-3" />
            Split
          </button>
        </div>
      </div>

      {/* File stats summary */}
      {files.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </span>
          {files.reduce((sum, f) => sum + f.additions, 0) > 0 && (
            <span className={DIFF_STAT_ADD_CLASS}>
              +{files.reduce((sum, f) => sum + f.additions, 0)}
            </span>
          )}
          {files.reduce((sum, f) => sum + f.deletions, 0) > 0 && (
            <span className={DIFF_STAT_REMOVE_CLASS}>
              -{files.reduce((sum, f) => sum + f.deletions, 0)}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-sm ed-text-error  py-4">
          {error}
        </div>
      )}

      {/* Diff files */}
      {!loading && !error && files.length > 0 && (
        <div className="space-y-3">
          {files.map((file, idx) => (
            <DiffFileSection
              key={`${file.newPath}-${idx}`}
              file={file}
              viewMode={viewMode}
              defaultExpanded={files.length <= 10}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rawDiff !== null && files.length === 0 && (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No file changes in this commit
        </div>
      )}
    </Modal>
  );

  if (typeof document === 'undefined') {
    return modal;
  }

  return createPortal(modal, document.body);
}
