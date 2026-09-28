import { Link } from 'react-router-dom';
import { format, getDaysInMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { toPageUrl } from '../../app/navigation';
import { Button, IconButton, Tooltip, cn } from '../../ui';
import { longDate, shiftMonth } from './entries';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

interface MonthCalendarProps {
  /** The month shown (YYYY-MM). */
  month: string;
  onMonthChange: (month: string) => void;
  today: string;
  /** Journal pages by day (YYYY-MM-DD): path and first line. */
  pages: ReadonlyMap<string, { path: string; preview?: string }>;
  /** Today's cell: go to today's page on this screen. */
  onToday: () => void;
}

/**
 * A month of days in weeks starting Monday. Days with a page are tinted and
 * open it; today is filled. The month shown also picks which pages list next to it.
 */
export function MonthCalendar({ month, onMonthChange, today, pages, onToday }: MonthCalendarProps) {
  const first = parseLocalDate(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const days = Array.from({ length: getDaysInMonth(first) }, (_, index) =>
    formatLocalDate(new Date(first.getFullYear(), first.getMonth(), index + 1)),
  );
  const thisMonth = today.slice(0, 7);
  const written = days.filter((day) => pages.has(day)).length;

  return (
    <section aria-label="Calendar" className="flex flex-col gap-3 rounded-xl bg-raised p-4 shadow-raised">
      <header className="flex items-center gap-1">
        <h2 className="flex-1 pl-1 text-base font-semibold text-text" aria-live="polite">
          {format(first, 'MMMM')} <span className="font-normal text-text-tertiary">{format(first, 'yyyy')}</span>
        </h2>
        {month !== thisMonth ? (
          <Button variant="ghost" size="sm" onClick={() => onMonthChange(thisMonth)}>
            Today
          </Button>
        ) : null}
        <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={() => onMonthChange(shiftMonth(month, -1))} />
        <IconButton
          icon={ChevronRight}
          label="Next month"
          size="sm"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={month >= thisMonth}
        />
      </header>

      <div className="grid grid-cols-7 justify-items-center gap-y-1">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="grid h-6 place-items-center text-xs text-text-tertiary">
            {weekday}
          </span>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <span key={`lead-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const page = pages.get(day);
          const isToday = day === today;
          const future = day > today;
          const label = `${longDate(day)}${page ? ', has a page' : ''}`;
          const cell = cn(
            'grid size-8 place-items-center rounded-full text-sm tabular-nums outline-none transition-colors duration-fast ease-out focus-visible:ring-2 focus-visible:ring-focus',
            isToday
              ? 'bg-accent font-semibold text-accent-on hover:bg-accent-hover'
              : page
                ? 'bg-accent-soft font-medium text-accent-text hover:bg-accent hover:text-accent-on'
                : future
                  ? 'text-text-tertiary'
                  : 'text-text-secondary',
          );
          const number = Number(day.slice(8));
          if (isToday) {
            return (
              <Tooltip key={day} content="Today" side="top">
                <Link
                  to="#today"
                  aria-label={label}
                  aria-current="date"
                  onClick={(event) => {
                    event.preventDefault();
                    onToday();
                  }}
                  className={cell}
                >
                  {number}
                </Link>
              </Tooltip>
            );
          }
          if (page) {
            return (
              <Tooltip key={day} content={page.preview ?? 'An empty page'} side="top">
                <Link to={toPageUrl(page.path)} aria-label={label} className={cell}>
                  {number}
                </Link>
              </Tooltip>
            );
          }
          return (
            <span key={day} aria-label={label} className={cell}>
              {number}
            </span>
          );
        })}
      </div>

      <p className="border-t border-border px-1 pt-3 text-sm text-text-secondary">
        {written === 0 ? 'No pages this month' : written === 1 ? '1 page this month' : `${written} pages this month`}
      </p>
    </section>
  );
}
