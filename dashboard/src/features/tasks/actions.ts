import { toast } from 'sonner';
import type { CheckEntry } from '@shared/checklist';
import { dayOf, formatLocalDate } from '@shared/date';
import { parseRule } from '@shared/recurrence';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { patch, remove, toggleCheck } from '../../data/gateway';
import { plan, setSomeday, toggleComplete, unplan } from '../../data/planning';
import { undo } from '../../data/undo';
import { nextLabel } from './dates';

const failed = (error: unknown, fallback: string) =>
  toast.error(error instanceof Error ? error.message : fallback);

/** Run a write; failures surface as a toast instead of an unhandled rejection. */
export function attempt(write: Promise<unknown>, fallback = 'Could not save that change'): void {
  write.catch((error: unknown) => failed(error, fallback));
}

/**
 * A short confirmation whose action undoes the change just made. `steps` is
 * how many recorded changes the action took (creating a project and then
 * filing into it is two), undone newest first.
 */
export function toastWithUndo(message: string, onUndo?: () => void, steps = 1): void {
  toast.success(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        onUndo?.();
        const run = async () => {
          for (let step = 0; step < steps; step += 1) await undo();
        };
        run().catch((error: unknown) => failed(error, 'Could not undo'));
      },
    },
  });
}

/** Complete (or reopen) a task. A repeating task says where it went: "Done · next Tue". */
export async function completeTask(task: ArtifactSummary): Promise<void> {
  const reopening = task.status === TodoStatus.DONE;
  try {
    const result = await toggleComplete(task);
    if (reopening) return;
    const next = parseRule(task.repeatRule) ? dayOf(result.due) : undefined;
    toastWithUndo(next ? `Done · ${nextLabel(next)}` : 'Done');
  } catch (error) {
    failed(error, 'Could not update the task');
  }
}

/** Tick or untick a checklist line in its note. */
export async function completeCheck(entry: CheckEntry): Promise<void> {
  try {
    await toggleCheck(entry);
    if (!entry.done) toastWithUndo('Checked off in the note');
  } catch (error) {
    failed(error, 'That line changed in the note. Open it to check it off.');
  }
}

/** Whether a task is in today's plan. */
export const isPlannedToday = (task: Pick<ArtifactSummary, 'planned'>) => dayOf(task.planned) === formatLocalDate();

/** Add to or take out of today's plan. */
export function togglePlanned(task: ArtifactSummary): void {
  attempt(isPlannedToday(task) ? unplan(task) : plan(task).then(() => toastWithUndo('Added to today’s plan')));
}

/** Park in Someday, or bring it back to Anytime. */
export function toggleSomeday(task: ArtifactSummary): void {
  if (task.status === TodoStatus.SOMEDAY) {
    attempt(patch(task.filePath, { status: TodoStatus.PENDING }, `Bring back “${task.title}”`));
    return;
  }
  attempt(setSomeday(task).then(() => toastWithUndo('Moved to Someday')));
}

export async function deleteItem(item: ArtifactSummary, onUndo?: () => void): Promise<boolean> {
  try {
    await remove(item.filePath);
    toastWithUndo('Deleted', onUndo);
    return true;
  } catch (error) {
    failed(error, 'Could not delete');
    return false;
  }
}
