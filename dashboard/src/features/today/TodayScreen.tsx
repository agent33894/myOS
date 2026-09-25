import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, SunMedium } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { openNote } from '../../app/navigation';
import { dailyPath } from '../../data/gateway';
import { useTasks, useTodayTasks } from '../../data/selectors';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import { useSettings } from '../../store/settings';
import { openOverlay } from '../../store/ui';
import { Button, EmptyState, Icon, IconButton, LoadingState, PageHeader, PageLayout, SectionHeader, cn } from '../../ui';
import { TaskRow } from '../views/TaskRow';

/** Today's daily note path; follows the daily folder and name settings and the date. */
function useDailyPath(): string | null {
  const dailyFolder = useSettings((state) => state.dailyFolder);
  const dailyPattern = useSettings((state) => state.dailyPattern);
  const day = formatLocalDate();
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void dailyPath(day).then((next) => live && setPath(next));
    return () => {
      live = false;
    };
  }, [dailyFolder, dailyPattern, day]);
  return path;
}

/** Today's daily note, editable in place. It is made on the first edit. */
function TodayNote({ path }: { path: string }) {
  const doc = useDocument(path, { createOnWrite: true });
  return (
    <section aria-label="Today’s note" className="flex flex-col gap-2 rounded-lg bg-raised px-6 pb-4 pt-3 shadow-raised">
      <div className="-mr-3 flex h-8 items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-tertiary">{path}</span>
        {doc.saving || doc.dirty ? <span className="text-xs text-text-tertiary">Saving…</span> : null}
        <IconButton icon={ArrowUpRight} label="Open in a tab" size="sm" onClick={() => openNote(path, { create: true })} />
      </div>
      {doc.conflict ? (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-text">
          <span className="flex-1">This note changed on disk while you were writing.</span>
          <Button size="sm" variant="ghost" onClick={doc.loadTheirs}>
            Use the file
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void doc.keepMine()}>
            Keep mine
          </Button>
        </div>
      ) : null}
      <div className="max-h-96 overflow-y-auto">
        {doc.content === null ? (
          <LoadingState rows={2} />
        ) : (
          <Editor key={path} value={doc.content} onChange={doc.edit} note={{ path }} findSlot={null} placeholder="Write about today, or press / for blocks" />
        )}
      </div>
    </section>
  );
}

/** `/today`: today's daily note, then late tasks and tasks due, scheduled, or starting today. */
export function TodayScreen() {
  const { overdue, today } = useTodayTasks();
  const tasks = useTasks();
  const daily = useDailyPath();
  const day = formatLocalDate();
  const [showDone, setShowDone] = useState(false);
  const doneToday = useMemo(() => tasks.filter((task) => task.status === 'done' && task.done === day), [tasks, day]);

  const summary = [
    today.length ? `${today.length} for today` : null,
    overdue.length ? `${overdue.length} late` : null,
    doneToday.length ? `${doneToday.length} done` : null,
  ].filter(Boolean);

  return (
    <PageLayout className="gap-8">
      <PageHeader
        className="px-2"
        title="Today"
        subtitle={
          <>
            {format(new Date(), 'EEEE, MMMM d')}
            {summary.length ? <span className="text-text-tertiary"> · {summary.join(' · ')}</span> : null}
          </>
        }
        actions={
          daily ? (
            <Button variant="secondary" leadingIcon={CalendarDays} onClick={() => openNote(daily, { create: true })}>
              Open daily note
            </Button>
          ) : null
        }
      />
      {daily ? <TodayNote path={daily} /> : null}
      <div data-task-scope="" className="flex flex-col gap-6">
        {overdue.length ? (
          <section className="flex flex-col">
            <SectionHeader title="Late" count={overdue.length} />
            {overdue.map((task) => (
              <TaskRow key={`${task.path}:${task.line}`} task={task} />
            ))}
          </section>
        ) : null}
        {today.length ? (
          <section className="flex flex-col">
            <SectionHeader title="Today" count={today.length} />
            {today.map((task) => (
              <TaskRow key={`${task.path}:${task.line}`} task={task} />
            ))}
          </section>
        ) : null}
        {today.length === 0 && overdue.length === 0 ? (
          <EmptyState
            icon={SunMedium}
            title="Nothing is due today"
            description="Tasks dated today or earlier show up here."
            action={
              <Button variant="secondary" onClick={() => openOverlay('capture')}>
                Capture a task
              </Button>
            }
          />
        ) : null}
        {doneToday.length ? (
          <section className="flex flex-col">
            <SectionHeader
              title={
                <span
                  role="button"
                  tabIndex={0}
                  aria-expanded={showDone}
                  onClick={() => setShowDone(!showDone)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setShowDone(!showDone);
                    }
                  }}
                  className={cn('-ml-1 inline-flex cursor-default items-center gap-1 rounded-sm px-1 hover:text-text focus-visible:outline-none focus-visible:ring-2')}
                >
                  <Icon icon={showDone ? ChevronDown : ChevronRight} size="sm" />
                  Done today
                  <span className="ml-0.5 tabular-nums text-text-tertiary">{doneToday.length}</span>
                </span>
              }
            />
            {showDone ? doneToday.map((task) => <TaskRow key={`${task.path}:${task.line}`} task={task} />) : null}
          </section>
        ) : null}
      </div>
    </PageLayout>
  );
}
