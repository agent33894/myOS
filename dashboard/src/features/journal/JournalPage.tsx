import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { toPageUrl } from '../../app/navigation';
import { useDataStatus, useJournal } from '../../data/selectors';
import { LoadingState, PageHeader, PageLayout, SectionHeader } from '../../ui';
import { CloseDayButton } from '../rituals/CloseDayButton';
import { dayLabel } from '../tasks/dates';
import { firstLines, longDate } from './entries';
import { MonthStrip } from './MonthStrip';
import { TodayEntry } from './TodayEntry';

/** Today's page to write in, a month of days at a glance, and every earlier page. */
export default function JournalPage() {
  const journal = useJournal();
  const status = useDataStatus();
  const today = formatLocalDate();
  const todayRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => new Map(journal.map((entry) => [entry.date, entry.page.filePath])), [journal]);
  const earlier = useMemo(() => {
    const months = new Map<string, typeof journal>();
    for (const entry of journal) {
      if (entry.date >= today) continue;
      const month = entry.date.slice(0, 7);
      months.set(month, [...(months.get(month) ?? []), entry]);
    }
    return [...months];
  }, [journal, today]);

  const focusToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    todayRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
  };

  return (
    <PageLayout className="gap-10">
      <PageHeader
        title="Journal"
        subtitle="A page for each day. Write as much or as little as you like."
        actions={<CloseDayButton />}
        className="px-2"
      />

      <div ref={todayRef} className="scroll-mt-6">
        {status === 'ready' ? <TodayEntry key={today} date={today} label={longDate(today)} /> : <LoadingState rows={3} />}
      </div>

      <MonthStrip today={today} pages={pages} onToday={focusToday} />

      {earlier.length > 0 ? (
        <section aria-label="Earlier pages" className="flex flex-col gap-8">
          {earlier.map(([month, entries]) => (
            <div key={month} className="flex flex-col gap-1">
              <SectionHeader title={format(parseLocalDate(`${month}-01`), month.slice(0, 4) === today.slice(0, 4) ? 'MMMM' : 'MMMM yyyy')} className="px-2" />
              <ol className="flex flex-col gap-1">
                {entries.map(({ date, page }) => {
                  const lines = firstLines(page.searchText);
                  const relative = dayLabel(date);
                  return (
                    <li key={date}>
                      <Link
                        to={toPageUrl(page.filePath)}
                        className="flex flex-col gap-1 rounded-lg px-4 py-3 transition-colors duration-fast ease-out hover:bg-text/5"
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="text-base font-medium text-text">{longDate(date)}</span>
                          {relative === 'Yesterday' ? <span className="text-sm text-text-tertiary">Yesterday</span> : null}
                        </span>
                        {lines.length > 0 ? (
                          <span className="line-clamp-2 text-base text-text-secondary">{lines.join(' · ')}</span>
                        ) : (
                          <span className="text-base text-text-tertiary">An empty page</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      ) : null}
    </PageLayout>
  );
}
