import { useState } from 'react';
import { format, parse } from 'date-fns';
import type { Artifact } from '../../types/artifacts';
import { dateOnly } from '../../hooks/projectStats';
import { ChronicleCheckmark } from '../today/ChronicleCheckmark';
import { localDateStamp } from '../today/todaySelectors';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../lib/utils';
import { shortDate } from './format';
import { ProjectTaskContextMenu } from './ProjectTaskContextMenu';
import { useArtifactEdit } from './projectMutations';

interface ProjectTaskRowProps {
  task: Artifact;
  isCompleting: boolean;
  isSelected?: boolean;
  onComplete: (task: Artifact) => void;
  onOpen: (task: Artifact) => void;
}

/** One open task: completion, metadata, a hover due-date affordance, and a right-click menu. */
export function ProjectTaskRow({
  task,
  isCompleting,
  isSelected,
  onComplete,
  onOpen,
}: ProjectTaskRowProps) {
  const { applyEdit } = useArtifactEdit();
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = localDateStamp();
  const due = dateOnly(task.due);
  const overdue = due !== null && due < today;
  const deferDate = dateOnly(task.deferDate);
  const deferred = deferDate !== null && deferDate > today;

  const setDue = (next: string | undefined) => {
    setPickerOpen(false);
    void applyEdit(task, { due: next }, next ? `Due ${shortDate(next)}` : 'Clear due date');
  };

  return (
    <ProjectTaskContextMenu task={task} applyEdit={applyEdit} onPickDate={() => setPickerOpen(true)}>
      <div
        className={cn(
          'chronicle-task-row',
          isCompleting && 'is-completing',
          isSelected && 'is-selected',
        )}
      >
        <button
          className="chronicle-completion"
          onClick={() => onComplete(task)}
          aria-label={`Complete ${task.title}`}
          disabled={isCompleting}
        >
          <span>
            <ChronicleCheckmark />
          </span>
        </button>
        <button className="chronicle-row-body active:scale-[0.98]" onClick={() => onOpen(task)}>
          <span className="chronicle-row-title">{task.title}</span>
          <span className="chronicle-row-meta">
            <span className={overdue ? 'is-risk' : undefined}>
              {due
                ? overdue
                  ? `Overdue · was due ${shortDate(due)}`
                  : `Due ${shortDate(due)}`
                : 'No due date'}
            </span>
            {task.priority === 'high' ? <span className="is-risk"> · High priority</span> : null}
            {task.flagged ? <span className="accent-text"> · Flagged</span> : null}
            {deferred ? <span> · Deferred until {shortDate(deferDate)}</span> : null}
          </span>
        </button>
        <span className={cn('chronicle-row-affordances', pickerOpen && 'is-open')}>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button aria-label={`Set due date for ${task.title}`}>Due</button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={due ? parse(due, 'yyyy-MM-dd', new Date()) : undefined}
                onSelect={(date) => setDue(date ? format(date, 'yyyy-MM-dd') : undefined)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </span>
      </div>
    </ProjectTaskContextMenu>
  );
}
