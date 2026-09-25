import type { Task } from '../tasks';

/** Frontmatter as parsed, every key the file has, in its own order. */
export type Properties = Record<string, unknown>;

/** Property changes; `null` removes a key. Keys not named stay exactly as written. */
export type PropertiesPatch = Record<string, unknown>;

/** One Markdown file in the folder, as the index sees it. */
export interface NoteSummary {
  /** Folder-relative, `/`-separated, ending in `.md`. */
  path: string;
  /** File revision, `${mtimeMs}:${size}`, stamped by the main process on every read and write. */
  rev: string;
  /** Frontmatter `title`, else the file name without `.md`. */
  title: string;
  properties: Properties;
  /** Set when the frontmatter could not be read; `properties` is then empty and the block is never rewritten. */
  propertiesError?: string;
  /** Frontmatter `tags` and inline `#tags`, without `#`, first spelling wins. */
  tags: string[];
  /** Checkbox lines, plus the file itself when it has `type: todo`. */
  tasks: Task[];
  /** ISO time of the last change on disk. */
  modified: string;
  /** The body (capped for very large files), for search. */
  searchText: string;
}

/** A note with its body: the text after the frontmatter, without surrounding blank lines. */
export interface Note extends Omit<NoteSummary, 'searchText'> {
  content: string;
}

export const fileStem = (path: string) => path.replace(/^.*\//, '').replace(/\.md$/i, '');

export function noteTitle(path: string, properties: Properties): string {
  const title = properties.title;
  return (typeof title === 'string' || typeof title === 'number') && String(title).trim() ? String(title).trim() : fileStem(path);
}

/** Files with `type: todo` are tasks (myOS 3.0 and earlier wrote them). */
export const isTodoFile = (properties: Properties) => String(properties.type ?? '').toLowerCase() === 'todo';

const FENCE = /^\s*(`{3,}|~{3,})/;
// Obsidian: letters, digits, `_`, `-`, `/`, and at least one character that is not a digit.
const INLINE_TAG = /(?:^|\s)#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu;

/** Inline `#tags` in text, without the `#`. */
export const tagsIn = (text: string): string[] => [...text.matchAll(INLINE_TAG)].map((match) => match[1]);

/** Frontmatter tags (a list or a comma/space separated string) and inline tags outside code. */
export function noteTags(properties: Properties, body: string): string[] {
  const raw = properties.tags ?? properties.tag;
  const listed = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s]+/) : [])
    .filter((tag): tag is string | number => typeof tag === 'string' || typeof tag === 'number')
    .map((tag) => String(tag).replace(/^#/, '').trim())
    .filter(Boolean);
  const inline: string[] = [];
  let fence: string | null = null;
  for (const line of body.split('\n')) {
    const marker = FENCE.exec(line)?.[1];
    if (marker && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence === null ? marker : null;
      continue;
    }
    if (fence === null) inline.push(...tagsIn(line.replace(/`[^`]*`/g, '')));
  }
  const seen = new Set<string>();
  return [...listed, ...inline].filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
