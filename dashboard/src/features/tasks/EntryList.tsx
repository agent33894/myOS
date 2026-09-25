import { useMemo } from 'react';
import { isCheckEntry, type CheckEntry } from '@shared/checklist';
import type { ArtifactSummary } from '@shared/types';
import { CheckRow } from './CheckRow';
import { TaskRow } from './TaskRow';
import { DropMarker, useReorder } from './useReorder';

export type Entry = ArtifactSummary | CheckEntry;

const entryKey = (entry: Entry) => (isCheckEntry(entry) ? `${entry.path}:${entry.line}` : entry.filePath);

interface EntryListProps {
  entries: Entry[];
  hideDueOn?: string;
  hideProject?: boolean;
  /** Tasks can be put in order by dragging, or with ⌥↑ / ⌥↓ (today's plan). */
  reorderable?: boolean;
  /** The list is "Done today", where repeating tasks finished today show as done. */
  done?: boolean;
  /** The list is Someday. */
  someday?: boolean;
}

/** Tasks and checklist lines, one row each. */
export function EntryList({ entries, hideDueOn, hideProject, reorderable = false, done = false, someday = false }: EntryListProps) {
  const paths = useMemo(() => entries.flatMap((entry) => (isCheckEntry(entry) ? [] : [entry.filePath])), [entries]);
  const reorder = useReorder(paths);

  return (
    <div role="list" className="flex flex-col">
      {entries.map((entry) => {
        const key = entryKey(entry);
        const sortable = reorderable && !isCheckEntry(entry);
        const marker = sortable ? reorder.markerFor(key) : null;
        return (
          <div role="listitem" key={key} className="relative" {...(sortable ? reorder.dropProps(key) : {})}>
            {marker ? <DropMarker after={marker.after} /> : null}
            {isCheckEntry(entry) ? (
              <CheckRow entry={entry} hideDueOn={hideDueOn} hideProject={hideProject} />
            ) : (
              <TaskRow
                task={entry}
                hideDueOn={hideDueOn}
                hideProject={hideProject}
                doneToday={done}
                inSomeday={someday}
                onMove={sortable ? (step) => reorder.move(entry.filePath, step) : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
