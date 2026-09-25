import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Sun } from 'lucide-react';
import { isCheckEntry, type CheckEntry } from '@shared/checklist';
import { formatLocalDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { toggleCheck } from '../../data/gateway';
import { useDataStatus, useToday } from '../../data/selectors';
import { Button, Checkbox, EmptyState, LoadingState, PageHeader, PageLayout, SectionHeader, formatShortcut } from '../../ui';
import { attempt } from '../tasks/actions';
import { AddTask } from '../tasks/AddTask';
import { dayLabel, dayOf } from '../tasks/dates';
import { TaskRow } from '../tasks/TaskRow';

type Entry = ArtifactSummary | CheckEntry;

/** A checklist line from a note; ticking it ticks the line in the note. */
function CheckRow({ entry }: { entry: CheckEntry }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Checkbox checked={entry.done} onCheckedChange={() => attempt(toggleCheck(entry))} aria-label={entry.text} />
      <span className="min-w-0 flex-1 truncate text-sm text-text">{entry.text}</span>
      <span className="truncate text-xs text-text-tertiary">{entry.noteTitle}</span>
    </div>
  );
}

function TaskList({ tasks, hideDueOn }: { tasks: Entry[]; hideDueOn?: string }) {
  return (
    <div role="list" className="flex flex-col">
      {tasks.map((task) => (
        <div role="listitem" key={isCheckEntry(task) ? `${task.path}:${task.line}` : task.filePath}>
          {isCheckEntry(task) ? <CheckRow entry={task} /> : <TaskRow task={task} hideDueOn={hideDueOn} />}
        </div>
      ))}
    </div>
  );
}

function groupByDay(tasks: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const task of tasks) {
    const day = dayOf(task.due) ?? '';
    groups.set(day, [...(groups.get(day) ?? []), task]);
  }
  return [...groups];
}

/** Carried over, today, a quieter week ahead, and what got done. */
export default function TodayPage() {
  const { carriedOver, today, upcoming, doneToday } = useToday();
  const status = useDataStatus();
  const [showDone, setShowDone] = useState(false);
  const upcomingByDay = useMemo(() => groupByDay(upcoming), [upcoming]);
  const allClear = carriedOver.length === 0 && today.length === 0;
  const todayStamp = formatLocalDate();

  return (
    <PageLayout className="gap-8">
      <PageHeader title="Today" subtitle={format(new Date(), 'EEEE, MMMM d')} className="px-2" />

      {status !== 'ready' ? (
        <LoadingState rows={5} />
      ) : (
        <>
          {carriedOver.length > 0 ? (
            <section aria-label="Carried over">
              <SectionHeader title="Carried over" count={carriedOver.length} className="px-2" />
              <TaskList tasks={carriedOver} />
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
    </PageLayout>
  );
}
