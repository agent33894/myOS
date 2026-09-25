import { dayOf, formatLocalDate, parseLocalDate, shiftDate } from './date';

/** A parsed `repeatRule`. Week days are 0 (Sunday) to 6. */
export type RepeatRule =
  | { unit: 'day'; every: number }
  | { unit: 'weekday' }
  | { unit: 'week'; every: number; days?: number[] }
  | { unit: 'month'; every: number; day?: number }
  | { unit: 'year'; every: number };

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Regex source for one weekday word: "tue", "tues", "tuesday", "tuesdays". Shared with capture. */
export const WEEKDAY_WORD =
  '(?:sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)s?';

const WEEKDAY = new RegExp(`^${WEEKDAY_WORD}$`, 'i');

/** "tue", "Tuesday", "tuesdays" as 0–6, or -1 when the word is not a weekday. */
export function weekdayIndex(word: string): number {
  return WEEKDAY.test(word) ? SHORT_DAYS.findIndex((day) => word.toLowerCase().startsWith(day.toLowerCase())) : -1;
}

const ALIASES: Record<string, string> = {
  daily: 'day',
  weekdays: 'weekday',
  weekly: 'week',
  biweekly: '2 weeks',
  monthly: 'month',
  yearly: 'year',
  annually: 'year',
};

const UNITS = { day: 'day', week: 'week', month: 'month', year: 'year' } as const;

/** Read "every tue", "every 2 weeks", "every month on 15", … (and daily/weekly/monthly); null when unknown. */
export function parseRule(text: string | undefined | null): RepeatRule | null {
  const phrase = (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const words = ALIASES[phrase] ?? phrase.replace(/^every /, '');
  const counted = /^(\d{1,3}|other) (day|week|month|year)s?$/.exec(words);
  if (counted) {
    const every = counted[1] === 'other' ? 2 : Number(counted[1]);
    return every >= 1 ? { unit: UNITS[counted[2] as keyof typeof UNITS], every } : null;
  }
  if (words === 'day' || words === 'week' || words === 'month' || words === 'year') return { unit: words, every: 1 };
  if (words === 'weekday' || words === 'weekdays') return { unit: 'weekday' };
  const monthDay = /^month on (?:the )?(\d{1,2})(?:st|nd|rd|th)?$/.exec(words);
  if (monthDay) {
    const day = Number(monthDay[1]);
    return day >= 1 && day <= 31 ? { unit: 'month', every: 1, day } : null;
  }
  const days = words.split(/\s*(?:,|&|\band\b)\s*|\s+/).filter(Boolean).map(weekdayIndex);
  if (days.length === 0 || days.includes(-1)) return null;
  return { unit: 'week', every: 1, days: [...new Set(days)].sort() };
}

const plural = (every: number, unit: string) => (every === 1 ? unit : `${every} ${unit}s`);

/** The canonical `repeatRule` text: "every tue", "every mon, thu", "every 2 weeks", "every month on 15". */
export function formatRule(rule: RepeatRule): string {
  if (rule.unit === 'weekday') return 'every weekday';
  if (rule.unit === 'week' && rule.days) return `every ${rule.days.map((day) => SHORT_DAYS[day].toLowerCase()).join(', ')}`;
  if (rule.unit === 'month' && rule.day) return `every ${plural(rule.every, 'month')} on ${rule.day}`;
  return `every ${plural(rule.every, rule.unit)}`;
}

const ordinal = (day: number) => {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix}`;
};

/** For people: "Every Tue", "Every Mon, Thu", "Every 2 weeks", "Every month on the 15th". */
export function describeRule(rule: RepeatRule): string {
  if (rule.unit === 'week' && rule.days) return `Every ${rule.days.map((day) => SHORT_DAYS[day]).join(', ')}`;
  if (rule.unit === 'month' && rule.day) return `Every ${plural(rule.every, 'month')} on the ${ordinal(rule.day)}`;
  const text = formatRule(rule);
  return text[0].toUpperCase() + text.slice(1);
}

/** `stamp` moved by `months`, landing on `day` (default: its own), clamped to the month's last day. */
function addMonths(stamp: string, months: number, day = Number(stamp.slice(8, 10))): string {
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(5, 7)) - 1 + months;
  const last = new Date(year, month + 1, 0).getDate();
  return formatLocalDate(new Date(year, month, Math.min(day, last)));
}

const weekday = (stamp: string) => parseLocalDate(stamp).getDay();

/** The first day after `from` that matches `test`, looking at most a week ahead. */
function nextMatching(from: string, test: (day: number) => boolean): string {
  let stamp = shiftDate(from, 1);
  for (let step = 0; step < 7 && !test(weekday(stamp)); step += 1) stamp = shiftDate(stamp, 1);
  return stamp;
}

/** The first occurrence strictly after `from` (a YYYY-MM-DD date). */
export function nextOccurrence(rule: RepeatRule, from: string): string {
  const stamp = from.slice(0, 10);
  switch (rule.unit) {
    case 'day':
      return shiftDate(stamp, rule.every);
    case 'weekday':
      return nextMatching(stamp, (day) => day >= 1 && day <= 5);
    case 'week': {
      const { days } = rule;
      return days ? nextMatching(stamp, (day) => days.includes(day)) : shiftDate(stamp, 7 * rule.every);
    }
    case 'month': {
      if (!rule.day) return addMonths(stamp, rule.every);
      const thisMonth = addMonths(stamp, 0, rule.day);
      return thisMonth > stamp ? thisMonth : addMonths(stamp, rule.every, rule.day);
    }
    case 'year':
      return addMonths(stamp, 12 * rule.every);
  }
}

/** Whether the rule fixes its days (weekdays, a day of the month) rather than counting from a start. */
const isFixed = (rule: RepeatRule) =>
  rule.unit === 'weekday' || (rule.unit === 'week' && Boolean(rule.days)) || (rule.unit === 'month' && Boolean(rule.day));

/** The first occurrence on or after `from`: a new repeating task's first due date. */
export function firstOccurrence(rule: RepeatRule, from: string): string {
  const stamp = from.slice(0, 10);
  return isFixed(rule) ? nextOccurrence(rule, shiftDate(stamp, -1)) : stamp;
}

const dayNumber = (stamp: string) => Math.round(Date.UTC(+stamp.slice(0, 4), +stamp.slice(5, 7) - 1, +stamp.slice(8, 10)) / 86_400_000);

const WINDOW = 10;

/**
 * How many of the last ten expected occurrences (up to `today`) were done:
 * "done 9 of the last 10 times". Each completion counts for the nearest
 * occurrence, so doing it a day early or late still counts. Occurrences
 * start from the first recorded completion, never before.
 */
export function completionSummary(completions: readonly string[], rule: RepeatRule, today: string): { done: number; of: number } {
  const dates = [...new Set(completions.map((date) => dayOf(date)).filter((date): date is string => Boolean(date)))]
    .filter((date) => date <= today)
    .sort();
  if (dates.length === 0) return { done: 0, of: 0 };

  // Fixed rules may have been due just before the first completion (done late); counted rules start at it.
  const occurrences: string[] = [];
  let stamp = isFixed(rule) ? nextOccurrence(rule, shiftDate(dates[0], -32)) : dates[0];
  while (stamp < dates[0]) {
    const next = nextOccurrence(rule, stamp);
    if (next > dates[0]) break;
    stamp = next;
  }
  for (; occurrences.length < 5000; stamp = nextOccurrence(rule, stamp)) {
    occurrences.push(stamp);
    if (stamp > today) break;
  }

  const hit = new Set<number>();
  let firstHit = Infinity;
  for (const date of dates) {
    let nearest = 0;
    for (let index = 1; index < occurrences.length; index += 1) {
      const gap = Math.abs(dayNumber(occurrences[index]) - dayNumber(date));
      if (gap < Math.abs(dayNumber(occurrences[nearest]) - dayNumber(date))) nearest = index;
    }
    hit.add(nearest);
    firstHit = Math.min(firstHit, nearest);
  }

  // Today's occurrence counts once it is done; until then it is not missed.
  const due = occurrences
    .map((_, index) => index)
    .filter((index) => index >= firstHit && (occurrences[index] < today || (occurrences[index] === today && hit.has(index))));
  const counted = due.slice(-WINDOW);
  return { done: counted.filter((index) => hit.has(index)).length, of: counted.length };
}
