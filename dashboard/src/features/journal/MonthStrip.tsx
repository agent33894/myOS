import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, getDaysInMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { toPageUrl } from '../../app/navigation';
import { IconButton, cn } from '../../ui';
import { longDate } from './entries';

interface MonthStripProps {
  today: string;
  /** Journal page paths by day (YYYY-MM-DD). */
  pages: ReadonlyMap<string, string>;
  /** Today's cell: go to today's page on this screen. */
  onToday: () => void;
}

/**
 * One month as a single row of days, with a dot under each day that has a
 * page. Days are independent: no connecting lines, no counts.
 */
export function MonthStrip({ today, pages, onToday }: MonthStripProps) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const first = parseLocalDate(`${month}-01`);
  const days = Array.from({ length: getDaysInMonth(first) }, (_, index) =>
    formatLocalDate(new Date(first.getFullYear(), first.getMonth(), index + 1)),
  );
  const shift = (by: number) => setMonth(formatLocalDate(new Date(first.getFullYear(), first.getMonth() + by, 1)).slice(0, 7));
  const isThisMonth = month === today.slice(0, 7);

  return (
    <section aria-label="Days with entries" className="flex flex-col gap-3 px-2">
      <div className="flex items-center gap-1">
        <h2 className="text-sm font-medium text-text-secondary">{format(first, first.getFullYear() === parseLocalDate(today).getFullYear() ? 'MMMM' : 'MMMM yyyy')}</h2>
        <span className="ml-auto flex items-center">
          <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={() => shift(-1)} />
          <IconButton icon={ChevronRight} label="Next month" size="sm" onClick={() => shift(1)} disabled={isThisMonth} />
        </span>
      </div>
      <ol className="flex items-start justify-between">
        {days.map((day) => {
          const path = pages.get(day);
          const isToday = day === today;
          const future = day > today;
          const cell = (
            <>
              <span className="text-xs text-text-tertiary">{format(parseLocalDate(day), 'EEEEE')}</span>
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-xs tabular-nums',
                  isToday ? 'bg-accent font-semibold text-accent-on' : future ? 'text-text-tertiary' : 'text-text-secondary',
                  path && !isToday && 'font-medium text-text',
                )}
              >
                {Number(day.slice(8))}
              </span>
              <span aria-hidden="true" className={cn('size-1 rounded-full', path ? 'bg-accent' : 'bg-transparent')} />
            </>
          );
          const cellClass = 'flex flex-col items-center gap-1 rounded-md py-1';
          const label = `${longDate(day)}${path ? ', has a page' : ''}`;
          return (
            <li key={day}>
              {isToday ? (
                <Link to="#today" aria-label={label} onClick={(event) => {
                    event.preventDefault();
                    onToday();
                  }} className={cn(cellClass, 'hover:bg-text/5')}>
                  {cell}
                </Link>
              ) : path ? (
                <Link to={toPageUrl(path)} aria-label={label} className={cn(cellClass, 'hover:bg-text/5')}>
                  {cell}
                </Link>
              ) : (
                <span aria-label={label} className={cellClass}>
                  {cell}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
