import { shiftDate } from './date';
import type { NoteSummary } from './spec';
import { PRIORITY_RANK, type Task } from './tasks';

/*
 * Views: one line of text such as `open due<=today #work sort:due`, run over
 * the notes and task lines in the folder. Terms are ANDed; `-` in front of a
 * filter negates it. The same syntax powers the Tasks screen, pinned views,
 * fenced ```tasks / ```notes blocks, and `myos-next tasks`.
 */

export type ViewKind = 'tasks' | 'notes';
type Op = '<' | '<=' | '=' | '>=' | '>';
type DateField = 'due' | 'scheduled' | 'start' | 'done';
type Sort = 'due' | 'priority' | 'file' | 'title' | 'modified';
type Group = 'file' | 'folder' | 'tag' | 'date';

type Term =
  | { type: 'status'; status: 'open' | 'done' }
  | { type: 'overdue' }
  | { type: 'date'; field: DateField; op: Op; date: string | null }
  | { type: 'tag'; tag: string }
  | { type: 'path'; prefix: string }
  | { type: 'file'; text: string }
  | { type: 'word'; text: string };

export interface Query {
  terms: Array<Term & { negate: boolean }>;
  sort?: Sort;
  group?: Group;
  limit?: number;
  /** One plain sentence per term that could not be used; those terms are left out. */
  errors: string[];
}

/** The note fields a view reads; `NoteSummary` has them all. */
export type ViewNote = Pick<NoteSummary, 'path' | 'title' | 'tags' | 'tasks' | 'searchText' | 'modified'>;

export interface ViewGroup<T> {
  /** File or folder path, tag, or date (`overdue`, `YYYY-MM-DD`, `none`); empty when not grouped. */
  key: string;
  label: string;
  items: T[];
}

export type ViewResult =
  | { kind: 'tasks'; groups: ViewGroup<Task>[]; total: number; errors: string[] }
  | { kind: 'notes'; groups: ViewGroup<ViewNote>[]; total: number; errors: string[] };

const TASK_SORTS: readonly Sort[] = ['due', 'priority', 'file'];
const NOTE_SORTS: readonly Sort[] = ['file', 'title', 'modified'];
const GROUPS: readonly Group[] = ['file', 'folder', 'tag', 'date'];
const TOKEN = /-?[^\s"]*"[^"]*"?|\S+/g;
const unquote = (text: string) => text.replace(/"/g, '');

/** today, tomorrow, yesterday, today+3, today-7, or YYYY-MM-DD. */
function resolveDate(text: string, today: string): string | null | undefined {
  const value = text.toLowerCase();
  if (value === 'none') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const relative = /^(today|tomorrow|yesterday)(?:([+-])(\d{1,4})d?)?$/.exec(value);
  if (!relative) return undefined;
  const base = { today: 0, tomorrow: 1, yesterday: -1 }[relative[1] as 'today'];
  const offset = relative[3] ? Number(relative[3]) * (relative[2] === '-' ? -1 : 1) : 0;
  return shiftDate(today, base + offset);
}

/** Read a view. `today` (YYYY-MM-DD) resolves relative dates. */
export function parseQuery(text: string, kind: ViewKind, today: string): Query {
  const query: Query = { terms: [], errors: [] };
  for (const token of text.match(TOKEN) ?? []) {
    const negate = token.length > 1 && token.startsWith('-');
    const body = negate ? token.slice(1) : token;
    const lower = body.toLowerCase();
    const option = /^(sort|group|limit):(.*)$/.exec(lower);
    if (option) {
      const [, key, value] = option;
      if (negate) query.errors.push(`“${token}” can’t be negated.`);
      else if (key === 'limit' && /^\d+$/.test(value)) query.limit = Number(value);
      else if (key === 'sort' && (kind === 'tasks' ? TASK_SORTS : NOTE_SORTS).includes(value as Sort)) query.sort = value as Sort;
      else if (key === 'group' && GROUPS.includes(value as Group) && !(kind === 'notes' && value === 'date')) query.group = value as Group;
      else query.errors.push(`“${token}” isn’t a ${key} this view understands.`);
      continue;
    }
    const date = /^(due|scheduled|start|done)(<=|>=|<|>|=)(.+)$/.exec(lower);
    let term: Term | null = null;
    if (lower === 'open' || lower === 'done') term = { type: 'status', status: lower };
    else if (lower === 'overdue') term = { type: 'overdue' };
    else if (date) {
      const resolved = resolveDate(date[3], today);
      if (resolved === undefined || (resolved === null && date[2] !== '=')) {
        query.errors.push(`“${token}” needs a date such as today, tomorrow, or 2026-10-01.`);
        continue;
      }
      term = { type: 'date', field: date[1] as DateField, op: date[2] as Op, date: resolved };
    } else if (/^#[^#\s]+$/.test(body)) term = { type: 'tag', tag: lower.slice(1) };
    else if (lower.startsWith('path:')) term = { type: 'path', prefix: unquote(lower.slice(5)).replace(/^\.?\//, '') };
    else if (lower.startsWith('file:')) term = { type: 'file', text: unquote(lower.slice(5)) };
    else term = { type: 'word', text: unquote(lower) };
    if (kind === 'notes' && (term.type === 'status' || term.type === 'overdue' || term.type === 'date')) {
      query.errors.push(`“${token}” works in task views only.`);
      continue;
    }
    if (term.type === 'word' && !term.text) continue;
    query.terms.push({ ...term, negate });
  }
  return query;
}

const compare = (value: string, op: Op, date: string) =>
  op === '<' ? value < date : op === '<=' ? value <= date : op === '=' ? value === date : op === '>=' ? value >= date : value > date;

const hasTag = (tags: readonly string[], wanted: string) =>
  tags.some((tag) => {
    const lower = tag.toLowerCase();
    return lower === wanted || lower.startsWith(`${wanted}/`);
  });

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1).toLowerCase();
const folderOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

function matchesPlace(term: Term, path: string): boolean | null {
  if (term.type === 'path') return path.toLowerCase().startsWith(term.prefix);
  if (term.type === 'file') return fileName(path).includes(term.text);
  return null;
}

function taskMatches(term: Term, task: Task, today: string): boolean {
  switch (term.type) {
    case 'status':
      return task.status === term.status;
    case 'overdue':
      return task.status === 'open' && Boolean(task.due && task.due < today);
    case 'date': {
      const value = task[term.field];
      return term.date === null ? value === undefined : value !== undefined && compare(value, term.op, term.date);
    }
    case 'tag':
      return hasTag(task.tags, term.tag);
    case 'word':
      return task.text.toLowerCase().includes(term.text);
    default:
      return matchesPlace(term, task.path) ?? false;
  }
}

function noteMatches(term: Term, note: ViewNote): boolean {
  if (term.type === 'tag') return hasTag(note.tags, term.tag);
  if (term.type === 'word') return `${note.title}\n${note.searchText}`.toLowerCase().includes(term.text);
  return matchesPlace(term, note.path) ?? true;
}

const byPlace = (a: { path: string; line?: number }, b: { path: string; line?: number }) =>
  a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0);

const TASK_ORDER: Record<string, (a: Task, b: Task) => number> = {
  due: (a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || byPlace(a, b),
  priority: (a, b) => PRIORITY_RANK[a.priority ?? 'none'] - PRIORITY_RANK[b.priority ?? 'none'] || TASK_ORDER.due(a, b),
  file: byPlace,
};

const NOTE_ORDER: Record<string, (a: ViewNote, b: ViewNote) => number> = {
  file: byPlace,
  title: (a, b) => a.title.localeCompare(b.title) || byPlace(a, b),
  modified: (a, b) => b.modified.localeCompare(a.modified) || byPlace(a, b),
};

function dateLabel(key: string, today: string): string {
  if (key === 'overdue') return 'Overdue';
  if (key === 'none') return 'No date';
  if (key === today) return 'Today';
  if (key === shiftDate(today, 1)) return 'Tomorrow';
  return key;
}

function groupItems<T>(items: T[], keysOf: (item: T) => string[], labelOf: (key: string) => string, rank: (key: string) => string): ViewGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) for (const key of keysOf(item)) groups.set(key, [...(groups.get(key) ?? []), item]);
  return [...groups.keys()]
    .sort((a, b) => rank(a).localeCompare(rank(b)))
    .map((key) => ({ key, label: labelOf(key), items: groups.get(key)! }));
}

/** Run a view over `notes`. Task views list checkbox lines and `type: todo` files. */
export function runView(kind: ViewKind, text: string, notes: readonly ViewNote[], today: string): ViewResult {
  const query = parseQuery(text, kind, today);
  const titles = new Map(notes.map((note) => [note.path, note.title]));
  const tagKeys = (tags: readonly string[]) => (tags.length ? [...new Set(tags.map((tag) => tag.toLowerCase()))] : ['']);
  const labels = (key: string) => {
    if (query.group === 'file') return titles.get(key) ?? key;
    if (query.group === 'folder') return key || 'Top level';
    if (query.group === 'tag') return key ? `#${key}` : 'No tag';
    return dateLabel(key, today);
  };
  // Empty keys ("Top level", "No tag") and dates sort into place: no tag last, overdue first, no date last.
  const rank = (key: string) =>
    query.group === 'tag' ? (key ? key : '￿') : query.group === 'date' ? (key === 'overdue' ? '' : key === 'none' ? '￿' : key) : key;

  if (kind === 'tasks') {
    const matched = notes
      .flatMap((note) => note.tasks)
      .filter((task) => query.terms.every((term) => taskMatches(term, task, today) !== term.negate))
      .sort(TASK_ORDER[query.sort ?? 'due']);
    const items = query.limit === undefined ? matched : matched.slice(0, query.limit);
    const keysOf = (task: Task): string[] => {
      if (query.group === 'file') return [task.path];
      if (query.group === 'folder') return [folderOf(task.path)];
      if (query.group === 'tag') return tagKeys(task.tags);
      return [task.status === 'open' && task.due && task.due < today ? 'overdue' : (task.due ?? 'none')];
    };
    const groups = query.group ? groupItems(items, keysOf, labels, rank) : [{ key: '', label: '', items }];
    return { kind, groups, total: matched.length, errors: query.errors };
  }

  const matched = notes.filter((note) => query.terms.every((term) => noteMatches(term, note) !== term.negate)).sort(NOTE_ORDER[query.sort ?? 'file']);
  const items = query.limit === undefined ? matched : matched.slice(0, query.limit);
  const keysOf = (note: ViewNote): string[] =>
    query.group === 'file' ? [note.path] : query.group === 'folder' ? [folderOf(note.path)] : tagKeys(note.tags);
  const groups = query.group ? groupItems(items, keysOf, labels, rank) : [{ key: '', label: '', items }];
  return { kind, groups, total: matched.length, errors: query.errors };
}

/**
 * A fenced view block: ```tasks or ```notes, with the query after the
 * language name and/or on the lines inside. Null for any other fence.
 */
export function viewFromFence(info: string, body: string): { kind: ViewKind; query: string } | null {
  const match = /^(tasks|notes)\b\s*(.*)$/i.exec(info.trim());
  if (!match) return null;
  const query = [match[2], ...body.split('\n')].map((line) => line.trim()).filter(Boolean).join(' ');
  return { kind: match[1].toLowerCase() as ViewKind, query };
}
