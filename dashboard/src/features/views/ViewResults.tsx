import type { ReactNode } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { FileText, SearchX } from 'lucide-react';
import type { ViewNote, ViewResult } from '@shared/query';
import { openNote } from '../../app/navigation';
import { hasPrimaryModifier } from '../../lib/platform';
import { EmptyState, Icon, ListRow, SectionHeader, cn } from '../../ui';
import { openTask } from './taskActions';
import { TaskRow } from './TaskRow';

function focusSibling(element: HTMLElement, step: number) {
  const rows = [...(element.closest('[data-task-scope]') ?? document).querySelectorAll<HTMLElement>('[data-task-row], [data-note-row]')];
  rows[rows.indexOf(element) + step]?.focus();
}

/** A note in a notes view: title, path, and when it last changed. */
export function NoteRow({ note }: { note: ViewNote }) {
  return (
    <ListRow
      data-note-row=""
      leading={<Icon icon={FileText} className="text-text-tertiary" />}
      meta={
        <span className="flex items-center gap-3">
          <span className="max-w-56 truncate font-mono text-xs">{note.path}</span>
          <span className="w-24 text-right text-xs tabular-nums">{formatDistanceToNowStrict(new Date(note.modified), { addSuffix: true })}</span>
        </span>
      }
      onClick={(event) => {
        if (!hasPrimaryModifier(event)) return;
        event.preventDefault();
        openTask({ path: note.path, line: 0 }, { beside: true });
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const step = { j: 1, ArrowDown: 1, k: -1, ArrowUp: -1 }[event.key];
        if (step === undefined) return;
        event.preventDefault();
        focusSibling(event.currentTarget, step);
      }}
      onActivate={() => openNote(note.path)}
      className="focus-visible:bg-text/5"
    >
      {note.title}
    </ListRow>
  );
}

/** A group heading; a file group shows the note title and its path. */
function GroupHeader({ label, fileKey, count }: { label: string; fileKey?: string; count: number }) {
  const title: ReactNode = fileKey ? (
    <>
      <span className="text-text">{label}</span>
      {label !== fileKey ? <span className="ml-2 font-mono text-xs font-normal text-text-tertiary">{fileKey}</span> : null}
    </>
  ) : (
    label
  );
  return <SectionHeader as="h3" title={title} count={count} className={cn(fileKey && 'mt-1')} />;
}

interface ViewResultsProps {
  result: ViewResult;
  /** Shown when nothing matches. */
  empty?: ReactNode;
  /** In a note: a one-line empty message instead of the large empty state. */
  compact?: boolean;
}

/** A view's results: task rows or note rows, grouped when the view says so. */
export function ViewResults({ result, empty = 'Nothing matches this view.', compact = false }: ViewResultsProps) {
  if (result.total === 0) {
    return compact ? (
      <p className="px-3 py-2 text-sm text-text-tertiary">{empty}</p>
    ) : (
      <EmptyState icon={SearchX} title={empty} description="Try fewer terms, or open the help next to the box." />
    );
  }
  const byFile = result.groups.length > 0 && result.groups[0].key !== '' && result.groups.every((group) => group.items.every((item) => item.path === group.key));
  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-4')}>
      {result.kind === 'tasks'
        ? result.groups.map((group) => (
            <section key={group.key || 'all'} className="flex flex-col">
              {group.label ? <GroupHeader label={group.label} fileKey={byFile ? group.key : undefined} count={group.items.length} /> : null}
              {group.items.map((task) => (
                <TaskRow key={`${task.path}:${task.line}`} task={task} showPath={!byFile} />
              ))}
            </section>
          ))
        : result.groups.map((group) => (
            <section key={group.key || 'all'} className="flex flex-col">
              {group.label ? <GroupHeader label={group.label} count={group.items.length} /> : null}
              {group.items.map((note) => (
                <NoteRow key={note.path} note={note} />
              ))}
            </section>
          ))}
    </div>
  );
}
