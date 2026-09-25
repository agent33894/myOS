import { addDays } from 'date-fns';
import { formatLocalDate, nextMonday } from './date';
import { firstOccurrence, formatRule, parseRule, WEEKDAY_WORD, weekdayIndex } from './recurrence';
import { ArtifactType, type ArtifactDraft, type ArtifactFields, type Domain, type TodoPriority } from './types';

type InboxItem = Pick<ArtifactFields, 'type' | 'status' | 'created' | 'updated'>;

const SETTLED = new Set(['archived', 'done', 'cancelled']);

/** Captures waiting to be sorted, newest first. */
export function selectInbox<T extends InboxItem>(artifacts: readonly T[]): T[] {
  return artifacts
    .filter((artifact) => artifact.type === 'inbox' && !SETTLED.has(artifact.status))
    .sort((a, b) => b.created.localeCompare(a.created) || b.updated.localeCompare(a.updated));
}

type ProjectLike = Pick<ArtifactFields, 'id' | 'title'>;

export interface ParsedCapture<P extends ProjectLike = ProjectLike> {
  title: string;
  /** Lines after the first; empty for one-line captures. */
  body: string;
  due?: string;
  /** Canonical `repeatRule` text ("every tue"); `due` is then its first occurrence. */
  repeatRule?: string;
  estimatedMinutes?: number;
  flagged: boolean;
  priority?: TodoPriority;
  tags: string[];
  /** The project an `@name` matched; an unmatched `@name` stays in the title. */
  project?: P;
  /** The first `@name` that matched no project, so the UI can say so. */
  unknownRef?: string;
  /** Anything with a date, repeat, estimate, flag, priority, or project is a task; the rest waits in the Inbox. */
  kind: 'task' | 'capture';
}

const nextWeekday = (word: string, now: Date) => addDays(now, ((weekdayIndex(word) - now.getDay() + 6) % 7) + 1);

const SHORT_DAY = '(?:sun|mon|tues?|wed|thu|thurs?|fri|sat)';
// Syntax that may follow a date at the end: `fri @fam`, `fri #home !`.
const AT_END = '(?=\\s*(?:[@#!~]\\S*\\s*)*$)';
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
    (source): [RegExp, (match: RegExpMatchArray, now: Date) => Date] => [
      new RegExp(source, 'i'),
      (match, now) => nextWeekday(match[1], now),
    ],
  ),
];

const REPEAT = new RegExp(
  `\\s(every\\s+(?:(?:\\d{1,3}|other)\\s+(?:day|week|month|year)s?|weekdays?|day|week|month(?:\\s+on\\s+(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?)?|year|${WEEKDAY_WORD}(?:\\s*(?:,|&|and)\\s*${WEEKDAY_WORD})*))(?=\\s)`,
  'i',
);

const ESTIMATE = /\s~(?:(\d+(?:\.\d+)?)\s*h(?:rs?)?)?(?:(\d+)\s*m(?:ins?)?)?(?=\s)/i;

const TAG = /\s#([\w-]+)(?=\s)/g;

// Words that only introduced the date just removed: "Dentist on friday" → "Dentist".
const DANGLING = /(?:\s+(?:on|by|at|due|this|next))+\s*$/i;

/**
 * Parse Quick Capture's optional inline syntax from the first line. `@name`
 * files into a project only when `projects` has a match (see `matchProject`).
 */
export function parseCapture<P extends ProjectLike>(
  text: string,
  projects: readonly P[] = [],
  now = new Date(),
): ParsedCapture<P> {
  const [firstLine = '', ...rest] = text.trim().split('\n');
  let line = ` ${firstLine} `;
  const take = (pattern: RegExp, trimConnector = false) => {
    const match = line.match(pattern);
    if (match?.index !== undefined) {
      const before = line.slice(0, match.index);
      line = `${trimConnector ? before.replace(DANGLING, '') : before} ${line.slice(match.index + match[0].length)}`;
    }
    return match;
  };

  const tags = [...line.matchAll(TAG)].map((match) => match[1].toLowerCase());
  line = line.replace(TAG, ' ');
  let project: P | undefined;
  let unknownRef: string | undefined;
  for (const [token, ref] of line.matchAll(/\s@([\w-]+)(?=\s)/g)) {
    const found = matchProject(ref, projects);
    if (found && !project) {
      project = found;
      line = line.replace(token, ' ');
    } else if (!found) {
      unknownRef ??= ref;
    }
  }
  const priority = take(/\s!(high|medium|low)(?=\s)/i)?.[1].toLowerCase() as TodoPriority | undefined;
  const flagged = Boolean(take(/\s!(?=\s)/));
  const estimate = line.match(ESTIMATE);
  const estimatedMinutes =
    estimate && (estimate[1] || estimate[2]) ? Math.round(Number(estimate[1] ?? 0) * 60 + Number(estimate[2] ?? 0)) : undefined;
  if (estimatedMinutes) take(ESTIMATE);

  let due: string | undefined;
  const rule = parseRule(take(REPEAT, true)?.[1]);
  const repeatRule = rule ? formatRule(rule) : undefined;
  if (rule) due = firstOccurrence(rule, formatLocalDate(now));
  for (const [pattern, resolve] of rule ? [] : DATE_PATTERNS) {
    const match = take(pattern, true);
    if (match) {
      due = formatLocalDate(resolve(match, now));
      break;
    }
  }

  const title = line.replace(/\s+/g, ' ').trim() || firstLine.trim() || 'Untitled capture';
  const kind = due || flagged || priority || project || estimatedMinutes ? 'task' : 'capture';
  return { title, body: rest.join('\n').trim(), due, repeatRule, estimatedMinutes, flagged, priority, tags, project, unknownRef, kind };
}

export interface Suggestion {
  trigger: '@' | '#';
  /** What follows the trigger so far. */
  query: string;
  /** The token's range in the text, trigger included, for replacing it with the pick. */
  start: number;
  end: number;
}

/** The `@project` or `#tag` being typed at `caret`, for autocomplete; null when the caret is elsewhere. */
export function suggest(text: string, caret: number): Suggestion | null {
  const match = /(?:^|\s)([@#])([\w-]*)$/.exec(text.slice(0, caret));
  if (!match) return null;
  const tail = /^[\w-]*/.exec(text.slice(caret))?.[0] ?? '';
  return { trigger: match[1] as '@' | '#', query: match[2], start: caret - match[2].length - 1, end: caret + tail.length };
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** `@kitch` finds "Kitchen renovation": an exact id or title first, then a prefix. */
export function matchProject<P extends ProjectLike>(ref: string, projects: readonly P[]): P | undefined {
  const wanted = slug(ref);
  if (!wanted) return undefined;
  return (
    projects.find((project) => project.id === ref || slug(project.title) === wanted) ??
    projects.find((project) => slug(project.title).startsWith(wanted) || project.id.startsWith(wanted))
  );
}

/**
 * The file a capture becomes: a task when it carries a date, repeat, estimate,
 * flag, priority, or project, otherwise an Inbox item. `domain` is the area
 * to use when the project has none.
 */
export function captureDraft(parsed: ParsedCapture, domain?: Domain): ArtifactDraft {
  return {
    type: parsed.kind === 'task' ? ArtifactType.TODO : ArtifactType.INBOX,
    title: parsed.title,
    content: parsed.body,
    tags: parsed.tags,
    due: parsed.due,
    flagged: parsed.flagged || undefined,
    priority: parsed.priority,
    project: parsed.project?.id,
    repeatRule: parsed.repeatRule,
    estimatedMinutes: parsed.estimatedMinutes,
    domain: parsed.kind === 'task' ? domain : undefined,
  };
}
