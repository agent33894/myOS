import { dayNumber, shiftDate } from '../date';
import { nextOccurrence, parseRule } from '../recurrence';
import { BLOCK_ID, bodyLines, DATE_EMOJI, parseTaskLine, PLAIN_DUE, TASK_LINE, type Task, type TaskDateField } from './parse';

/*
 * Every edit here takes the whole file and returns the whole file with only
 * the target line changed (and, for a repeating task, one new line above it).
 * Each returns null when `line` no longer reads `expected`, so a stale edit
 * never lands on the wrong line.
 */

interface Target {
  lines: string[];
  index: number;
  /** The line without its `\r`. */
  text: string;
  eol: '' | '\r';
  task: Task;
}

function target(raw: string, line: number, expected: string): Target | null {
  const entry = bodyLines(raw)[line - 1];
  if (!entry?.checkable) return null;
  const eol = entry.line.endsWith('\r') ? '\r' : '';
  const text = eol ? entry.line.slice(0, -1) : entry.line;
  const task = text === expected ? parseTaskLine(text) : null;
  return task ? { lines: raw.split('\n'), index: line - 1, text, eol, task } : null;
}

const withStatus = (line: string, status: string) => line.replace(TASK_LINE, (_, open: string, _status: string, close: string, body: string) => `${open}${status}${close}${body}`);

const tokenPattern = (emoji: string) => new RegExp(`\\s*${emoji}\\uFE0F?\\s*(\\d{4}-\\d{2}-\\d{2})`, 'u');

/** Add ` token` at the end, before a trailing `^block-id`. */
function append(line: string, token: string): string {
  const block = BLOCK_ID.exec(line);
  const head = (block ? line.slice(0, block.index) : line).trimEnd();
  return `${head} ${token}${block ? block[0] : ''}`;
}

/** Add a date token before the ✅/❌ tokens (the order Obsidian Tasks writes), else at the end. */
function insertDate(line: string, token: string): string {
  const closing = /\s*(?:✅|❌)️?\s*\d{4}-\d{2}-\d{2}/u.exec(line);
  if (!closing) return append(line, token);
  return `${line.slice(0, closing.index).trimEnd()} ${token}${line.slice(closing.index)}`;
}

function setDateOn(line: string, field: TaskDateField, date: string | null): string {
  const emoji = DATE_EMOJI[field];
  const token = tokenPattern(emoji);
  if (token.test(line)) return line.replace(token, (match, old: string) => (date ? match.replace(old, date) : ''));
  if (field === 'due' && PLAIN_DUE.test(line)) {
    return line.replace(PLAIN_DUE, (_, lead: string) => (date ? `${lead}due:${date}` : '')).replace(/\s+$/, '');
  }
  return date ? insertDate(line, `${emoji} ${date}`) : line;
}

/**
 * The next occurrence of a repeating task, as Obsidian Tasks writes it: the
 * same line, unchecked, with every date moved by the step from its reference
 * date (due, else scheduled, else start; today for "when done") to the next
 * occurrence. Without dates the copy has none. Null for a rule it can't read.
 */
function nextRecurrence(line: string, task: Task, today: string): string | null {
  const whenDone = /\bwhen done$/i.test(task.recurrence ?? '');
  const rule = parseRule(task.recurrence?.replace(/\s*when done$/i, ''));
  if (!rule) return null;
  let next = withStatus(line, ' ').replace(tokenPattern(DATE_EMOJI.done), '').replace(tokenPattern('❌'), '').replace(BLOCK_ID, '');
  const reference = task.due ?? task.scheduled ?? task.start;
  if (reference) {
    const step = dayNumber(nextOccurrence(rule, whenDone ? today : reference)) - dayNumber(reference);
    for (const field of ['due', 'scheduled', 'start'] as const) {
      const date = task[field];
      if (date) next = setDateOn(next, field, shiftDate(date, step));
    }
  }
  return next;
}

/**
 * Check or uncheck a task line. Checking writes `[x]` and ` ✅ today`; a
 * repeating task also gets its next occurrence on a new line directly above.
 * Unchecking writes `[ ]` and removes the ✅ (and ❌) date.
 */
export function toggleTaskLine(raw: string, line: number, expected: string, today: string): string | null {
  const found = target(raw, line, expected);
  if (!found) return null;
  const { lines, index, text, eol, task } = found;
  if (task.status !== 'open') {
    lines[index] = withStatus(text, ' ').replace(tokenPattern(DATE_EMOJI.done), '').replace(tokenPattern('❌'), '') + eol;
    return lines.join('\n');
  }
  lines[index] = append(withStatus(text, 'x'), `${DATE_EMOJI.done} ${today}`) + eol;
  const next = task.recurrence ? nextRecurrence(text, task, today) : null;
  if (next !== null) lines.splice(index, 0, next + eol);
  return lines.join('\n');
}

/** Set, change, or (with null) remove the due, scheduled, or start date. A plain `due:` stays plain. */
export function setTaskDate(raw: string, line: number, expected: string, field: TaskDateField, date: string | null): string | null {
  const found = target(raw, line, expected);
  if (!found) return null;
  found.lines[found.index] = setDateOn(found.text, field, date) + found.eol;
  return found.lines.join('\n');
}

/** Replace everything after the checkbox with `text` (one line). */
export function setTaskText(raw: string, line: number, expected: string, text: string): string | null {
  const found = target(raw, line, expected);
  if (!found || /[\r\n]/.test(text) || !text.trim()) return null;
  found.lines[found.index] = found.text.replace(TASK_LINE, (_, open: string, status: string, close: string) => `${open}${status}${close}${text.trim()}`) + found.eol;
  return found.lines.join('\n');
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

/**
 * `raw` with `line` added: at the end, or at the end of the section under
 * `heading` ("Log" matches any level; "## Log" only that one). A missing
 * heading is added at the end. `raw` null means the file does not exist yet.
 */
export function appendLine(raw: string | null, line: string, heading?: string): string {
  const text = raw ?? '';
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const wanted = heading?.trim();
  if (!wanted) {
    if (!text) return `${line}${eol}`;
    return /\n$/.test(text) ? `${text}${line}${eol}` : `${text}${eol}${line}${eol}`;
  }
  const lines = bodyLines(text);
  const plain = wanted.replace(/^#+\s*/, '').toLowerCase();
  const level = /^#+/.exec(wanted)?.[0].length;
  const matches = (entry: { line: string; checkable: boolean }) => {
    const match = entry.checkable ? HEADING.exec(entry.line.replace(/\r$/, '')) : null;
    return match && match[2].toLowerCase() === plain && (!level || match[1].length === level) ? match[1].length : 0;
  };
  const start = lines.findIndex((entry) => matches(entry) > 0);
  if (start < 0) {
    const headingLine = level ? wanted : `## ${wanted}`;
    const lead = !text ? '' : /\n\s*\n$/.test(text) ? '' : /\n$/.test(text) ? eol : `${eol}${eol}`;
    return `${text}${lead}${headingLine}${eol}${line}${eol}`;
  }
  const depth = matches(lines[start]);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].checkable ? HEADING.exec(lines[index].line.replace(/\r$/, '')) : null;
    if (match && match[1].length <= depth) {
      end = index;
      break;
    }
  }
  let at = end;
  while (at > start + 1 && !lines[at - 1].line.trim()) at -= 1;
  const all = text.split('\n');
  const lineEol = eol === '\r\n' ? '\r' : '';
  // The last line of a file without a final newline gains one before the new line.
  if (at === all.length) {
    return `${text}${eol}${line}`;
  }
  all.splice(at, 0, line + lineEol);
  return all.join('\n');
}
