import type { ViewKind } from '@shared/query';
import { paths } from '../../app/navigation';

/*
 * The grouping and sort controls edit the view text itself, so what you see
 * in the box is always the whole view (and what gets saved or copied into a note).
 */

type OptionKey = 'group' | 'sort';

const optionToken = (key: OptionKey) => new RegExp(`^${key}:`, 'i');

/** The value of `group:` or `sort:` in a view, or null. The last one wins, as in the parser. */
export function optionOf(query: string, key: OptionKey): string | null {
  const tokens = query.split(/\s+/).filter((token) => optionToken(key).test(token));
  return tokens.length ? tokens[tokens.length - 1].slice(key.length + 1).toLowerCase() : null;
}

/** The view with its `group:`/`sort:` term replaced (or removed with null); other text stays as typed. */
export function withOption(query: string, key: OptionKey, value: string | null): string {
  const kept = query
    .split(/(\s+)/)
    .filter((part) => !optionToken(key).test(part))
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return value ? `${kept}${kept ? ' ' : ''}${key}:${value}` : kept;
}

export const GROUPS: Record<ViewKind, Array<{ value: string; label: string }>> = {
  tasks: [
    { value: 'none', label: 'None' },
    { value: 'file', label: 'File' },
    { value: 'folder', label: 'Folder' },
    { value: 'tag', label: 'Tag' },
    { value: 'date', label: 'Date' },
  ],
  notes: [
    { value: 'none', label: 'None' },
    { value: 'file', label: 'File' },
    { value: 'folder', label: 'Folder' },
    { value: 'tag', label: 'Tag' },
  ],
};

export const SORTS: Record<ViewKind, Array<{ value: string; label: string }>> = {
  tasks: [
    { value: 'due', label: 'Due date' },
    { value: 'priority', label: 'Priority' },
    { value: 'file', label: 'File' },
  ],
  notes: [
    { value: 'file', label: 'File' },
    { value: 'title', label: 'Title' },
    { value: 'modified', label: 'Last changed' },
  ],
};

/** A URL-safe id for a new view, unique among `taken`. */
export function viewId(name: string, taken: readonly string[]): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) || 'view';
  let id = base;
  for (let count = 2; taken.includes(id); count += 1) id = `${base}-${count}`;
  return id;
}

/** The Tasks screen with `query` in its box; notes views add `kind=notes`. */
export const viewUrl = (kind: ViewKind, query: string) =>
  `${paths.tasks}?${new URLSearchParams(kind === 'tasks' ? { q: query } : { q: query, kind })}`;

/** "1 task", "12 notes". */
export const countLabel = (total: number, kind: ViewKind) =>
  `${total} ${kind === 'tasks' ? (total === 1 ? 'task' : 'tasks') : total === 1 ? 'note' : 'notes'}`;
