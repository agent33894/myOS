import { addDays, differenceInCalendarDays, format, nextMonday } from 'date-fns';
import { formatLocalDate } from '@shared/date';

/** The date part of a stored date or timestamp. */
export const dayOf = (value?: string | null) => (value ? value.slice(0, 10) : undefined);

const atMidnight = (stamp: string) => new Date(`${stamp}T00:00:00`);

/** "Today", "Tomorrow", "Yesterday", a weekday within the coming week, otherwise "Sep 30". */
export function dayLabel(stamp: string, now = new Date()): string {
  const date = atMidnight(stamp);
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return format(date, 'EEEE');
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}

/** A day label for the middle of a sentence: "due tomorrow", but "due Monday" and "Sep 22". */
export const inSentence = (label: string) => (/^(Today|Tomorrow|Yesterday|Just now)$/.test(label) ? label.toLowerCase() : label);

export type DueTone = 'overdue' | 'today' | 'later';

export function dueTone(stamp: string, now = new Date()): DueTone {
  const today = formatLocalDate(now);
  return stamp < today ? 'overdue' : stamp === today ? 'today' : 'later';
}

/** "Just now", "12m ago", "2h ago", then day labels. Date-only stamps skip straight to days. */
export function relativeTime(value: string, now = new Date()): string {
  if (value.length <= 10) return dayLabel(value, now);
  const then = new Date(value);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const day = formatLocalDate(then);
  return day === formatLocalDate(now) ? `${Math.floor(minutes / 60)}h ago` : dayLabel(day, now);
}

/** When an item was made: `created` holds only the day, so same-day edits stand in for the time. */
export function createdAt(item: { created: string; updated: string }): string {
  const sameDay = item.created.length <= 10 && formatLocalDate(new Date(item.updated)) === item.created;
  return sameDay ? item.updated : item.created;
}

/** The quick picks shared by every date menu; "Next week" is next Monday, as in the date picker. */
export function quickDates(now = new Date()) {
  return {
    today: formatLocalDate(now),
    tomorrow: formatLocalDate(addDays(now, 1)),
    nextWeek: formatLocalDate(nextMonday(now)),
  };
}

export const toDate = (stamp?: string | null) => (stamp ? atMidnight(stamp.slice(0, 10)) : null);
export const fromDate = (date: Date | null) => (date ? formatLocalDate(date) : null);
