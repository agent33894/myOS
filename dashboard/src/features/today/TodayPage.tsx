import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Sun } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { useDataStatus, useToday } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, SectionHeader, formatShortcut } from '../../ui';
import { AddTask } from '../tasks/AddTask';
import { dayLabel, dayOf } from '../tasks/dates';
import { TaskRow } from '../tasks/TaskRow';

function TaskList({ tasks, hideDueOn }: { tasks: ArtifactSummary[]; hideDueOn?: string }) {
  return (
    <div role="list" className="flex flex-col">
      {tasks.map((task) => (
        <div role="listitem" key={task.filePath}>
          <TaskRow task={task} hideDueOn={hideDueOn} />
        </div>
      ))}
    </div>
  );
}

function groupByDay(tasks: ArtifactSummary[]) {
  const groups = new Map<string, ArtifactSummary[]>();
  for (const task of tasks) {
    const day = dayOf(task.due) ?? '';
    groups.set(day, [...(groups.get(day) ?? []), task]);
  }
  return [...groups];
}

/** Overdue, today, a quieter week ahead, and what got done. */
export default function TodayPage() {
  const { overdue, today, upcoming, doneToday } = useToday();
  const status = useDataStatus();
  const [showDone, setShowDone] = useState(false);
  const upcomingByDay = useMemo(() => groupByDay(upcoming), [upcoming]);
  const allClear = overdue.length === 0 && today.length === 0;
  const todayStamp = formatLocalDate();

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 pb-24 pt-12">
        <PageHeader title="Today" subtitle={format(new Date(), 'EEEE, MMMM d')} className="px-2" />

        {status !== 'ready' ? (
          <LoadingState rows={5} />
        ) : (
          <>
            {overdue.length > 0 ? (
              <section aria-label="Overdue">
                <SectionHeader title={<span className="text-danger">Overdue</span>} count={overdue.length} className="px-2" />
                <TaskList tasks={overdue} />
              </section>
            ) : null}

            <section aria-label="Today">
              {allClear ? (
                <EmptyState
                  icon={Sun}
                  title="All clear for today."
                  description={`Enjoy the quiet, or press ${formatShortcut('mod+n')} to capture something.`}
                  className="py-10"
                />
              ) : (
                <>
                  <SectionHeader title="Today" count={today.length} className="px-2" />
                  <TaskList tasks={today} hideDueOn={todayStamp} />
                </>
              )}
              <AddTask due={todayStamp} />
            </section>

            {upcoming.length > 0 ? (
              <section aria-label="Upcoming" className="flex flex-col gap-2">
                <SectionHeader title="Upcoming" count={upcoming.length} className="px-2" />
                {upcomingByDay.map(([day, tasks]) => (
                  <div key={day}>
                    <h3 className="px-2 pb-1 pt-2 text-xs font-medium text-text-tertiary">{dayLabel(day)}</h3>
                    <TaskList tasks={tasks} hideDueOn={day} />
                  </div>
                ))}
              </section>
            ) : null}

            {doneToday.length > 0 ? (
              <section aria-label="Done today">
                <SectionHeader
                  title="Done today"
                  count={doneToday.length}
                  className="px-2"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon={showDone ? ChevronDown : ChevronRight}
                      aria-expanded={showDone}
                      onClick={() => setShowDone((shown) => !shown)}
                    >
                      {showDone ? 'Hide' : 'Show'}
                    </Button>
                  }
                />
                {showDone ? <TaskList tasks={doneToday} /> : null}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
