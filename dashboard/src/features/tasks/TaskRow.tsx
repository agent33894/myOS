import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarDays,
  Flag,
  FolderInput,
  Moon,
  MoreHorizontal,
  Repeat,
  Signpost,
  Sun,
  SunDim,
  Timer,
  Trash2,
} from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { defer, moveToProject, setDue, setFlag } from '../../data/gateway';
import { draggableItem } from '../../lib/artifactDnd';
import {
  Checkbox,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  DatePicker,
  Icon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuTrigger,
  Pill,
  cn,
} from '../../ui';
import { attempt, completeTask, deleteItem, isPlannedToday, togglePlanned, toggleSomeday } from './actions';
import { dayLabel, dayOf, dueTone, formatEstimate, fromDate, inSentence, toDate } from './dates';
import { repeatLabel, setEstimate } from './fields';
import { DeferMenuItems, DueMenuItems, EstimateMenuItems, ProjectMenuItems } from './menus';
import { ProjectDot } from './ProjectDot';
import { useProjectRefs } from './projectRefs';

/** How long a checked task stays (struck through, fading) before it leaves the list. */
const LEAVE_AFTER_MS = 600;

type PickerMode = 'due' | 'defer';

interface TaskRowProps {
  task: ArtifactSummary;
  /** Leave out the due date when it is this day, because the list already says so. */
  hideDueOn?: string;
  /** Leave out the project inside that project's own page. */
  hideProject?: boolean;
  /** ⌥↑ / ⌥↓ move the task within an ordered list (today's plan). */
  onMove?: (step: 1 | -1) => void;
  /** In "Done today": a repeating task finished today shows as done, though it stays open for next time. */
  doneToday?: boolean;
  /** Leave out the Someday marker inside the Someday list. */
  inSomeday?: boolean;
}

const hoverOnly =
  'opacity-0 group-hover/task:opacity-100 group-focus-within/task:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100';

/** Move focus between rows (task rows and checklist rows alike). */
export function moveFocus(from: HTMLElement, step: 1 | -1) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
  rows[rows.indexOf(from) + step]?.focus();
}

/** The quiet line under a task's title: when, date, repeat, estimate, project, tags. */
interface DetailsProps {
  task: ArtifactSummary;
  showDue: boolean;
  hideProject: boolean;
  /** The list is Today, so "planned today" goes without saying. */
  onToday: boolean;
  inSomeday: boolean;
}

function TaskDetails({ task, showDue, hideProject, onToday, inSomeday }: DetailsProps) {
  const projects = useProjectRefs();
  const project = hideProject ? undefined : projects.find(task.project);
  const today = formatLocalDate();
  const due = dayOf(task.due);
  const deferredUntil = dayOf(task.deferDate);
  const planned = dayOf(task.planned);
  const repeat = repeatLabel(task);
  const tone = due ? dueTone(due) : null;

  const details = [
    task.when ? (
      <span key="when" className="inline-flex min-w-0 items-center gap-1 text-text-secondary">
        <Icon icon={Signpost} size="sm" />
        <span className="truncate">{task.when}</span>
      </span>
    ) : null,
    showDue && due ? (
      <span key="due" className={cn('inline-flex items-center gap-1', tone === 'today' && 'text-accent-text', tone === 'overdue' && 'text-text-secondary')}>
        <Icon icon={CalendarDays} size="sm" />
        {dayLabel(due)}
      </span>
    ) : null,
    !onToday && planned === today ? (
      <span key="planned" className="inline-flex items-center gap-1 text-accent-text">
        <Icon icon={Sun} size="sm" />
        Today
      </span>
    ) : null,
    !due && planned && planned < today ? (
      <span key="carried" className="inline-flex items-center gap-1 text-text-secondary">
        <Icon icon={Sun} size="sm" />
        Planned {inSentence(dayLabel(planned))}
      </span>
    ) : null,
    deferredUntil && deferredUntil > today ? (
      <span key="defer" className="inline-flex items-center gap-1">
        <Icon icon={Moon} size="sm" />
        From {dayLabel(deferredUntil)}
      </span>
    ) : null,
    repeat ? (
      <span key="repeat" className="inline-flex items-center gap-1">
        <Icon icon={Repeat} size="sm" aria-label="Repeats" />
        {repeat}
      </span>
    ) : null,
    task.estimatedMinutes ? (
      <span key="estimate" className="inline-flex items-center gap-1 tabular-nums">
        <Icon icon={Timer} size="sm" aria-label="Estimate" />
        {formatEstimate(task.estimatedMinutes)}
      </span>
    ) : null,
    task.status === TodoStatus.SOMEDAY && !inSomeday ? (
      <span key="someday" className="inline-flex items-center gap-1">
        <Icon icon={Archive} size="sm" />
        Someday
      </span>
    ) : null,
    project ? (
      <span key="project" className="inline-flex min-w-0 items-center gap-1.5">
        <ProjectDot color={project.color} />
        <span className="truncate">{project.title}</span>
      </span>
    ) : null,
    ...task.tags.map((tag) => (
      <Pill key={`#${tag}`} className="h-5 px-1.5 text-xs">
        #{tag}
      </Pill>
    )),
  ].filter(Boolean);

  if (details.length === 0) return null;
  return <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">{details}</div>;
}

/**
 * One task: a round checkbox, the title (with its flag beside it), and a quiet
 * line of details. Hover or focus reveals date, flag, and more in a reserved
 * trailing slot, so the title never shifts.
 * Keyboard: Space/x complete · ⏎ open · d date · f flag · t today's plan · s Someday · ⌫ delete · ↑↓ move.
 */
export function TaskRow({ task, hideDueOn, hideProject = false, onMove, doneToday = false, inSomeday = false }: TaskRowProps) {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const keepMenuFocus = useRef(false);

  const done = task.status === TodoStatus.DONE;
  const finishedRepeat = doneToday && !done;
  const someday = task.status === TodoStatus.SOMEDAY;
  const checked = done || completing || finishedRepeat;
  const due = dayOf(task.due);
  const planned = isPlannedToday(task);

  const open = () => navigate(toItemUrl(task));
  const toggle = () => {
    if (finishedRepeat) return;
    if (done) return void completeTask(task);
    if (completing) return;
    setCompleting(true);
    window.setTimeout(() => void completeTask(task).finally(() => setCompleting(false)), LEAVE_AFTER_MS);
  };
  const toggleFlag = () => attempt(setFlag(task, !task.flagged));
  const pickDate = (mode: PickerMode) => {
    keepMenuFocus.current = true;
    window.requestAnimationFrame(() => setPicker(mode));
  };
  const remove = () => void deleteItem(task);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey) return;
    if (event.altKey) {
      if (!onMove || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
      event.preventDefault();
      onMove(event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    const actions: Record<string, () => void> = {
      ' ': toggle,
      x: toggle,
      Enter: open,
      d: () => setPicker('due'),
      f: toggleFlag,
      t: () => togglePlanned(task),
      s: () => toggleSomeday(task),
      Backspace: () => {
        moveFocus(event.currentTarget, 1);
        remove();
      },
      ArrowDown: () => moveFocus(event.currentTarget, 1),
      ArrowUp: () => moveFocus(event.currentTarget, -1),
    };
    const action = actions[event.key === 'Delete' ? 'Backspace' : event.key];
    // Planning a finished task means nothing.
    if (!action || (done && (event.key === 't' || event.key === 's'))) return;
    event.preventDefault();
    action();
  };

  const menuItems = (
    <>
      <MenuItem icon={ArrowUpRight} shortcut="enter" onSelect={open}>
        Open
      </MenuItem>
      <MenuSeparator />
      {done ? null : (
        <MenuItem icon={planned ? SunDim : Sun} shortcut="t" onSelect={() => togglePlanned(task)}>
          {planned ? 'Remove from today’s plan' : 'Plan for today'}
        </MenuItem>
      )}
      <MenuSub label="Due" icon={CalendarDays}>
        <DueMenuItems value={task.due} onChange={(date) => attempt(setDue(task, date))} onPick={() => pickDate('due')} />
      </MenuSub>
      <MenuSub label="Defer" icon={Moon}>
        <DeferMenuItems
          value={task.deferDate}
          onChange={(date) => attempt(defer(task, date))}
          onPick={() => pickDate('defer')}
        />
      </MenuSub>
      <MenuSub label="Estimate" icon={Timer}>
        <EstimateMenuItems value={task.estimatedMinutes} onChange={(minutes) => attempt(setEstimate(task, minutes))} />
      </MenuSub>
      <MenuItem icon={Flag} shortcut="f" onSelect={toggleFlag}>
        {task.flagged ? 'Remove flag' : 'Flag'}
      </MenuItem>
      <MenuSub label="Move to project" icon={FolderInput}>
        <ProjectMenuItems value={task.project} onChange={(id) => attempt(moveToProject(task, id))} />
      </MenuSub>
      {done ? null : (
        <MenuItem icon={someday ? ArchiveRestore : Archive} shortcut="s" onSelect={() => toggleSomeday(task)}>
          {someday ? 'Bring back from Someday' : 'Someday'}
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem icon={Trash2} shortcut="backspace" danger onSelect={remove}>
        Delete
      </MenuItem>
    </>
  );
  const onCloseAutoFocus = (event: Event) => {
    if (!keepMenuFocus.current) return;
    keepMenuFocus.current = false;
    event.preventDefault();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-task-row
          {...draggableItem(task)}
          tabIndex={0}
          aria-label={task.title}
          onKeyDown={onKeyDown}
          className={cn(
            'group/task flex min-h-10 items-start gap-2 rounded-md py-2 pl-2 pr-1 outline-none transition-opacity duration-slow ease-out hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-text/5',
            completing && 'opacity-0 delay-300',
          )}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={toggle}
            aria-label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
            tabIndex={-1}
            className="-my-0.5"
          />
          <div className="min-w-0 flex-1 cursor-default" onClick={open}>
            <p className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  'truncate text-base text-text transition-colors duration-base',
                  checked && 'text-text-tertiary line-through',
                  someday && !checked && 'text-text-secondary',
                )}
              >
                {task.title}
              </span>
              {task.flagged && !checked ? <Icon icon={Flag} size="sm" aria-label="Flagged" className="text-warning" /> : null}
            </p>
            <TaskDetails
              task={task}
              showDue={Boolean(due && due !== hideDueOn)}
              hideProject={hideProject}
              onToday={hideDueOn === formatLocalDate()}
              inSomeday={inSomeday}
            />
          </div>
          <div className="-my-0.5 flex shrink-0 items-center">
            <DatePicker
              value={toDate(picker === 'defer' ? task.deferDate : task.due)}
              onChange={(date) =>
                attempt(picker === 'defer' ? defer(task, fromDate(date)) : setDue(task, fromDate(date)))
              }
              open={picker !== null}
              onOpenChange={(next) => setPicker(next ? (picker ?? 'due') : null)}
              align="end"
            >
              <IconButton icon={CalendarDays} label="Set date" shortcut="d" size="sm" tabIndex={-1} className={hoverOnly} />
            </DatePicker>
            <IconButton
              icon={Flag}
              label={task.flagged ? 'Remove flag' : 'Flag'}
              shortcut="f"
              size="sm"
              tabIndex={-1}
              onClick={toggleFlag}
              className={cn(hoverOnly, task.flagged && 'text-warning hover:text-warning')}
            />
            <Menu>
              <MenuTrigger asChild>
                <IconButton icon={MoreHorizontal} label="More" size="sm" tabIndex={-1} className={hoverOnly} />
              </MenuTrigger>
              <MenuContent align="end" onCloseAutoFocus={onCloseAutoFocus}>
                {menuItems}
              </MenuContent>
            </Menu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>{menuItems}</ContextMenuContent>
    </ContextMenu>
  );
}
