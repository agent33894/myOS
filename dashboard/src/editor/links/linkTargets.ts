import { ArtifactType, type ArtifactDraft, type ArtifactSummary } from '@shared/types';

/** Pages a `[[link]]` can point at: notes, tasks, and projects (not Inbox captures, journal days, or templates). */
const LINKABLE = (item: ArtifactSummary) =>
  item.type !== ArtifactType.INBOX && item.type !== ArtifactType.JOURNAL && item.type !== ArtifactType.TEMPLATE && Boolean(item.title.trim());

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
 * Suggestions for `[[query`: best match first, and among equals the pages
 * opened most recently, then the ones edited most recently.
 */
export function rankLinkTargets(
  items: readonly ArtifactSummary[],
  query: string,
  { recentPaths = [], exclude, limit = 8 }: { recentPaths?: readonly string[]; exclude?: string; limit?: number } = {},
): ArtifactSummary[] {
  const recency = (item: ArtifactSummary) => {
    const index = recentPaths.indexOf(item.filePath);
    return index < 0 ? recentPaths.length : index;
  };
  return items
    .filter((item) => LINKABLE(item) && item.filePath !== exclude)
    .map((item) => ({ item, score: fuzzyScore(item.title, query) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || recency(a.item) - recency(b.item) || b.item.updated.localeCompare(a.item.updated),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * A note made from a link (`[[Missing page]]` or Create “…”) lives near the
 * page that links to it: the same area, and the same project when that page
 * is in one (or is the project itself). Otherwise it takes the default area.
 */
export function linkedNoteDraft(title: string, from: ArtifactSummary | undefined): ArtifactDraft {
  const project = from?.type === ArtifactType.PROJECT ? from.id : from?.project;
  return {
    type: ArtifactType.MEMO,
    title,
    ...(from?.domain && from.type !== ArtifactType.JOURNAL ? { domain: from.domain } : {}),
    ...(project ? { project } : {}),
  };
}
