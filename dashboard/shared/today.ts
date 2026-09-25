import type { CheckEntry } from './checklist';
import { dayOf, formatLocalDate, shiftDate } from './date';
import type { ArtifactFields } from './types';

// Shared by the Today page, the sidebar count, the Tasks page, and `myos today` so all agree.
export type TaskItem = Pick<
  ArtifactFields,
  'type' | 'status' | 'title' | 'due' | 'deferDate' | 'flagged' | 'completedDate' | 'planned' | 'order' | 'completions' | 'estimatedMinutes'
>;

/** Today's Upcoming section looks this many days ahead; the Tasks page lists dates beyond it. */
export const UPCOMING_DAYS = 7;

const CLOSED = new Set(['done', 'cancelled', 'someday']);

/** A task that still needs doing and is not parked in Someday. */
export const isOpenTask = (task: Pick<ArtifactFields, 'type' | 'status'>) => task.type === 'todo' && !CLOSED.has(task.status);

export const isDeferred = (task: Pick<ArtifactFields, 'deferDate'>, today: string) => (dayOf(task.deferDate) ?? '') > today;

export interface TodayBuckets<T> {
  /** Open tasks due before today or planned for an earlier day, and dated checklist lines due before today. */
  carriedOver: Array<T | CheckEntry>;
  /** Due or planned today, flagged, or in progress, in the user's order (`order`), then by due date. */
  today: Array<T | CheckEntry>;
  /** Due within the next seven days. */
  upcoming: Array<T | CheckEntry>;
  /** Finished today, including repeating tasks completed today. */
  doneToday: T[];
}

const titleOf = (entry: TaskItem | CheckEntry) => ('kind' in entry ? entry.text : entry.title);
const orderOf = (entry: TaskItem | CheckEntry) => ('kind' in entry ? undefined : entry.order);

const byDueThenTitle = (a: TaskItem | CheckEntry, b: TaskItem | CheckEntry) =>
  (dayOf(a.due) ?? '9999').localeCompare(dayOf(b.due) ?? '9999') || titleOf(a).localeCompare(titleOf(b));

const byOrderThenDue = (a: TaskItem | CheckEntry, b: TaskItem | CheckEntry) =>
  (orderOf(a) ?? Infinity) - (orderOf(b) ?? Infinity) || byDueThenTitle(a, b);

/** Where an open task or dated checklist line belongs on Today, if anywhere. */
function bucketOf(entry: TaskItem | CheckEntry, today: string, horizon: string): 'carriedOver' | 'today' | 'upcoming' | null {
  const due = dayOf(entry.due);
  const planned = 'kind' in entry ? undefined : dayOf(entry.planned);
  if ((due && due < today) || (planned && planned < today)) return 'carriedOver';
  if (due === today || planned === today) return 'today';
  if (!('kind' in entry) && (entry.flagged || entry.status === 'in-progress')) return 'today';
  return due && due <= horizon ? 'upcoming' : null;
}

/** Today's sections. Deferred and Someday tasks stay hidden; `checks` adds dated checklist lines from notes. */
export function selectToday<T extends TaskItem>(
  artifacts: readonly T[],
  now = new Date(),
  checks: readonly CheckEntry[] = [],
): TodayBuckets<T> {
  const today = formatLocalDate(now);
  const horizon = shiftDate(today, UPCOMING_DAYS);
  const buckets: TodayBuckets<T> = { carriedOver: [], today: [], upcoming: [], doneToday: [] };

  for (const task of artifacts) {
    if (task.type !== 'todo') continue;
    const doneToday = task.status === 'done' ? dayOf(task.completedDate) === today : task.completions?.some((date) => dayOf(date) === today);
    if (doneToday) buckets.doneToday.push(task);
    if (!isOpenTask(task) || isDeferred(task, today)) continue;
    const bucket = bucketOf(task, today, horizon);
    if (bucket) buckets[bucket].push(task);
  }
  for (const check of checks) {
    const bucket = !check.done && check.due ? bucketOf(check, today, horizon) : null;
    if (bucket) buckets[bucket].push(check);
  }

  buckets.carriedOver.sort(byDueThenTitle);
  buckets.today.sort(byOrderThenDue);
  buckets.upcoming.sort(byDueThenTitle);
  buckets.doneToday.sort((a, b) => a.title.localeCompare(b.title));
  return buckets;
}

/** @public Minutes of estimated work among open tasks, for "About 3 h planned". Checklist lines carry no estimate. */
export function plannedMinutes(entries: ReadonlyArray<TaskItem | CheckEntry>): number {
  return entries.reduce((total, entry) => total + ('kind' in entry || !isOpenTask(entry) ? 0 : entry.estimatedMinutes ?? 0), 0);
}
