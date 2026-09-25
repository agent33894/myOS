import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { openNote } from '../../app/navigation';
import { dailyPath } from '../../data/gateway';
import { useNote, useTodayTasks } from '../../data/selectors';
import { useSettings } from '../../store/settings';
import { Button, EmptyState, PageHeader, PageLayout, SectionHeader } from '../../ui';
import { TaskRow } from '../views/TaskRow';

/** `/today`: today's daily note, then late tasks and tasks due, scheduled, or starting today. */
export function TodayScreen() {
  const { overdue, today } = useTodayTasks();
  const [daily, setDaily] = useState<string | null>(null);
  const dailyFolder = useSettings((state) => state.dailyFolder);
  const dailyPattern = useSettings((state) => state.dailyPattern);
  const dailyNote = useNote(daily);

  useEffect(() => {
    void dailyPath().then(setDaily);
  }, [dailyFolder, dailyPattern]);

  return (
    <PageLayout className="gap-6">
      <PageHeader title="Today" subtitle={format(new Date(), 'EEEE, MMMM d')} />
      {daily ? (
        <Button variant="secondary" leadingIcon={CalendarDays} className="self-start" onClick={() => openNote(daily, { create: true })}>
          {dailyNote ? 'Open today’s note' : 'Start today’s note'}
        </Button>
      ) : null}
      {overdue.length ? (
        <section className="flex flex-col">
          <SectionHeader title="Late" count={overdue.length} />
          {overdue.map((task) => (
            <TaskRow key={`${task.path}:${task.line}`} task={task} />
          ))}
        </section>
      ) : null}
      <section className="flex flex-col">
        <SectionHeader title="Today" count={today.length} />
        {today.map((task) => (
          <TaskRow key={`${task.path}:${task.line}`} task={task} />
        ))}
        {today.length === 0 && overdue.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing due today" description="Tasks with today’s date, or an earlier one, show up here." />
        ) : null}
      </section>
    </PageLayout>
  );
}
