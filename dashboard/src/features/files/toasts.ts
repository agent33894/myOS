import { toast } from 'sonner';
import { invoke } from '../../data/ipc';
import { undo } from '../../data/undo';

const failed = (error: unknown, fallback: string) => toast.error(error instanceof Error ? error.message : fallback);

/**
 * A confirmation whose Undo reverses the change just recorded, then runs
 * `after` (a page follows its file back to where it was).
 */
export function followUndo(message: string, after?: () => void): void {
  toast.success(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        undo()
          .then(() => after?.())
          .catch((error: unknown) => failed(error, 'Could not undo'));
      },
    },
  });
}

/** "Exported to …" with a way to find the file. */
export function exported(savedPath: string): void {
  const name = savedPath.split(/[\\/]/).pop() ?? savedPath;
  toast.success(`Exported to ${name}`, {
    action: {
      label: 'Show in folder',
      onClick: () => void invoke('export:reveal', savedPath).catch((error: unknown) => failed(error, 'Could not show the file')),
    },
  });
}

export { failed };
