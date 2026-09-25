import { addDays } from 'date-fns';
import { formatLocalDate, nextMonday } from './date';
import { firstOccurrence, parseRule, ruleText, WEEKDAY_WORD, weekdayIndex } from './recurrence';

const nextWeekday = (word: string, now: Date) => addDays(now, ((weekdayIndex(word) - now.getDay() + 6) % 7) + 1);

const SHORT_DAY = '(?:sun|mon|tues?|wed|thu|thurs?|fri|sat)';
// Syntax that may follow a date at the end: `fri #home !`.
const AT_END = '(?=\\s*(?:[#!]\\S*\\s*)*$)';
const TIME_AFTER = '(?=\\s+(?:at\\s+\\d{1,2}(?::\\d{2})?|\\d{1,2}(?::\\d{2})?\\s*[ap]m)\\b)';

// Date words count only as whole words ("today's news" is not a date), and a
// weekday means its next occurrence, never today. Full weekday names count
// anywhere. Short forms are ordinary words too ("sun cream", "sat with Joe"),
// so they count only after a date connector, before a time, or at the end.
const DATE_PATTERNS: Array<[RegExp, (match: RegExpMatchArray, now: Date) => Date]> = [
  [/\s(today)(?=\s)/i, (_, now) => now],
  [/\s(tomorrow)(?=\s)/i, (_, now) => addDays(now, 1)],
  [/\s(next week)(?=\s)/i, (_, now) => nextMonday(now)],
  [/\sin (\d{1,3}) (days?|weeks?)(?=\s)/i, (match, now) => addDays(now, Number(match[1]) * (/^w/i.test(match[2]) ? 7 : 1))],
  [/\s(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?=\s)/i, (match, now) => nextWeekday(match[1], now)],
  ...[`(?<=\\s(?:on|by|this|next|due))\\s(${SHORT_DAY})(?=\\s)`, `\\s(${SHORT_DAY})${TIME_AFTER}`, `\\s(${SHORT_DAY})${AT_END}`].map(
    (source): [RegExp, (match: RegExpMatchArray, now: Date) => Date] => [new RegExp(source, 'i'), (match, now) => nextWeekday(match[1], now)],
  ),
];

const REPEAT = new RegExp(
  `\\s(every\\s+(?:(?:\\d{1,3}|other)\\s+(?:day|week|month|year)s?|weekdays?|day|week|month(?:\\s+on\\s+(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?)?|year|${WEEKDAY_WORD}(?:\\s*(?:,|&|and)\\s*${WEEKDAY_WORD})*))(?=\\s)`,
  'i',
);

// Words that only introduced the date just removed: "Dentist on friday" → "Dentist".
const DANGLING = /(?:\s+(?:on|by|at|due|this|next))+\s*$/i;
const EXPLICIT_DATE = /(?:📅️?\s*|(?:^|\s)due:)\d{4}-\d{2}-\d{2}/u;

/**
 * The line a capture adds to a note. Text starting with `[ ]`, carrying a
 * date ("tomorrow", "fri", "in 3 days", `📅 2026-10-01`, `due:2026-10-01`), a
 * repeat ("every tue"), or `!` becomes a task in Obsidian Tasks form:
 * `- [ ] Call Sam ⏫ 🔁 every week on Tuesday 📅 2026-09-29`. Anything else
 * becomes a plain list item. Tags and other words stay as typed.
 */
export function captureLine(input: string, now = new Date()): string {
  let text = input.replace(/\s+/g, ' ').trim().replace(/^[-*+]\s+(?=\S)/, '');
  const checkbox = /^\[[ xX]?\]\s*/.exec(text);
  if (checkbox) text = text.slice(checkbox[0].length);
  let line = ` ${text} `;
  const take = (pattern: RegExp) => {
    const match = line.match(pattern);
    if (match?.index !== undefined) line = `${line.slice(0, match.index).replace(DANGLING, '')} ${line.slice(match.index + match[0].length)}`;
    return match;
  };

  const flagged = Boolean(take(/\s!(?=\s)/));
  let due: string | undefined;
  let repeat: string | undefined;
  const rule = parseRule(take(REPEAT)?.[1]);
  if (rule) {
    repeat = ruleText(rule);
    if (!EXPLICIT_DATE.test(line)) due = firstOccurrence(rule, formatLocalDate(now));
  }
  for (const [pattern, resolve] of rule || EXPLICIT_DATE.test(line) ? [] : DATE_PATTERNS) {
    const match = take(pattern);
    if (match) {
      due = formatLocalDate(resolve(match, now));
      break;
    }
  }

  const task = Boolean(checkbox || flagged || due || repeat || EXPLICIT_DATE.test(line));
  if (!task) return `- ${text}`;
  const tokens = [flagged ? '⏫' : '', repeat ? `🔁 ${repeat}` : '', due ? `📅 ${due}` : ''].filter(Boolean);
  return `- [ ] ${[line.replace(/\s+/g, ' ').trim() || text, ...tokens].join(' ')}`;
}
