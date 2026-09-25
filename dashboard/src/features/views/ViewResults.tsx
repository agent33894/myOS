import type { ReactNode } from 'react';
import { SearchX } from 'lucide-react';
import type { ViewResult } from '@shared/query';
import { openNote } from '../../app/navigation';
import { EmptyState, ListRow, SectionHeader } from '../../ui';
import { TaskRow } from './TaskRow';

/** A view's results: groups of task rows or note rows, and any terms the view could not use. */
export function ViewResults({ result, empty = 'Nothing matches this view.' }: { result: ViewResult; empty?: string }) {
  const sections: Array<{ key: string; label: string; rows: ReactNode[] }> =
    result.kind === 'tasks'
      ? result.groups.map((group) => ({ ...group, rows: group.items.map((task) => <TaskRow key={`${task.path}:${task.line}`} task={task} />) }))
      : result.groups.map((group) => ({
          ...group,
          rows: group.items.map((note) => (
            <ListRow key={note.path} meta={<span className="font-mono text-xs">{note.path}</span>} onActivate={() => openNote(note.path)}>
              {note.title}
            </ListRow>
          )),
        }));
  return (
    <div className="flex flex-col gap-4">
      {result.errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-warning">
          {error}
        </p>
      ))}
      {result.total === 0 ? <EmptyState icon={SearchX} title={empty} /> : null}
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <section key={section.key} className="flex flex-col">
            {section.label ? <SectionHeader title={section.label} count={section.rows.length} /> : null}
            {section.rows}
          </section>
        ),
      )}
    </div>
  );
}
