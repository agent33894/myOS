import { addDays } from 'date-fns';
import { formatLocalDate } from './date';
import type { ArtifactFields } from './types';

// Shared by the Today page, the sidebar count, and `myos today` so all three agree.
type TodayItem = Pick<ArtifactFields, 'type' | 'status' | 'title' | 'due' | 'deferDate' | 'flagged' | 'completedDate'>;

export interface TodayBuckets<T> {
  overdue: T[];
  /** Due today, flagged, or in progress. */
  today: T[];
  /** Due within the next seven days. */
  upcoming: T[];
  doneToday: T[];
}

const day = (value?: string) => value?.slice(0, 10);

const byDueThenTitle = (a: TodayItem, b: TodayItem) =>
  (day(a.due) ?? '9999').localeCompare(day(b.due) ?? '9999') || a.title.localeCompare(b.title);

export function selectToday<T extends TodayItem>(artifacts: readonly T[], now = new Date()): TodayBuckets<T> {
  const today = formatLocalDate(now);
  const horizon = formatLocalDate(addDays(now, 7));
  const buckets: TodayBuckets<T> = { overdue: [], today: [], upcoming: [], doneToday: [] };

  for (const task of artifacts) {
    const deferred = (day(task.deferDate) ?? '') > today;
    if (task.type !== 'todo' || deferred || task.status === 'cancelled') continue;
    const due = day(task.due);
    if (task.status === 'done') {
      if (day(task.completedDate) === today) buckets.doneToday.push(task);
    } else if (due && due < today) {
      buckets.overdue.push(task);
    } else if (due === today || task.flagged || task.status === 'in-progress') {
      buckets.today.push(task);
    } else if (due && due <= horizon) {
      buckets.upcoming.push(task);
    }
  }

  buckets.overdue.sort(byDueThenTitle);
  buckets.today.sort(byDueThenTitle);
  buckets.upcoming.sort(byDueThenTitle);
  buckets.doneToday.sort((a, b) => a.title.localeCompare(b.title));
  return buckets;
}
