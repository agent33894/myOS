import { format } from 'date-fns';
import { GitCommitHorizontal, HardDrive } from 'lucide-react';
import { Button, Icon, cn } from '../../ui';
import { relativeDate, sizeLabel, type HistoryEntry } from './timeline';

/** A commit (subject, author, hash) or a local copy (time, size), with a plain label saying which. */
export function EntryRow({ entry, selected = false, onSelect }: { entry: HistoryEntry; selected?: boolean; onSelect: () => void }) {
  const commit = entry.kind === 'commit' ? entry.commit : null;
  const exact = format(new Date(entry.date), 'd MMM yyyy, HH:mm');
  return (
    <Button
      variant="ghost"
      aria-pressed={selected}
      title={exact}
      onClick={onSelect}
      className={cn(
        'h-auto w-full flex-col items-stretch gap-0.5 rounded-md px-3 py-2 text-left font-normal',
        selected ? 'bg-accent-soft text-text hover:bg-accent-soft' : 'text-text',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Icon icon={commit ? GitCommitHorizontal : HardDrive} size="sm" className={commit ? 'text-accent-text' : undefined} />
        <span className={cn('font-medium', commit ? 'text-accent-text' : 'text-text-secondary')}>{commit ? 'Commit' : 'Local copy'}</span>
        <span>·</span>
        <span className="truncate">{relativeDate(entry.date)}</span>
      </span>
      <span className="truncate text-sm text-text">{commit ? commit.subject : 'Saved before a change'}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-tertiary">
        {commit ? (
          <>
            <span className="truncate">{commit.author}</span>
            <span className="shrink-0 font-mono">{commit.hash.slice(0, 7)}</span>
          </>
        ) : (
          <span>{entry.kind === 'copy' ? sizeLabel(entry.version.size) : ''}</span>
        )}
      </span>
    </Button>
  );
}
