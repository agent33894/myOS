import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, FileText } from 'lucide-react';
import type { CheckEntry } from '@shared/checklist';
import { toNoteUrl } from '../../app/navigation';
import { Checkbox, Icon, cn } from '../../ui';
import { completeCheck } from './actions';
import { dayLabel, dueTone } from './dates';
import { ProjectDot } from './ProjectDot';
import { useProjectRefs } from './projectRefs';
import { moveFocus } from './TaskRow';

const LEAVE_AFTER_MS = 600;

interface CheckRowProps {
  entry: CheckEntry;
  /** Leave out the date when it is this day, because the list already says so. */
  hideDueOn?: string;
  /** Leave out the project inside that project's own page. */
  hideProject?: boolean;
}

/**
 * A checklist line from a note, sitting beside tasks. Ticking it ticks the
 * line in the note and nothing else. Keyboard: Space/x check · ⏎ open the note · ↑↓ move.
 */
export function CheckRow({ entry, hideDueOn, hideProject = false }: CheckRowProps) {
  const navigate = useNavigate();
  const projects = useProjectRefs();
  const project = hideProject ? undefined : projects.find(entry.project);
  const [completing, setCompleting] = useState(false);
  const checked = entry.done || completing;
  const openNote = () => navigate(toNoteUrl(entry.path));

  const toggle = () => {
    if (entry.done) return void completeCheck(entry);
    if (completing) return;
    setCompleting(true);
    window.setTimeout(() => void completeCheck(entry).finally(() => setCompleting(false)), LEAVE_AFTER_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      ' ': toggle,
      x: toggle,
      Enter: openNote,
      ArrowDown: () => moveFocus(event.currentTarget, 1),
      ArrowUp: () => moveFocus(event.currentTarget, -1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const showDue = entry.due && entry.due !== hideDueOn;
  return (
    <div
      data-task-row
      tabIndex={0}
      aria-label={`${entry.text}, from ${entry.noteTitle}`}
      onKeyDown={onKeyDown}
      className={cn(
        'group/task flex min-h-10 items-start gap-2 rounded-md py-2 pl-2 pr-1 outline-none transition-opacity duration-slow ease-out hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus',
        completing && 'opacity-0 delay-300',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={toggle}
        aria-label={entry.done ? `Uncheck “${entry.text}”` : `Check off “${entry.text}”`}
        tabIndex={-1}
        className="-my-0.5"
      />
      <div className="min-w-0 flex-1 cursor-default" onClick={openNote}>
        <p className={cn('truncate text-base text-text transition-colors duration-base', checked && 'text-text-tertiary line-through')}>
          {entry.text}
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">
          {showDue && entry.due ? (
            <span className={cn('inline-flex items-center gap-1', dueTone(entry.due) === 'today' ? 'text-accent-text' : dueTone(entry.due) === 'overdue' ? 'text-text-secondary' : undefined)}>
              <Icon icon={CalendarDays} size="sm" />
              {dayLabel(entry.due)}
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-1">
            <Icon icon={FileText} size="sm" />
            <span className="truncate">{entry.noteTitle}</span>
          </span>
          {project ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <ProjectDot color={project.color} />
              <span className="truncate">{project.title}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
