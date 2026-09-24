import { forwardRef, type KeyboardEvent, type ReactNode } from 'react';
import type { ArtifactSummary } from '@shared/types';
import { draggableItem } from '../../lib/artifactDnd';
import { cn } from '../../ui';
import { kindLabel } from '../../lib/itemKinds';
import { relativeTime } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import type { ProjectRef } from '../tasks/projectRefs';
import { snippet } from './noteSearch';

/** Wrap each case-insensitive occurrence of `query` in a soft highlight. */
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const wanted = query.trim();
  if (!wanted) return text;
  const parts = text.split(new RegExp(`(${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-accent-soft text-text">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

interface NoteRowProps {
  note: ArtifactSummary;
  project?: ProjectRef;
  query: string;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** Title, date, and a one-line preview; a project dot when it belongs to one. */
export const NoteRow = forwardRef<HTMLDivElement, NoteRowProps>(function NoteRow(
  { note, project, query, selected, onSelect, onKeyDown },
  ref,
) {
  const kind = kindLabel(note.type);
  const preview = snippet(note.searchText, query, note.title);
  return (
    <div
      ref={ref}
      role="option"
      {...draggableItem(note)}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'flex cursor-default flex-col gap-0.5 rounded-md px-3 py-2 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-focus',
        selected ? 'bg-accent-soft' : 'hover:bg-text/5',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-base font-medium text-text">
          <Highlight text={note.title || 'Untitled'} query={query} />
        </span>
        <span className="shrink-0 text-xs text-text-tertiary">{relativeTime(note.updated)}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-text-tertiary">
        {project ? <ProjectDot color={project.color} /> : null}
        {kind ? <span className="shrink-0 text-text-secondary">{kind}</span> : null}
        {kind && preview ? <span aria-hidden="true">·</span> : null}
        <span className="truncate">
          {preview ? <Highlight text={preview} query={query} /> : kind ? null : 'No additional text'}
        </span>
      </div>
    </div>
  );
});
