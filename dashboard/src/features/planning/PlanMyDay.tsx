import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ArrowRight, CalendarDays, Check, Flag, Plus, Sunrise, Timer, X } from 'lucide-react';
import { isCheckEntry } from '@shared/checklist';
import { dayOf, formatLocalDate } from '@shared/date';
import { isOpenTask, plannedMinutes } from '@shared/today';
import { TodoStatus, type ArtifactSummary } from '@shared/types';
import { plan, unplan } from '../../data/planning';
import type { ProjectWithStats } from '../../data/projects';
import { useArtifacts, useTasks, useToday } from '../../data/selectors';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, IconButton, PageHeader, PageLayout, SectionHeader, cn } from '../../ui';
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

function TaskDetails({ task, inPlan = false }: { task: ArtifactSummary; inPlan?: boolean }) {
  const project = useProjectRefs().find(task.project);
  // In today's plan, "Today" goes without saying.
  const due = dayOf(task.due) === formatLocalDate() && inPlan ? undefined : dayOf(task.due);
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

function Title({ text, flagged = false }: { text: string; flagged?: boolean }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-base text-text">{text}</span>
      {flagged ? <Icon icon={Flag} size="sm" aria-label="Flagged" className="shrink-0 text-warning" /> : null}
    </p>
  );
}

// The same shape as a task row on Today, so the two screens read as one.
const rowClass =
  'group/task relative flex min-h-10 cursor-default items-start gap-2 rounded-md py-2 pl-2 pr-1 outline-none transition-colors duration-fast ease-out hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus';

/** A suggestion: click, Enter, or Space adds it to the end of today's plan. */
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
    <div
      data-task-row
      role="button"
      tabIndex={0}
      aria-label={`Add “${title}” to today`}
      onClick={add}
      onKeyDown={onKeyDown}
      className={cn(rowClass, adding && 'opacity-50')}
    >
      <span
        aria-hidden="true"
        className="mt-px grid size-4.5 shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-text-tertiary transition-colors duration-fast group-hover/task:border-solid group-hover/task:border-accent group-hover/task:bg-accent group-hover/task:text-accent-on group-focus-visible/task:border-solid group-focus-visible/task:border-accent group-focus-visible/task:bg-accent group-focus-visible/task:text-accent-on"
      >
        <Icon icon={Plus} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        {candidate.kind === 'task' ? (
          <>
            <Title text={title} flagged={candidate.task.flagged} />
            <TaskDetails task={candidate.task} />
          </>
        ) : (
          <>
            <Title text={title} />
            <Details>
              {[
                <span key="project" className="inline-flex min-w-0 items-center gap-1.5">
                  <ProjectDot color={projectColor(candidate.project)} />
                  <span className="truncate">Next step for {candidate.project.title}</span>
                </span>,
              ]}
            </Details>
          </>
        )}
      </div>
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
    <div
      data-task-row
      tabIndex={0}
      aria-label={task.title}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Backspace"
      onKeyDown={onKeyDown}
      {...draggableItem(task)}
      className={cn(rowClass, 'cursor-grab animate-scale-in')}
    >
      <span className="mt-px grid size-4.5 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent-text">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <Title text={task.title} flagged={task.flagged} />
        <TaskDetails task={task} inPlan />
      </div>
      <IconButton
        icon={X}
        label="Take out of today’s plan"
        shortcut="backspace"
        size="sm"
        tabIndex={-1}
        onClick={remove}
        className="-my-0.5 opacity-0 group-hover/task:opacity-100 group-focus-visible/task:opacity-100"
      />
    </div>
  );
}

/** The running total against the hours you said you have. Information only; it never blocks. */
function Capacity({ minutes, count }: { minutes: number; count: number }) {
  const show = useSettingsStore((state) => state.showCapacity);
  const hours = useSettingsStore((state) => state.availableHours);
  const available = hours * 60;
  const over = minutes > available;
  const tasks = count === 1 ? '1 task' : `${count} tasks`;
  if (!show) return <p className="text-sm text-text-secondary">{tasks}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-2">
        <span className={cn('text-lg font-semibold tabular-nums', over ? 'text-warning' : 'text-text')}>
          {minutes > 0 ? formatHours(minutes) : '0 h'}
        </span>
        <span className="text-sm tabular-nums text-text-tertiary">of {formatHours(available)}</span>
        <span className="ml-auto text-sm text-text-secondary">{over ? `${formatHours(minutes - available)} over` : tasks}</span>
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
          className={cn('h-full rounded-full transition-all duration-slow ease-out', over ? 'bg-warning' : 'bg-accent')}
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-16 text-center animate-scale-in">
      <span className="mb-1 grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Icon icon={Check} size="lg" />
      </span>
      <h1 className="text-xl font-semibold text-text">Your day is set</h1>
      <p className="text-base text-text-secondary">{planned.length > 0 ? `${summary}.` : 'Nothing planned.'}</p>
      {planned.length > 0 ? (
        <ol className="mt-4 flex w-full flex-col gap-1 rounded-xl bg-raised p-2 text-left shadow-raised">
          {planned.map((task, index) => (
            <li key={task.filePath} className="flex min-h-9 items-center gap-3 px-2 text-base text-text">
              <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent-text">
                {index + 1}
              </span>
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
 * Plan my day: suggestions on the left (carried over, due soon, flagged,
 * Anytime, and project next steps), today's plan on the right with a running
 * estimate. Picking sets `planned` to today; the order here is Today's order.
 */
export function PlanMyDay({ onClose }: { onClose: () => void }) {
  const { planned, groups } = usePlanData();
  const [set, setSet] = useState(false);
  const paths = useMemo(() => planned.map((task) => task.filePath), [planned]);
  const reorder = useReorder(paths);

  if (set) {
    return (
      <PageLayout>
        <DaySet planned={planned} onDone={onClose} />
      </PageLayout>
    );
  }

  return (
    <PageLayout wide className="gap-8">
      <PageHeader
        title="Plan my day"
        subtitle={format(new Date(), 'EEEE, MMMM d')}
        actions={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" leadingIcon={Check} onClick={() => setSet(true)}>
              Set my day
            </Button>
          </>
        }
        className="px-2"
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <section aria-label="Suggestions" className="flex flex-col gap-6">
          {groups.length === 0 ? (
            <p className="px-2 py-3 text-base text-text-tertiary">Everything open is already in your plan.</p>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="flex flex-col">
                <SectionHeader title={group.title} count={group.items.length} as="h3" className="px-2" />
                {group.items.map((candidate) => (
                  <CandidateRow key={candidate.key} candidate={candidate} />
                ))}
              </div>
            ))
          )}
        </section>

        <section
          aria-label="Today’s plan"
          className="order-first flex flex-col gap-4 rounded-xl bg-raised p-4 shadow-raised lg:sticky lg:top-6 lg:order-none"
        >
          <div className="flex flex-col gap-3 px-2 pt-1">
            <h2 className="text-md font-semibold text-text">Today’s plan</h2>
            <Capacity minutes={plannedMinutes(planned)} count={planned.length} />
          </div>
          {planned.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-sunken px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent-text">
                <Icon icon={Sunrise} />
              </span>
              <p className="text-base text-text-secondary">Nothing planned yet.</p>
            </div>
          ) : (
            <div role="list" className="flex flex-col">
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
        </section>
      </div>
    </PageLayout>
  );
}
