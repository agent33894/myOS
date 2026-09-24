import { addDays } from 'date-fns';
import { formatLocalDate } from './date';
import { ArtifactType, type ArtifactDraft, type ArtifactFields, type TodoPriority } from './types';

type InboxItem = Pick<ArtifactFields, 'type' | 'status' | 'created' | 'updated'>;

const SETTLED = new Set(['archived', 'done', 'cancelled']);

/** Captures waiting to be sorted, newest first. */
export function selectInbox<T extends InboxItem>(artifacts: readonly T[]): T[] {
  return artifacts
    .filter((artifact) => artifact.type === 'inbox' && !SETTLED.has(artifact.status))
    .sort((a, b) => b.created.localeCompare(a.created) || b.updated.localeCompare(a.updated));
}

export interface ParsedCapture {
  title: string;
  /** Lines after the first; empty for one-line captures. */
  body: string;
  due?: string;
  flagged: boolean;
  priority?: TodoPriority;
  tags: string[];
  /** The token after `@`, matched to a project by `captureDraft`. */
  projectRef?: string;
  /** Anything with a date, flag, priority, or project is a task; the rest waits in the Inbox. */
  kind: 'task' | 'capture';
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const nextWeekday = (match: RegExpMatchArray, now: Date) => {
  const target = WEEKDAYS.indexOf(match[1].slice(0, 3).toLowerCase());
  return addDays(now, ((target - now.getDay() + 6) % 7) + 1);
};

// Date words count only as whole words ("today's news" is not a date).
// Weekdays mean their next occurrence, never today; the short forms ("sun",
// "sat", "wed") are ordinary words too, so they only count at the end.
const DATE_PATTERNS: Array<[RegExp, (match: RegExpMatchArray, now: Date) => Date]> = [
  [/\s(today)(?=\s)/i, (_, now) => now],
  [/\s(tomorrow)(?=\s)/i, (_, now) => addDays(now, 1)],
  [/\s(next week)(?=\s)/i, (_, now) => addDays(now, 7)],
  [/\sin (\d{1,3}) days?(?=\s)/i, (match, now) => addDays(now, Number(match[1]))],
  [/\s(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?=\s)/i, nextWeekday],
  [/\s(sun|mon|tues?|wed|thu|thurs?|fri|sat)\s*$/i, nextWeekday],
];

const TAG = /\s#([\w-]+)(?=\s)/g;

/** Parse Quick Capture's optional inline syntax from the first line. */
export function parseCapture(text: string, now = new Date()): ParsedCapture {
  const [firstLine = '', ...rest] = text.trim().split('\n');
  let line = ` ${firstLine} `;
  const take = (pattern: RegExp) => {
    const match = line.match(pattern);
    if (match) line = line.replace(pattern, ' ');
    return match;
  };

  const tags = [...line.matchAll(TAG)].map((match) => match[1].toLowerCase());
  line = line.replace(TAG, ' ');
  const projectRef = take(/\s@([\w-]+)(?=\s)/)?.[1];
  const priority = take(/\s!(high|medium|low)(?=\s)/i)?.[1].toLowerCase() as TodoPriority | undefined;
  const flagged = Boolean(take(/\s!(?=\s)/));

  let due: string | undefined;
  for (const [pattern, resolve] of DATE_PATTERNS) {
    const match = take(pattern);
    if (match) {
      due = formatLocalDate(resolve(match, now));
      break;
    }
  }

  const title = line.replace(/\s+/g, ' ').trim() || firstLine.trim() || 'Untitled capture';
  const kind = due || flagged || priority || projectRef ? 'task' : 'capture';
  return { title, body: rest.join('\n').trim(), due, flagged, priority, tags, projectRef, kind };
}

type ProjectLike = Pick<ArtifactFields, 'id' | 'title'>;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * The file a capture becomes: a task when it carries a date, flag, priority,
 * or project, otherwise an Inbox item. `@launch-plan` matches a project
 * titled "Launch plan" or with that id.
 */
export function captureDraft(text: string, projects: readonly ProjectLike[], now = new Date()): ArtifactDraft {
  const parsed = parseCapture(text, now);
  const ref = parsed.projectRef;
  const project = ref && projects.find((candidate) => candidate.id === ref || slug(candidate.title) === slug(ref));
  return {
    type: parsed.kind === 'task' ? ArtifactType.TODO : ArtifactType.INBOX,
    title: parsed.title,
    content: parsed.body,
    tags: parsed.tags,
    due: parsed.due,
    flagged: parsed.flagged || undefined,
    priority: parsed.priority,
    project: project ? project.id : ref,
  };
}
