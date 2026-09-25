import { formatLocalDate, parseLocalDate, shiftDate } from './date';

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
  const monthDay = /^(?:(\d{1,3}) months? |month )on (?:the )?(\d{1,2})(?:st|nd|rd|th)?$/.exec(words);
  if (monthDay) {
    const every = Number(monthDay[1] ?? 1);
    const day = Number(monthDay[2]);
    return every >= 1 && day >= 1 && day <= 31 ? { unit: 'month', every, day } : null;
  }
  const days = words.replace(/^week on /, '').split(/\s*(?:,|&|\band\b)\s*|\s+/).filter(Boolean).map(weekdayIndex);
  if (days.length === 0 || days.includes(-1)) return null;
  return { unit: 'week', every: 1, days: [...new Set(days)].sort() };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ordinal = (day: number) => {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix}`;
};

/** The rule as Obsidian Tasks writes it after `🔁`: "every week on Tuesday", "every month on the 15th". */
export function ruleText(rule: RepeatRule): string {
  if (rule.unit === 'weekday') return 'every weekday';
  if (rule.unit === 'week' && rule.days) return `every week on ${rule.days.map((day) => DAY_NAMES[day]).join(', ')}`;
  const every = rule.every === 1 ? rule.unit : `${rule.every} ${rule.unit}s`;
  return rule.unit === 'month' && rule.day ? `every ${every} on the ${ordinal(rule.day)}` : `every ${every}`;
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
