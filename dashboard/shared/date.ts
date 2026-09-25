/** Format a date in the local timezone as YYYY-MM-DD. */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** "Next week" everywhere (capture, date menus, re-plan): the coming Monday, never today. */
export function nextMonday(now: Date = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + (((8 - date.getDay()) % 7) || 7));
  return date;
}


/** A YYYY-MM-DD stamp as local midnight. */
export const parseLocalDate = (stamp: string): Date => new Date(`${stamp.slice(0, 10)}T00:00:00`);

/** `stamp` shifted by whole days, as YYYY-MM-DD. */
export function shiftDate(stamp: string, days: number): string {
  const date = parseLocalDate(stamp);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/** Days since the epoch for a YYYY-MM-DD stamp, for counting days between dates. */
export const dayNumber = (stamp: string) => Math.round(Date.UTC(+stamp.slice(0, 4), +stamp.slice(5, 7) - 1, +stamp.slice(8, 10)) / 86_400_000);
