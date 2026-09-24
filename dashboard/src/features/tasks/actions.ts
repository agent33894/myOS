import { toast } from 'sonner';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { remove, toggleComplete } from '../../data/gateway';
import { undo } from '../../data/undo';

const failed = (error: unknown, fallback: string) =>
  toast.error(error instanceof Error ? error.message : fallback);

/** Run a write; failures surface as a toast instead of an unhandled rejection. */
export function attempt(write: Promise<unknown>, fallback = 'Could not save that change'): void {
  write.catch((error: unknown) => failed(error, fallback));
}

/** A short confirmation whose action undoes the change just made. */
export function toastWithUndo(message: string, onUndo?: () => void): void {
  toast.success(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        onUndo?.();
        undo().catch((error: unknown) => failed(error, 'Could not undo'));
      },
    },
  });
}

export async function completeTask(task: ArtifactSummary): Promise<void> {
  const reopening = task.status === TodoStatus.DONE;
  try {
    await toggleComplete(task);
    if (!reopening) toastWithUndo('Done');
  } catch (error) {
    failed(error, 'Could not update the task');
  }
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
