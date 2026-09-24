import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GitCommit, FileCode, ArrowRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useAccentColor } from '../../hooks/useAccentColor';
import { invoke } from '../../data/ipc';
import CommitDiffModal from './CommitDiffModal';
import type { CommitSummary } from '@shared/ipc/contracts';

interface CommitDiffPopoverProps {
  commitHash: string;
  commitMessage?: string;
  commitUrl?: string;
  projectPath: string;
}

const DIFF_STAT_ADD_CLASS = 'text-[hsl(var(--ed-success))] font-mono';
const DIFF_STAT_REMOVE_CLASS = 'text-[hsl(var(--ed-error))] font-mono';

export default function CommitDiffPopover({
  commitHash,
  commitMessage,
  projectPath,
}: CommitDiffPopoverProps) {
  const { accentText } = useAccentColor();
  const [summary, setSummary] = useState<CommitSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hoverVisible, setHoverVisible] = useState(false);
  const fetchedRef = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchSummary = useCallback(() => {
    if (fetchedRef.current === commitHash || !projectPath) return;
    fetchedRef.current = commitHash;
    setLoading(true);
    setError(null);

    invoke('git:commit-summary', projectPath, commitHash)
      .then(setSummary)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
        fetchedRef.current = null;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [commitHash, projectPath]);

  const showPopover = useCallback(() => {
    setHoverVisible(true);
    fetchSummary();
  }, [fetchSummary]);

  const hidePopover = useCallback(() => {
    setHoverVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(showPopover, 300);
  }, [showPopover]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    hidePopover();
  }, [hidePopover]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoverVisible(false);
    setModalOpen(true);
  };

  const shortHash = commitHash.slice(0, 7);
  const displayMessage = summary?.message || commitMessage || '';

  // Calculate popover position relative to viewport
  const getPopoverStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return { display: 'none' };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      left: rect.left,
      top: rect.top - 8,
      transform: 'translateY(-100%)',
      zIndex: 50,
    };
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${accentText} hover:underline inline-flex items-center gap-1 font-mono text-sm cursor-pointer active:opacity-75`}
      >
        <GitCommit className="h-4 w-4" />
        {shortHash}
      </button>

      {/* Hover popover — rendered via portal to escape table/prose overflow */}
      {hoverVisible && createPortal(
        <div
          ref={popoverRef}
          style={getPopoverStyle()}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
          className="w-80 border border-border bg-card text-popover-foreground shadow-chronicle-overlay animate-in fade-in-0"
        >
          <div className="p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-foreground font-semibold">{shortHash}</span>
              {displayMessage && (
                <span className="text-muted-foreground truncate flex-1">{displayMessage}</span>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs text-[hsl(var(--ed-error))]">{error}</div>
            )}

            {/* File list */}
            {summary && (
              <>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {summary.files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <FileCode className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono text-muted-foreground truncate flex-1">
                        {file.path}
                      </span>
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        {file.additions > 0 && (
                          <span className={DIFF_STAT_ADD_CLASS}>
                            +{file.additions}
                          </span>
                        )}
                        {file.deletions > 0 && (
                          <span className={DIFF_STAT_REMOVE_CLASS}>
                            -{file.deletions}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>
                    {summary.files.length} file{summary.files.length !== 1 ? 's' : ''}
                  </span>
                  {summary.totalAdditions > 0 && (
                    <span className={DIFF_STAT_ADD_CLASS}>
                      +{summary.totalAdditions}
                    </span>
                  )}
                  {summary.totalDeletions > 0 && (
                    <span className={DIFF_STAT_REMOVE_CLASS}>
                      -{summary.totalDeletions}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <button
            type="button"
            onClick={handleClick}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border-t border-border hover:bg-secondary  transition-colors"
          >
            Click to view full diff
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>,
        document.body
      )}

      <CommitDiffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        commitHash={commitHash}
        commitMessage={displayMessage}
        projectPath={projectPath}
        summary={summary}
      />
    </>
  );
}
