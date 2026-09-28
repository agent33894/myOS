import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { toPageUrl } from '../../app/navigation';
import { useDataStatus, useJournal } from '../../data/selectors';
import { Button, LoadingState, PageHeader, PageLayout, SectionHeader } from '../../ui';
import { CloseDayButton } from '../rituals/CloseDayButton';
import { dayLabel } from '../tasks/dates';
import { firstLines, longDate, wordCount } from './entries';
import { MonthCalendar } from './MonthCalendar';
import { TodayEntry } from './TodayEntry';

type JournalEntry = ReturnType<typeof useJournal>[number];

/** One earlier page: the day on the left, the first lines written on the right. */
function EntryRow({ date, page }: JournalEntry) {
  const day = parseLocalDate(date);
  const [lead, ...rest] = firstLines(page.searchText, 4);
  const words = wordCount(page.searchText);
  const yesterday = dayLabel(date) === 'Yesterday';
  return (
    <li>
      <Link
        to={toPageUrl(page.filePath)}
        aria-label={longDate(date)}
        className="flex gap-4 rounded-lg px-3 py-3 outline-none transition-colors duration-fast ease-out hover:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span className="flex w-10 shrink-0 flex-col items-center pt-0.5">
          <span className="text-xs font-medium text-text-tertiary">{format(day, 'EEE')}</span>
          <span className="text-xl font-semibold tabular-nums text-text">{format(day, 'd')}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          {lead ? (
            <span className="line-clamp-1 text-base font-medium text-text">{lead}</span>
          ) : (
            <span className="text-base text-text-tertiary">An empty page</span>
          )}
          {rest.length > 0 ? <span className="line-clamp-2 text-sm text-text-secondary">{rest.join(' · ')}</span> : null}
          <span className="text-xs text-text-tertiary">
            {yesterday ? 'Yesterday · ' : ''}
            {words === 1 ? '1 word' : `${words} words`}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Today's page to write in, and a calendar that browses every earlier page by month. */
export default function JournalPage() {
  const journal = useJournal();
  const status = useDataStatus();
  const today = formatLocalDate();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const todayRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () => new Map(journal.map((entry) => [entry.date, { path: entry.page.filePath, preview: firstLines(entry.page.searchText, 1)[0] }])),
    [journal],
  );
  const inMonth = useMemo(
    () => journal.filter((entry) => entry.date < today && entry.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [journal, month, today],
  );
  // When a month is empty, offer the nearest earlier month that has pages.
  const earlierMonth = useMemo(() => {
    const before = journal.map((entry) => entry.date.slice(0, 7)).filter((candidate) => candidate < month);
    return before.length > 0 ? before.reduce((latest, candidate) => (candidate > latest ? candidate : latest)) : null;
  }, [journal, month]);

  const monthName = (stamp: string) => {
    const date = parseLocalDate(`${stamp}-01`);
    return format(date, date.getFullYear() === parseLocalDate(today).getFullYear() ? 'MMMM' : 'MMMM yyyy');
  };
  const isThisMonth = month === today.slice(0, 7);

  const focusToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    todayRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
  };

  return (
    <PageLayout className="gap-8">
      <PageHeader title="Journal" actions={<CloseDayButton />} className="px-2" />

      <div ref={todayRef} className="scroll-mt-6">
        {status === 'ready' ? <TodayEntry key={today} date={today} label={longDate(today)} /> : <LoadingState rows={3} />}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full shrink-0 sm:max-w-sm lg:sticky lg:top-6 lg:w-72">
          <MonthCalendar month={month} onMonthChange={setMonth} today={today} pages={pages} onToday={focusToday} />
        </div>

        <section aria-label={`Pages from ${monthName(month)}`} className="flex min-w-0 flex-1 flex-col">
          <SectionHeader title={isThisMonth ? 'Earlier this month' : monthName(month)} count={inMonth.length || undefined} className="px-3" />
          {inMonth.length > 0 ? (
            <ol className="flex flex-col gap-1">
              {inMonth.map((entry) => (
                <EntryRow key={entry.date} {...entry} />
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-start gap-2 px-3 py-3">
              <p className="text-base text-text-tertiary">{isThisMonth ? 'No earlier pages this month.' : `No pages in ${monthName(month)}.`}</p>
              {earlierMonth ? (
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setMonth(earlierMonth)}>
                  Go to {monthName(earlierMonth)}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
