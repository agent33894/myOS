import { dayOf, formatLocalDate, shiftDate } from './date';
import { AREAS, isDomain } from './spec';
import { isDeferred, isOpenTask, UPCOMING_DAYS, type TaskItem } from './today';
import type { ArtifactFields } from './types';

export interface TaskSections<T> {
  /** Open tasks with no due date, in the user's order, then by title. */
  anytime: T[];
  /** Open dated tasks that Today does not show: due beyond this week, or deferred. */
  upcoming: T[];
  /** Parked tasks. */
  someday: T[];
}

const byOrderThenTitle = (a: TaskItem, b: TaskItem) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title);

/** The Tasks page. With Today, every open task has exactly one visible home. */
export function selectTasks<T extends TaskItem>(artifacts: readonly T[], now = new Date()): TaskSections<T> {
  const today = formatLocalDate(now);
  const horizon = shiftDate(today, UPCOMING_DAYS);
  const sections: TaskSections<T> = { anytime: [], upcoming: [], someday: [] };
  for (const task of artifacts) {
    if (task.type !== 'todo') continue;
    if (task.status === 'someday') sections.someday.push(task);
    else if (!isOpenTask(task)) continue;
    else if (!task.due) sections.anytime.push(task);
    else if ((dayOf(task.due) ?? '') > horizon || isDeferred(task, today)) sections.upcoming.push(task);
  }
  sections.anytime.sort(byOrderThenTitle);
  sections.upcoming.sort((a, b) => (dayOf(a.due) ?? '').localeCompare(dayOf(b.due) ?? '') || a.title.localeCompare(b.title));
  sections.someday.sort((a, b) => a.title.localeCompare(b.title));
  return sections;
}

export interface TaskGroup<T> {
  /** A project id or an area (domain); null for the "No project" or "No area" group, which comes last. */
  key: string | null;
  label: string;
  items: T[];
}

function group<T>(
  items: readonly T[],
  keyOf: (item: T) => string | null,
  labelOf: (key: string | null) => string,
  compare: (a: TaskGroup<T>, b: TaskGroup<T>) => number,
): TaskGroup<T>[] {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups]
    .map(([key, grouped]) => ({ key, label: labelOf(key), items: grouped }))
    .sort((a, b) => (a.key === null ? 1 : b.key === null ? -1 : compare(a, b)));
}

type ProjectRef = Pick<ArtifactFields, 'id' | 'title'>;

/** @public Group by project (a task's `project` may hold the id or the title), projects by title. */
export function groupByProject<T extends Pick<ArtifactFields, 'project'>>(items: readonly T[], projects: readonly ProjectRef[]): TaskGroup<T>[] {
  const find = (ref: string) => projects.find((project) => project.id === ref || project.title === ref);
  return group(
    items,
    (item) => (item.project ? (find(item.project)?.id ?? item.project) : null),
    (key) => (key === null ? 'No project' : (find(key)?.title ?? key)),
    (a, b) => a.label.localeCompare(b.label),
  );
}

const AREA_ORDER: readonly string[] = Object.keys(AREAS);

/** @public Group by area in the order Work, Personal, Learning, Creative. */
export function groupByArea<T extends Pick<ArtifactFields, 'domain'>>(items: readonly T[]): TaskGroup<T>[] {
  return group(
    items,
    (item) => (isDomain(item.domain) ? item.domain : null),
    (key) => (isDomain(key) ? AREAS[key] : 'No area'),
    (a, b) => AREA_ORDER.indexOf(a.key!) - AREA_ORDER.indexOf(b.key!),
  );
}
