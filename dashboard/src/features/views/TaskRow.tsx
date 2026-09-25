import { toast } from 'sonner';
import type { Task } from '@shared/tasks';
import { openNote } from '../../app/navigation';
import { toggleTask } from '../../data/gateway';
import { Checkbox, ListRow, cn } from '../../ui';

const where = (task: Task) => `${task.path.replace(/\.md$/i, '')}${task.line > 0 ? `:${task.line}` : ''}`;

/** One task: check it off in its own file, or open the file. (Wave B: open at the line, reschedule, tag.) */
export function TaskRow({ task }: { task: Task }) {
  const done = task.status !== 'open';
  return (
    <ListRow
      leading={
        <Checkbox
          checked={done}
          aria-label={done ? `Uncheck “${task.text}”` : `Check “${task.text}”`}
          onCheckedChange={() => void toggleTask(task).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not change that task'))}
        />
      }
      meta={<span className="font-mono text-xs">{[task.due && `📅 ${task.due}`, where(task)].filter(Boolean).join('  ')}</span>}
      onActivate={() => openNote(task.path)}
    >
      <span className={cn('truncate', done && 'text-text-tertiary line-through')}>{task.text}</span>
    </ListRow>
  );
}
