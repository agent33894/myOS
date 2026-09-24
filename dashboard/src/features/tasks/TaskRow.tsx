import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Flag, FolderInput, Moon, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { defer, moveToProject, setDue, setFlag } from '../../data/gateway';
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
import { attempt, completeTask, deleteItem } from './actions';
import { dayLabel, dayOf, dueTone, fromDate, toDate } from './dates';
import { DeferMenuItems, DueMenuItems, ProjectMenuItems } from './menus';
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
}

const hoverOnly =
  'opacity-0 group-hover/task:opacity-100 group-focus-within/task:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100';

function moveFocus(from: HTMLElement, step: 1 | -1) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
  rows[rows.indexOf(from) + step]?.focus();
}

/**
 * One task: a round checkbox, the title, and a quiet line of details. Hover
 * or focus reveals date, flag, and more in a reserved trailing slot, so the
 * title never shifts. Keyboard: Space/x complete · ⏎ open · d date · f flag · ⌫ delete · ↑↓ move.
 */
export function TaskRow({ task, hideDueOn, hideProject = false }: TaskRowProps) {
  const navigate = useNavigate();
  const projects = useProjectRefs();
  const [completing, setCompleting] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const keepMenuFocus = useRef(false);

  const done = task.status === TodoStatus.DONE;
  const checked = done || completing;
  const project = hideProject ? undefined : projects.find(task.project);
  const today = formatLocalDate();
  const due = dayOf(task.due);
  const deferredUntil = dayOf(task.deferDate);
  const showDue = due && due !== hideDueOn;

  const open = () => navigate(toItemUrl(task));
  const toggle = () => {
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
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      ' ': toggle,
      x: toggle,
      Enter: open,
      d: () => setPicker('due'),
      f: toggleFlag,
      Backspace: () => {
        moveFocus(event.currentTarget, 1);
        remove();
      },
      ArrowDown: () => moveFocus(event.currentTarget, 1),
      ArrowUp: () => moveFocus(event.currentTarget, -1),
    };
    const action = actions[event.key === 'Delete' ? 'Backspace' : event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const menuItems = (
    <>
      <MenuItem icon={ArrowUpRight} shortcut="enter" onSelect={open}>
        Open
      </MenuItem>
      <MenuSeparator />
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
      <MenuItem icon={Flag} shortcut="f" onSelect={toggleFlag}>
        {task.flagged ? 'Remove flag' : 'Flag'}
      </MenuItem>
      <MenuSub label="Move to project" icon={FolderInput}>
        <ProjectMenuItems value={task.project} onChange={(id) => attempt(moveToProject(task, id))} />
      </MenuSub>
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

  const details = [
    showDue ? (
      <span
        key="due"
        className={cn(
          'inline-flex items-center gap-1',
          dueTone(due) === 'overdue' ? 'text-danger' : dueTone(due) === 'today' ? 'text-accent-text' : undefined,
        )}
      >
        <Icon icon={CalendarDays} size="sm" />
        {dayLabel(due)}
      </span>
    ) : null,
    deferredUntil && deferredUntil > today ? (
      <span key="defer" className="inline-flex items-center gap-1">
        <Icon icon={Moon} size="sm" />
        From {dayLabel(deferredUntil)}
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-task-row
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
            <p
              className={cn(
                'truncate text-base text-text transition-colors duration-base',
                checked && 'text-text-tertiary line-through',
              )}
            >
              {task.title}
            </p>
            {details.length > 0 ? (
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">
                {details}
              </div>
            ) : null}
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
              className={task.flagged ? 'text-warning hover:text-warning' : hoverOnly}
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
