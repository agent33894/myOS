import { isTodoFile, tagsIn, type Properties } from '../spec';

export type TaskStatus = 'open' | 'done' | 'cancelled';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type TaskDateField = 'due' | 'scheduled' | 'start';

/** A checkbox line in a note, or a whole file with `type: todo` (line 0). */
export interface Task {
  path: string;
  /** 1-based line in the whole file, frontmatter included; 0 for a `type: todo` file. */
  line: number;
  /** The line exactly as written, without its line ending; empty for a file task. Edits check it first. */
  raw: string;
  /** The description: the line without checkbox, dates, repeat, priority, or block id. Tags stay. */
  text: string;
  status: TaskStatus;
  due?: string;
  scheduled?: string;
  start?: string;
  /** The ✅ date. */
  done?: string;
  /** The text after 🔁, e.g. "every week on Tuesday". */
  recurrence?: string;
  priority?: Priority;
  tags: string[];
}

/** `- [ ] text`, `* [x] text`, `1. [ ] text`, at any depth. */
export const TASK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)(.)(\]\s+)(.*)$/u;
const FENCE = /^\s*(`{3,}|~{3,})/;
const FRONTMATTER_OPEN = /^\uFEFF?---\s*$/;

export const DATE_EMOJI: Record<TaskDateField | 'done', string> = { due: '📅', scheduled: '⏳', start: '🛫', done: '✅' };
const FIELD_OF: Record<string, keyof Task | null> = { '📅': 'due', '⏳': 'scheduled', '🛫': 'start', '✅': 'done', '➕': null, '❌': null };
const DATE_TOKEN = /\s*(📅|⏳|🛫|✅|➕|❌)️?\s*(\d{4}-\d{2}-\d{2})/gu;
export const PLAIN_DUE = /(^|\s)due:(\d{4}-\d{2}-\d{2})(?=\s|$)/;
const RECURRENCE = /\s*🔁️?\s*([a-zA-Z0-9, ]*[a-zA-Z0-9])/u;
const PRIORITY_TOKEN = /\s*(🔺|⏫|🔼|🔽|⏬)️?/gu;
export const BLOCK_ID = /\s+\^[\w-]+\s*$/;

const PRIORITIES: Record<string, Priority> = { '🔺': 'highest', '⏫': 'high', '🔼': 'medium', '🔽': 'low', '⏬': 'lowest' };

/** Sort rank: no priority sits between medium and low, as in Obsidian Tasks. */
export const PRIORITY_RANK: Record<Priority | 'none', number> = { highest: 0, high: 1, medium: 2, none: 3, low: 4, lowest: 5 };

const STATUS: Record<string, TaskStatus> = { x: 'done', X: 'done', '-': 'cancelled' };

/** The task on one line (without its line ending), or null when it is not a checkbox with text. */
export function parseTaskLine(raw: string, path = '', line = 0): Task | null {
  const match = TASK_LINE.exec(raw);
  if (!match || !match[4].trim()) return null;
  const task: Task = { path, line, raw, text: '', status: STATUS[match[2]] ?? 'open', tags: [] };
  let body = match[4].replace(BLOCK_ID, '');
  const plainDue = PLAIN_DUE.exec(body);
  if (plainDue) body = body.replace(PLAIN_DUE, '$1');
  body = body.replace(DATE_TOKEN, (_, emoji: string, date: string) => {
    const field = FIELD_OF[emoji];
    if (field) (task as unknown as Record<string, string>)[field] ??= date;
    return ' ';
  });
  body = body.replace(PRIORITY_TOKEN, (_, emoji: string) => {
    task.priority ??= PRIORITIES[emoji];
    return ' ';
  });
  body = body.replace(RECURRENCE, (_, rule: string) => {
    task.recurrence = rule.trim();
    return ' ';
  });
  if (!task.due && plainDue) task.due = plainDue[2];
  task.text = body.replace(/\s+/g, ' ').trim();
  task.tags = tagsIn(task.text);
  return task;
}

/**
 * Each line of `raw` (a whole file, split on `\n`, `\r` kept) and whether it
 * is body text outside code fences, where task lines count.
 */
export function bodyLines(raw: string): Array<{ line: string; checkable: boolean }> {
  const lines = raw.split('\n');
  let frontmatterEnd = -1;
  if (FRONTMATTER_OPEN.test(lines[0]?.replace(/\r$/, '') ?? '')) {
    frontmatterEnd = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
  }
  let fence: string | null = null;
  return lines.map((line, index) => {
    if (index <= frontmatterEnd) return { line, checkable: false };
    const marker = FENCE.exec(line)?.[1];
    if (marker && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence === null ? marker : null;
      return { line, checkable: false };
    }
    return { line, checkable: fence === null };
  });
}

/** Every task line in a file's text, in order. */
export function extractTasks(raw: string, path: string): Task[] {
  const tasks: Task[] = [];
  bodyLines(raw).forEach(({ line, checkable }, index) => {
    const task = checkable ? parseTaskLine(line.replace(/\r$/, ''), path, index + 1) : null;
    if (task) tasks.push(task);
  });
  return tasks;
}

const dateProperty = (properties: Properties, ...keys: string[]) => {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  }
  return undefined;
};

/** A `type: todo` file as a task: done is `status: done`. */
export function fileTask(path: string, title: string, properties: Properties, tags: string[]): Task | null {
  if (!isTodoFile(properties)) return null;
  const status = String(properties.status ?? '').toLowerCase();
  const priority = String(properties.priority ?? '').toLowerCase();
  const task: Task = {
    path,
    line: 0,
    raw: '',
    text: title,
    status: status === 'done' ? 'done' : status === 'cancelled' ? 'cancelled' : 'open',
    due: dateProperty(properties, 'due'),
    scheduled: dateProperty(properties, 'scheduled', 'planned'),
    start: dateProperty(properties, 'start', 'deferDate'),
    done: dateProperty(properties, 'completedDate', 'completed'),
    tags,
  };
  if (priority in PRIORITY_RANK && priority !== 'none') task.priority = priority as Priority;
  for (const key of ['due', 'scheduled', 'start', 'done'] as const) if (task[key] === undefined) delete task[key];
  return task;
}
