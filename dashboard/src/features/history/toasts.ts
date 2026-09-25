import { toast } from 'sonner';
import { invoke } from '../../data/ipc';

const failed = (error: unknown, fallback: string) => toast.error(error instanceof Error ? error.message : fallback);

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
