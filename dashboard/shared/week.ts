import { formatLocalDate, shiftDate } from './date';
import { journalDate } from './journal';
import type { ArtifactSummary } from './types';

export interface WeekGroup<T> {
  /** The project reference (id or title) the items share; null for everything outside a project. */
  project: string | null;
  finished: T[];
  written: T[];
  edited: T[];
}

export interface WeekSummary<T> {
  start: string;
  end: string;
  /** Projects in order of most activity, with the no-project group last. */
  groups: WeekGroup<T>[];
  journal: Array<{ date: string; path: string; lines: string[] }>;
}

const NOT_NOTES = new Set(['todo', 'project', 'inbox', 'journal', 'template']);

/** Timestamps become the local day they happened on; bare dates stay as they are. */
const localDay = (value?: string) => (!value ? undefined : value.length > 10 ? formatLocalDate(new Date(value)) : value);

type WeekItem = Pick<ArtifactSummary, 'type' | 'status' | 'project' | 'created' | 'updated' | 'completedDate' | 'completions' | 'filePath' | 'searchText'>;

/**
 * What moved in the seven days from `weekStart`: tasks finished (repeating
 * ones count each completion day), notes written or edited, and journal lines.
 * Computed from the files alone; nothing is stored.
 */
export function selectWeek<T extends WeekItem>(artifacts: readonly T[], weekStart: string): WeekSummary<T> {
  const end = shiftDate(weekStart, 6);
  const inWeek = (day?: string) => day !== undefined && day >= weekStart && day <= end;
  const groups = new Map<string | null, WeekGroup<T>>();
  const groupOf = (item: T) => {
    const key = item.project ?? null;
    if (!groups.has(key)) groups.set(key, { project: key, finished: [], written: [], edited: [] });
    return groups.get(key)!;
  };
  const journal: WeekSummary<T>['journal'] = [];

  for (const item of artifacts) {
    const date = journalDate(item);
    if (date) {
      const lines = (item.searchText ?? '').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
      if (inWeek(date) && lines.length > 0) journal.push({ date, path: item.filePath, lines });
    } else if (item.type === 'todo') {
      const done = item.status === 'done' && inWeek(localDay(item.completedDate));
      if (done || item.completions?.some((day) => inWeek(localDay(day)))) groupOf(item).finished.push(item);
    } else if (!NOT_NOTES.has(item.type)) {
      if (inWeek(localDay(item.created))) groupOf(item).written.push(item);
      else if (inWeek(localDay(item.updated))) groupOf(item).edited.push(item);
    }
  }

  const size = (group: WeekGroup<T>) => group.finished.length + group.written.length + group.edited.length;
  return {
    start: weekStart,
    end,
    groups: [...groups.values()].sort((a, b) => (a.project === null ? 1 : b.project === null ? -1 : size(b) - size(a))),
    journal: journal.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
