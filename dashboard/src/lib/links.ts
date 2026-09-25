import { fileStem, type NoteSummary } from '@shared/spec';

type Linkable = Pick<NoteSummary, 'path' | 'title'>;

const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/** `a/./b/../c.md` → `a/c.md`; null when it climbs above the folder. */
function normalizePath(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}

/**
 * The note a Markdown link points at. Relative paths resolve from the linking
 * note's folder, then from the top of the folder; `.md` may be left out.
 */
export function findLinkedNote<T extends Linkable>(href: string, fromPath: string | undefined, notes: readonly T[]): T | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || URI_SCHEME_PATTERN.test(trimmed)) return null;
  const raw = trimmed.split(/[?#]/, 1)[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const lookup = (candidate: string | null) =>
    candidate ? (notes.find((note) => note.path === candidate || note.path === `${candidate}.md`) ?? null) : null;
  const directory = fromPath?.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
  const relative = decoded.startsWith('/') ? null : lookup(normalizePath(`${directory}/${decoded}`));
  return relative ?? lookup(normalizePath(decoded.replace(/^\/+/, '')));
}

// `[[Target]]`, `[[Target|label]]`, or `[[Target#Heading]]`.
const WIKI_LINK_PATTERN = /\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]/g;

export function matchWikiLinks(text: string): Array<{ index: number; length: number; target: string }> {
  return [...text.matchAll(WIKI_LINK_PATTERN)].map((match) => ({
    index: match.index ?? 0,
    length: match[0].length,
    target: match[1].split('#')[0].trim(),
  }));
}

/** `[[Target]]` resolves as Obsidian does: a path, then a file name, then a title; case-insensitive. */
export function findWikiLinkedNote<T extends Linkable>(target: string, notes: readonly T[]): T | null {
  const wanted = target.trim().toLowerCase().replace(/\.md$/, '');
  if (!wanted) return null;
  return (
    notes.find((note) => note.path.toLowerCase().replace(/\.md$/, '') === wanted) ??
    notes.find((note) => fileStem(note.path).toLowerCase() === wanted) ??
    notes.find((note) => note.title.toLowerCase() === wanted) ??
    null
  );
}

/** Notes that link to `target` with `[[…]]` or a relative Markdown link. */
export function findBacklinks<T extends Linkable & Pick<NoteSummary, 'searchText'>>(target: Linkable, notes: readonly T[]): T[] {
  return notes.filter((note) => {
    if (note.path === target.path) return false;
    const body = note.searchText;
    if (body.includes('[[') && matchWikiLinks(body).some((link) => findWikiLinkedNote(link.target, [target]) !== null)) return true;
    return [...body.matchAll(/\]\(([^)\s]+)\)/g)].some((match) => findLinkedNote(match[1], note.path, [target]) !== null);
  });
}
