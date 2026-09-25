import type { ReactNode } from 'react';
import { cn } from '../../ui';
import type { DiffLine, FileDiff } from './diff';

function Marked({ line }: { line: DiffLine }) {
  if (!line.text) return <>{' '}</>;
  if (!line.marks?.length) return <>{line.text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  line.marks.forEach(([start, end], index) => {
    if (start > at) parts.push(line.text.slice(at, start));
    parts.push(
      <mark key={index} className={cn('rounded-sm text-text', line.type === 'added' ? 'bg-success/25' : 'bg-danger/25')}>
        {line.text.slice(start, end)}
      </mark>,
    );
    at = end;
  });
  if (at < line.text.length) parts.push(line.text.slice(at));
  return <>{parts}</>;
}

function Row({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        'flex min-w-0 font-mono text-sm leading-6',
        line.type === 'added' && 'bg-success-soft',
        line.type === 'removed' && 'bg-danger-soft',
      )}
    >
      <span aria-hidden="true" className="w-10 shrink-0 select-none pr-2 text-right text-xs leading-6 text-text-tertiary">
        {line.old ?? ''}
      </span>
      <span aria-hidden="true" className="w-10 shrink-0 select-none pr-2 text-right text-xs leading-6 text-text-tertiary">
        {line.new ?? ''}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'w-5 shrink-0 select-none text-center',
          line.type === 'added' ? 'text-success' : line.type === 'removed' ? 'text-danger' : 'text-transparent',
        )}
      >
        {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
      </span>
      <span className="sr-only">{line.type === 'added' ? 'Added: ' : line.type === 'removed' ? 'Removed: ' : ''}</span>
      <span className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words pr-3', line.type === 'same' ? 'text-text-secondary' : 'text-text')}>
        <Marked line={line} />
      </span>
    </div>
  );
}

/** A readable line diff: hunks of numbered lines, soft green and red tints, and the changed words marked. */
export function DiffView({ diff, empty = 'No differences.' }: { diff: FileDiff; empty?: string }) {
  if (diff.binary) return <p className="px-1 py-6 text-center text-base text-text-secondary">This file is not text, so there is no line diff.</p>;
  if (!diff.hunks.length) return <p className="px-1 py-6 text-center text-base text-text-secondary">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {diff.hunks.map((hunk, index) => (
        <section key={index} className="overflow-hidden rounded-md bg-raised shadow-raised">
          {hunk.heading || index > 0 ? (
            <div className="truncate bg-sunken px-3 py-1 font-mono text-xs text-text-tertiary">{hunk.heading || '⋯'}</div>
          ) : null}
          {hunk.lines.map((line, lineIndex) => (
            <Row key={lineIndex} line={line} />
          ))}
        </section>
      ))}
    </div>
  );
}

/** “+3 −1” in the status colors. */
export function DiffCounts({ diff }: { diff: Pick<FileDiff, 'added' | 'removed'> }) {
  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      {diff.added ? <span className="text-success">+{diff.added}</span> : null}
      {diff.removed ? <span className="text-danger">−{diff.removed}</span> : null}
    </span>
  );
}
