import { useEffect, useState } from 'react';
import { getISOWeek } from 'date-fns';

/** Milliseconds until the next local midnight, when the masthead must turn its page. */
function msUntilMidnight(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1000, midnight.getTime() - now.getTime());
}

/**
 * The Daybook masthead: today's date set like a ledger page heading.
 * Serif day number, mono month and weekday/week garnish.
 */
export function SidebarMasthead() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(new Date()), msUntilMidnight(now));
    return () => window.clearTimeout(timer);
  }, [now]);

  return (
    <div className="chronicle-masthead">
      <span className="chronicle-masthead-day">{now.getDate()}</span>
      <div className="chronicle-masthead-meta">
        <span>{now.toLocaleDateString([], { month: 'long' })}</span>
        <span>
          {now.toLocaleDateString([], { weekday: 'long' })} · Wk {getISOWeek(now)}
        </span>
      </div>
    </div>
  );
}
