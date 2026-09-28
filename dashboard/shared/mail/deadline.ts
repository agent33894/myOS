import { addDays } from 'date-fns';
import { formatLocalDate } from '../date';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const WEEKDAY = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|rsday|urday|sday)?';
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?';
const YEAR = '(?:,?\\s+(\\d{4}))?';

// A date counts as a deadline only after words that make it one: "by Friday",
// "due Oct 3", "expires 10/14", "RSVP by tomorrow". "Order placed Oct 3" is not.
const CUE =
  '(?:\\bby|\\bbefore|\\bdue(?:\\s+(?:on|by|date))?:?|\\buntil|\\bdeadline(?:\\s+is)?:?|\\bexpires?(?:\\s+on)?|\\bexpiring(?:\\s+on)?|\\bno later than|\\bends?(?:\\s+on)?|\\brsvp(?:\\s+by)?)';
const GAP = '\\s+(?:(?:this|next|on|the|end of)\\s+)?';

const PATTERNS: Array<[RegExp, (match: RegExpExecArray, base: Date) => Date | null]> = [
  [new RegExp(`${CUE}${GAP}(today|tonight|eod|end of (?:the )?day|close of business|cob)\\b`, 'gi'), (_, base) => base],
  [new RegExp(`${CUE}${GAP}(tomorrow)\\b`, 'gi'), (_, base) => addDays(base, 1)],
  [new RegExp(`${CUE}${GAP}(?:the\\s+)?end of (?:the )?week\\b`, 'gi'), (_, base) => addDays(base, (5 - base.getDay() + 7) % 7)],
  [
    new RegExp(`${CUE}${GAP}${WEEKDAY}\\b`, 'gi'),
    (match, base) => {
      const index = WEEKDAYS.findIndex((day) => day.startsWith(match[1].toLowerCase().slice(0, 3)));
      return index < 0 ? null : addDays(base, (index - base.getDay() + 7) % 7);
    },
  ],
  [
    new RegExp(`${CUE}${GAP}(?:${WEEKDAY},?\\s+)?${MONTH}\\s+${DAY}${YEAR}\\b`, 'gi'),
    (match, base) => monthDay(base, match[2], Number(match[3]), match[4]),
  ],
  [
    new RegExp(`${CUE}${GAP}${DAY}\\s+(?:of\\s+)?${MONTH}${YEAR}\\b`, 'gi'),
    (match, base) => monthDay(base, match[2], Number(match[1]), match[3]),
  ],
  [
    new RegExp(`${CUE}${GAP}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b`, 'gi'),
    (match, base) => {
      const month = Number(match[1]) - 1;
      const day = Number(match[2]);
      const year = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : undefined;
      return calendarDate(base, month, day, year);
    },
  ],
  [
    new RegExp(`${CUE}${GAP}(\\d{4})-(\\d{2})-(\\d{2})\\b`, 'gi'),
    (match, base) => calendarDate(base, Number(match[2]) - 1, Number(match[3]), Number(match[1])),
  ],
];

function monthDay(base: Date, monthWord: string, day: number, year?: string): Date | null {
  const month = MONTHS.indexOf(monthWord.toLowerCase().slice(0, 3));
  return month < 0 ? null : calendarDate(base, month, day, year ? Number(year) : undefined);
}

/** A real calendar date; without a year, the next one on or after `base` (allowing a month's slack for late mail). */
function calendarDate(base: Date, month: number, day: number, year?: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const make = (y: number) => {
    const date = new Date(y, month, day);
    return date.getMonth() === month ? date : null;
  };
  if (year !== undefined) return make(year);
  const thisYear = make(base.getFullYear());
  if (thisYear && thisYear >= addDays(base, -31)) return thisYear;
  return make(base.getFullYear() + 1);
}

/**
 * The earliest deadline a message states, as YYYY-MM-DD, anchored to when it
 * was sent ("by Friday" means the Friday after the message, not after today).
 */
export function findDeadline(text: string, sent: Date): string | undefined {
  const base = new Date(sent.getFullYear(), sent.getMonth(), sent.getDate());
  const found: Date[] = [];
  for (const [pattern, toDate] of PATTERNS) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const date = toDate(match, base);
      if (date && date >= base) found.push(date);
    }
  }
  if (found.length === 0) return undefined;
  return formatLocalDate(found.reduce((earliest, date) => (date < earliest ? date : earliest)));
}
