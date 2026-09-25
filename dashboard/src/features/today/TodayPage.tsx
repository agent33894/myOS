import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarClock, ChevronDown, ChevronRight, Sun, Sunrise } from 'lucide-react';
import { isCheckEntry } from '@shared/checklist';
import { formatLocalDate } from '@shared/date';
import { plannedMinutes } from '@shared/today';
import type { ArtifactSummary } from '@shared/types';
import { useDataStatus, useToday } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, PageLayout, SectionHeader, formatShortcut } from '../../ui';
import { useCapacityLine } from '../planning/capacity';
import { PlanMyDay } from '../planning/PlanMyDay';
import { AddTask } from '../tasks/AddTask';
import { dayLabel, dayOf } from '../tasks/dates';
import { EntryList, type Entry } from '../tasks/EntryList';
import { NextSteps } from './NextSteps';
import { ReplanDialog } from './ReplanDialog';

function groupByDay(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const day = dayOf(entry.due) ?? '';
    groups.set(day, [...(groups.get(day) ?? []), entry]);
  }
  return [...groups];
}

/**
 * Carried over, today's plan in your order, project next steps, a quieter week
 * ahead, and what got done. `?plan=1` opens Plan my day; `?replan=1` opens Re-plan.
 */
export default function TodayPage() {
  const { carriedOver, today, upcoming, doneToday } = useToday();
  const status = useDataStatus();
  const [params, setParams] = useSearchParams();
  const [showDone, setShowDone] = useState(false);
  const upcomingByDay = useMemo(() => groupByDay(upcoming), [upcoming]);
  const carriedTasks = useMemo(() => carriedOver.filter((entry): entry is ArtifactSummary => !isCheckEntry(entry)), [carriedOver]);
  const capacity = useCapacityLine(plannedMinutes(today));
  const allClear = carriedOver.length === 0 && today.length === 0;
  const todayStamp = formatLocalDate();

  const flow = params.get('plan') ? 'plan' : params.get('replan') ? 'replan' : null;
  const openFlow = (name: 'plan' | 'replan' | null) => setParams(name ? { [name]: '1' } : {}, { replace: name === null });

  if (flow === 'plan') return <PlanMyDay onClose={() => openFlow(null)} />;

  return (
    <PageLayout className="gap-8">
      <PageHeader
        title="Today"
        subtitle={
          <>
            {format(new Date(), 'EEEE, MMMM d')}
            {capacity ? <span className="mt-1 block text-sm text-text-tertiary">{capacity}</span> : null}
          </>
        }
        actions={
          <Button leadingIcon={Sunrise} onClick={() => openFlow('plan')}>
            Plan my day
          </Button>
        }
        className="px-2"
      />

      {status !== 'ready' ? (
        <LoadingState rows={5} />
      ) : (
        <>
          {carriedOver.length > 0 ? (
            <section aria-label="Carried over">
              <SectionHeader
                title="Carried over"
                count={carriedOver.length}
                className="px-2"
                action={
                  carriedTasks.length > 0 ? (
                    <Button variant="ghost" size="sm" leadingIcon={CalendarClock} onClick={() => openFlow('replan')}>
                      Re-plan
                    </Button>
                  ) : null
                }
              />
              <EntryList entries={carriedOver} />
            </section>
          ) : null}

          <section aria-label="Today">
            {allClear ? (
              <EmptyState
                icon={Sun}
                title="All clear for today."
                description={`Enjoy the quiet, plan a few things, or press ${formatShortcut('mod+n')} to capture something.`}
                className="py-10"
              />
            ) : (
              <>
                <SectionHeader title="Today" count={today.length} className="px-2" />
                <EntryList entries={today} hideDueOn={todayStamp} reorderable />
              </>
            )}
            <AddTask due={todayStamp} />
          </section>

          <NextSteps />

          {upcoming.length > 0 ? (
            <section aria-label="Upcoming" className="flex flex-col gap-2">
              <SectionHeader title="Upcoming" count={upcoming.length} className="px-2" />
              {upcomingByDay.map(([day, entries]) => (
                <div key={day}>
                  <h3 className="px-2 pb-1 pt-2 text-xs font-medium text-text-tertiary">{dayLabel(day)}</h3>
                  <EntryList entries={entries} hideDueOn={day} />
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
              {showDone ? <EntryList entries={doneToday} done /> : null}
            </section>
          ) : null}
        </>
      )}

      <ReplanDialog open={flow === 'replan'} onOpenChange={(open) => openFlow(open ? 'replan' : null)} tasks={carriedTasks} checks={carriedOver.length - carriedTasks.length} />
    </PageLayout>
  );
}
