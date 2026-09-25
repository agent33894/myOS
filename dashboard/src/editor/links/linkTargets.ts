import type { NoteSummary } from '@shared/spec';

/**
 * How well `title` matches `query`: exact, prefix, word start, contains, then
 * a loose in-order match of every letter ("wkrv" finds "Weekly review").
 * Zero is no match.
 */
export function fuzzyScore(title: string, query: string): number {
  const text = title.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  if (text === needle) return 6;
  if (text.startsWith(needle)) return 5;
  if (text.split(/[\s\-_/]+/).some((word) => word.startsWith(needle))) return 4;
  if (text.includes(needle)) return 3;
  const words = needle.split(/\s+/);
  if (words.length > 1 && words.every((word) => text.includes(word))) return 2.5;
  // A loose match on one or two letters would match nearly everything.
  if (needle.replace(/\s+/g, '').length < 3) return 0;
  let at = 0;
  for (const char of needle.replace(/\s+/g, '')) {
    at = text.indexOf(char, at);
    if (at < 0) return 0;
    at += 1;
  }
  return 1;
}

/**
 * Suggestions for `[[query`: best match first, and among equals the notes
 * opened most recently, then the ones changed most recently.
 */
export function rankLinkTargets(
  notes: readonly NoteSummary[],
  query: string,
  { recentPaths = [], exclude, limit = 8 }: { recentPaths?: readonly string[]; exclude?: string; limit?: number } = {},
): NoteSummary[] {
  const recency = (note: NoteSummary) => {
    const index = recentPaths.indexOf(note.path);
    return index < 0 ? recentPaths.length : index;
  };
  return notes
    .filter((note) => note.path !== exclude)
    .map((note) => ({ note, score: Math.max(fuzzyScore(note.title, query), fuzzyScore(note.path, query) - 0.5) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || recency(a.note) - recency(b.note) || b.note.modified.localeCompare(a.note.modified))
    .slice(0, limit)
    .map(({ note }) => note);
}

/** A note made from a link (`[[Missing note]]` or Create “…”) goes in the linking note's folder. */
export function linkedNotePath(title: string, fromPath: string): string {
  const name = title.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
  const folder = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/') + 1) : '';
  return `${folder}${name}.md`;
}
