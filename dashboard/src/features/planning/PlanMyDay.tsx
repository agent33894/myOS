import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ArrowRight, CalendarDays, Check, Plus, Sunrise, Timer, X } from 'lucide-react';
import { isCheckEntry } from '@shared/checklist';
import { dayOf, formatLocalDate } from '@shared/date';
import { isOpenTask, plannedMinutes } from '@shared/today';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { plan, unplan } from '../../data/planning';
import type { ProjectWithStats } from '../../data/projects';
import { useArtifacts, useTasks, useToday } from '../../data/selectors';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, IconButton, Kbd, SectionHeader, cn } from '../../ui';
import { makeTaskFromNext, useNextSteps } from '../projects/nextStep';
import { attempt } from '../tasks/actions';
import { dayLabel, formatEstimate, formatHours } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor, useProjectRefs } from '../tasks/projectRefs';
import { moveFocus } from '../tasks/TaskRow';
import { DropMarker, useReorder } from '../tasks/useReorder';
import { draggableItem } from '../../lib/artifactDnd';

type Candidate =
  | { kind: 'task'; key: string; task: ArtifactSummary }
  | { kind: 'next'; key: string; project: ProjectWithStats };

interface CandidateGroup {
  title: string;
  items: Candidate[];
}

const tasksIn = (list: ReadonlyArray<ArtifactSummary | { kind: 'check' }>) =>
  list.filter((entry): entry is ArtifactSummary => !isCheckEntry(entry));

/** Today's plan (tasks planned for today) and the candidates for it, each task listed once. */
function usePlanData() {
  const artifacts = useArtifacts();
  const { carriedOver, today, upcoming } = useToday();
  const { anytime } = useTasks();
  const nextSteps = useNextSteps();
  const stamp = formatLocalDate();

  const planned = useMemo(
    () =>
      artifacts
        .filter((task) => isOpenTask(task) && dayOf(task.planned) === stamp)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title)),
    [artifacts, stamp],
  );

  const groups = useMemo(() => {
    const seen = new Set(planned.map((task) => task.filePath));
    const take = (tasks: ArtifactSummary[]): Candidate[] =>
      tasks
        .filter((task) => !seen.has(task.filePath) && task.status !== TodoStatus.SOMEDAY)
        .map((task) => {
          seen.add(task.filePath);
          return { kind: 'task' as const, key: task.filePath, task };
        });
    const todays = tasksIn(today);
    const list: CandidateGroup[] = [
      { title: 'Carried over', items: take(tasksIn(carriedOver)) },
      { title: 'Due soon', items: take([...todays.filter((task) => task.due), ...tasksIn(upcoming)]) },
      { title: 'Flagged', items: take(todays.filter((task) => task.flagged)) },
      { title: 'In progress', items: take(todays.filter((task) => task.status === TodoStatus.IN_PROGRESS)) },
      { title: 'Anytime', items: take(anytime) },
      { title: 'Next steps', items: nextSteps.map((project) => ({ kind: 'next' as const, key: project.filePath, project })) },
    ];
    return list.filter((group) => group.items.length > 0);
  }, [planned, carriedOver, today, upcoming, anytime, nextSteps]);

  return { planned, groups };
}

function Details({ children }: { children: ReactNode[] }) {
  const shown = children.filter(Boolean);
  if (shown.length === 0) return null;
  return <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">{shown}</div>;
}

function TaskDetails({ task }: { task: ArtifactSummary }) {
  const project = useProjectRefs().find(task.project);
  const due = dayOf(task.due);
  return (
    <Details>
      {[
        due ? (
          <span key="due" className="inline-flex items-center gap-1">
            <Icon icon={CalendarDays} size="sm" />
            {dayLabel(due)}
          </span>
        ) : null,
        task.estimatedMinutes ? (
          <span key="estimate" className="inline-flex items-center gap-1 tabular-nums">
            <Icon icon={Timer} size="sm" />
            {formatEstimate(task.estimatedMinutes)}
          </span>
        ) : null,
        project ? (
          <span key="project" className="inline-flex min-w-0 items-center gap-1.5">
            <ProjectDot color={project.color} />
            <span className="truncate">{project.title}</span>
          </span>
        ) : null,
      ]}
    </Details>
  );
}

const rowClass =
  'group/task relative flex min-h-12 cursor-default items-center gap-3 rounded-md px-3 py-2 outline-none transition-colors duration-fast ease-out hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus';

/** A candidate on the left: click, ⏎, or Space adds it to the end of today's plan. */
function CandidateRow({ candidate }: { candidate: Candidate }) {
  const [adding, setAdding] = useState(false);
  const title = candidate.kind === 'task' ? candidate.task.title : candidate.project.next!;
  const add = () => {
    if (adding) return;
    setAdding(true);
    const write = candidate.kind === 'task' ? plan(candidate.task) : makeTaskFromNext(candidate.project, { plan: true });
    attempt(write.finally(() => setAdding(false)), 'Could not add that to today');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key] as 1 | -1 | undefined;
    if (step) {
      event.preventDefault();
      moveFocus(event.currentTarget, step);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      moveFocus(event.currentTarget, 1);
      add();
    }
  };
  return (
    <div data-task-row role="button" tabIndex={0} aria-label={`Add “${title}” to today`} onClick={add} onKeyDown={onKeyDown} className={cn(rowClass, adding && 'opacity-50')}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-text">{title}</p>
        {candidate.kind === 'task' ? (
          <TaskDetails task={candidate.task} />
        ) : (
          <Details>
            {[
              <span key="project" className="inline-flex min-w-0 items-center gap-1.5">
                <ProjectDot color={projectColor(candidate.project)} />
                <span className="truncate">Next step for {candidate.project.title}</span>
              </span>,
            ]}
          </Details>
        )}
      </div>
      <span className="grid size-7 shrink-0 place-items-center rounded-md text-text-tertiary transition-colors duration-fast group-hover/task:bg-accent-soft group-hover/task:text-accent-text group-focus-visible/task:bg-accent-soft group-focus-visible/task:text-accent-text">
        <Icon icon={Plus} />
      </span>
    </div>
  );
}

/** A task in today's plan: its place, title, and a way to take it out again. */
function PlanRow({ task, index, onMove }: { task: ArtifactSummary; index: number; onMove: (step: 1 | -1) => void }) {
  const remove = () => attempt(unplan(task), 'Could not take that out of the plan');
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key] as 1 | -1 | undefined;
    if (step && event.altKey) {
      event.preventDefault();
      onMove(step);
    } else if (step) {
      event.preventDefault();
      moveFocus(event.currentTarget, step);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      moveFocus(event.currentTarget, 1);
      remove();
    }
  };
  return (
    <div data-task-row tabIndex={0} aria-label={task.title} onKeyDown={onKeyDown} {...draggableItem(task)} className={cn(rowClass, 'cursor-grab bg-raised')}>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-medium tabular-nums text-accent-text">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-text">{task.title}</p>
        <TaskDetails task={task} />
      </div>
      <IconButton
        icon={X}
        label="Take out of today’s plan"
        shortcut="backspace"
        size="sm"
        tabIndex={-1}
        onClick={remove}
        className="opacity-0 group-hover/task:opacity-100 group-focus-visible/task:opacity-100"
      />
    </div>
  );
}

/** The running total against the hours you said you have. Information only. */
function Capacity({ minutes, count }: { minutes: number; count: number }) {
  const show = useSettingsStore((state) => state.showCapacity);
  const hours = useSettingsStore((state) => state.availableHours);
  const available = hours * 60;
  const tasks = count === 1 ? '1 task' : `${count} tasks`;
  if (!show) return <p className="text-sm text-text-secondary">{tasks}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-3 text-sm text-text-secondary">
        <span>
          {tasks}
          {minutes > 0 ? ` · about ${formatHours(minutes)}` : ''}
        </span>
        <span className="tabular-nums text-text-tertiary">{formatHours(available)} available</span>
      </p>
      <div
        role="meter"
        aria-label="Planned time"
        aria-valuemin={0}
        aria-valuemax={available}
        aria-valuenow={Math.min(minutes, available)}
        aria-valuetext={`About ${formatHours(minutes)} of ${formatHours(available)}`}
        className="h-1.5 overflow-hidden rounded-full bg-text/10"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-slow ease-out"
          style={{ width: `${Math.min(100, (minutes / Math.max(available, 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function DaySet({ planned, onDone }: { planned: ArtifactSummary[]; onDone: () => void }) {
  const minutes = plannedMinutes(planned);
  const summary = [planned.length === 1 ? 'One task' : `${planned.length} tasks`, minutes > 0 ? `about ${formatHours(minutes)}` : null]
    .filter(Boolean)
    .join(', ');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center animate-scale-in">
      <span className="mb-1 grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Icon icon={Check} size="lg" />
      </span>
      <h1 className="text-xl font-semibold text-text">Your day is set</h1>
      <p className="text-base text-text-secondary">
        {planned.length > 0 ? `${summary}. Today lists them in the order you chose.` : 'A day with nothing planned is a fine day too.'}
      </p>
      {planned.length > 0 ? (
        <ol className="mt-4 flex w-full flex-col gap-1 rounded-lg bg-raised p-2 text-left shadow-raised">
          {planned.map((task, index) => (
            <li key={task.filePath} className="flex min-h-9 items-center gap-3 px-2 text-base text-text">
              <span className="w-4 shrink-0 text-right text-sm tabular-nums text-text-tertiary">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              {task.estimatedMinutes ? <span className="shrink-0 text-sm tabular-nums text-text-tertiary">{formatEstimate(task.estimatedMinutes)}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      <Button variant="primary" className="mt-4" onClick={onDone} autoFocus>
        Go to Today
        <Icon icon={ArrowRight} />
      </Button>
    </div>
  );
}

/**
 * Plan my day: candidates on the left (carried over, due soon, flagged,
 * Anytime, and project next steps), today's plan on the right with a running
 * estimate. Picking sets `planned` to today; the order here is Today's order.
 */
export function PlanMyDay({ onClose }: { onClose: () => void }) {
  const { planned, groups } = usePlanData();
  const [set, setSet] = useState(false);
  const paths = useMemo(() => planned.map((task) => task.filePath), [planned]);
  const reorder = useReorder(paths);

  return (
    <div className="scrollbar-stable h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-24 pt-12">
        {set ? (
          <DaySet planned={planned} onDone={onClose} />
        ) : (
          <>
            <header className="flex flex-wrap items-start gap-4 px-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h1 className="flex items-center gap-2 text-xl font-semibold text-text">
                  <Icon icon={Sunrise} className="text-accent-text" />
                  Plan my day
                </h1>
                <p className="text-base text-text-secondary">
                  {format(new Date(), 'EEEE, MMMM d')} · Pick what you’d like to do today. You can change it any time.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" leadingIcon={Check} onClick={() => setSet(true)}>
                  Set my day
                </Button>
              </div>
            </header>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <section aria-label="Candidates" className="flex flex-col gap-4">
                {groups.length === 0 ? (
                  <p className="rounded-lg bg-text/5 px-4 py-6 text-center text-base text-text-secondary">
                    Everything open is already in your plan.
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.title} className="flex flex-col">
                      <SectionHeader title={group.title} count={group.items.length} as="h3" />
                      {group.items.map((candidate) => (
                        <CandidateRow key={candidate.key} candidate={candidate} />
                      ))}
                    </div>
                  ))
                )}
              </section>

              <section aria-label="Today’s plan" className="order-first flex flex-col gap-4 rounded-xl bg-sunken p-4 lg:sticky lg:top-6 lg:order-none">
                <div className="flex flex-col gap-3 px-1">
                  <h2 className="text-md font-semibold text-text">Today’s plan</h2>
                  <Capacity minutes={plannedMinutes(planned)} count={planned.length} />
                </div>
                {planned.length === 0 ? (
                  <p className="rounded-lg px-4 py-10 text-center text-base text-text-tertiary">
                    Nothing planned yet. Pick a few things from the left.
                  </p>
                ) : (
                  <div role="list" className="flex flex-col gap-1">
                    {planned.map((task, index) => {
                      const marker = reorder.markerFor(task.filePath);
                      return (
                        <div role="listitem" key={task.filePath} className="relative" {...reorder.dropProps(task.filePath)}>
                          {marker ? <DropMarker after={marker.after} /> : null}
                          <PlanRow task={task} index={index} onMove={(step) => reorder.move(task.filePath, step)} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {planned.length > 1 ? (
                  <p className="flex items-center gap-1 px-1 text-xs text-text-tertiary">
                    Drag to reorder, or focus a row and press <Kbd shortcut="alt+up" /> <Kbd shortcut="alt+down" />
                  </p>
                ) : null}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
