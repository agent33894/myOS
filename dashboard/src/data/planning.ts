import { dayOf, formatLocalDate, nextMonday, shiftDate } from '@shared/date';
import { schedule, type RecallAnswer } from '@shared/recall';
import { nextOccurrence, parseRule } from '@shared/recurrence';
import { TodoStatus, type Artifact, type ArtifactPatch, type ArtifactSummary } from '@shared/types';
import { patch, patchMany, type FieldChange } from './gateway';
import { useDataStore } from './store';

/** Tasks, plans, and review schedules: frontmatter changes, each one undo step. */

const COMPLETIONS_KEPT = 30;

/**
 * Finish a task. A repeating task stays open: today joins `completions` and
 * `due` moves to the next occurrence after today (or after its due date, when
 * finished early). Undo restores both.
 */
export function completeTask(task: ArtifactSummary): Promise<Artifact> {
  const today = formatLocalDate();
  const rule = parseRule(task.repeatRule);
  if (!rule) return patch(task.filePath, { status: TodoStatus.DONE, completedDate: today }, `Complete “${task.title}”`);
  const due = dayOf(task.due);
  return patch(
    task.filePath,
    {
      due: nextOccurrence(rule, due && due > today ? due : today),
      completions: [...(task.completions ?? []), today].slice(-COMPLETIONS_KEPT),
      planned: null,
    },
    `Complete “${task.title}”`,
  );
}

export const toggleComplete = (task: ArtifactSummary) =>
  task.status === TodoStatus.DONE
    ? patch(task.filePath, { status: TodoStatus.PENDING, completedDate: null }, `Reopen “${task.title}”`)
    : completeTask(task);

const plannedOn = (date: string) =>
  Object.values(useDataStore.getState().byPath).filter((item) => item.type === 'todo' && dayOf(item.planned) === date);

/**
 * @public Put a task in the plan for `date` (default today), at `order` or at the end.
 * A task carried over from an earlier date moves to `date`, and a deferral past it
 * is cleared, so the task shows in that day's plan rather than staying behind.
 */
export function plan(task: ArtifactSummary, date = formatLocalDate(), order?: number): Promise<Artifact> {
  const last = Math.max(0, ...plannedOn(date).map((item) => item.order ?? 0));
  const fields: ArtifactPatch = { planned: date, order: order ?? last + 1 };
  if (task.status === TodoStatus.SOMEDAY) fields.status = TodoStatus.PENDING;
  const due = dayOf(task.due);
  if (due && due < date) fields.due = date;
  if ((dayOf(task.deferDate) ?? '') > date) fields.deferDate = null;
  return patch(task.filePath, fields, `Plan “${task.title}”`);
}

/** @public */
export const unplan = (task: ArtifactSummary) => patch(task.filePath, { planned: null }, `Take “${task.title}” out of the plan`);

/** @public Today's order, top to bottom, as one undo step. */
export const reorderToday = (paths: readonly string[]) =>
  patchMany(
    paths.map((path, index) => ({ path, fields: { order: index + 1 } })),
    'Reorder Today',
  );

/** @public Park a task in Someday: hidden from Today and counts, listed under Tasks. */
export const setSomeday = (task: ArtifactSummary) =>
  patch(task.filePath, { status: TodoStatus.SOMEDAY, planned: null }, `Move “${task.title}” to Someday`);

export type ReplanTarget = 'today' | 'tomorrow' | 'next-week' | 'someday' | 'none';

function replanFields(task: ArtifactSummary, target: ReplanTarget, today: string): ArtifactPatch {
  if (target === 'someday') return { status: TodoStatus.SOMEDAY, planned: null };
  const fields: ArtifactPatch = task.status === TodoStatus.SOMEDAY ? { status: TodoStatus.PENDING } : {};
  if (target === 'none') return { ...fields, due: null, planned: null };
  const date = target === 'today' ? today : target === 'tomorrow' ? shiftDate(today, 1) : formatLocalDate(nextMonday());
  // A dated task moves its date; an undated one is planned for that day.
  if (task.due) fields.due = date;
  fields.planned = date;
  if ((dayOf(task.deferDate) ?? '') > date) fields.deferDate = null;
  return fields;
}

/** @public Re-plan several tasks at once (Carried over, Close the day), as one undo step. */
export function replan(tasks: readonly ArtifactSummary[], target: ReplanTarget): Promise<Artifact[]> {
  const today = formatLocalDate();
  const changes: FieldChange[] = tasks.map((task) => ({ path: task.filePath, fields: replanFields(task, target, today) }));
  return patchMany(changes, tasks.length === 1 ? `Re-plan “${tasks[0].title}”` : `Re-plan ${tasks.length} tasks`);
}

/** @public Schedule a note for spaced review, starting tomorrow. */
export const startReviewing = (note: ArtifactSummary) =>
  patch(note.filePath, { review: shiftDate(formatLocalDate(), 1), reviewInterval: 1 }, `Review “${note.title}”`);

/** @public */
export const stopReviewing = (note: ArtifactSummary) =>
  patch(note.filePath, { review: null, reviewInterval: null }, `Stop reviewing “${note.title}”`);

/** @public Record a review answer; the next review stretches or shrinks with it. */
export const answerReview = (note: ArtifactSummary, answer: RecallAnswer) =>
  patch(note.filePath, schedule(answer, note.reviewInterval, formatLocalDate()), `Review “${note.title}”`);
