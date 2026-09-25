import { Signpost, Timer } from 'lucide-react';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { Checkbox, Icon } from '../../ui';
import { completeTask } from '../tasks/actions';
import { formatEstimate } from '../tasks/dates';

/**
 * A task in focus mode: in place of the property row, only what helps doing
 * it — a way to tick it off, its When cue, and its estimate.
 */
export function FocusTaskCue({ task }: { task: ArtifactSummary }) {
  const done = task.status === TodoStatus.DONE;
  return (
    <div className="flex h-7 items-center gap-4 text-base text-text-secondary">
      <span className="inline-flex items-center gap-2">
        <Checkbox checked={done} onCheckedChange={() => void completeTask(task)} aria-label={done ? 'Reopen task' : 'Complete task'} />
        {done ? 'Done' : 'To do'}
      </span>
      {task.when ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Icon icon={Signpost} size="sm" />
          <span className="truncate">{task.when}</span>
        </span>
      ) : null}
      {task.estimatedMinutes ? (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Icon icon={Timer} size="sm" aria-label="Estimate" />
          {formatEstimate(task.estimatedMinutes)}
        </span>
      ) : null}
    </div>
  );
}
