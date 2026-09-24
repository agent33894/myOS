import type { ArtifactSummary } from '@shared/types';

/** Markdown reduced to the words a person reads, for matching and snippets. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*\n?/g, ' ')
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/\[[ xX]\]\s/g, '')
    .replace(/[*_~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchDoc {
  item: ArtifactSummary;
  title: string;
  body: string;
  bodyLower: string;
}

export function buildIndex(items: readonly ArtifactSummary[]): SearchDoc[] {
  return items.map((item) => {
    const body = plainText(item.searchText ?? '');
    return { item, title: item.title.toLowerCase(), body, bodyLower: body.toLowerCase() };
  });
}

const tokensOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * How well `label` matches `query`: 4 exact, 3 prefix, 2.5 word prefix,
 * 2 contains, 1.5 every word appears; 0 is no match.
 */
export function labelScore(label: string, query: string): number {
  const text = label.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  if (text === needle) return 4;
  if (text.startsWith(needle)) return 3;
  if (new RegExp(`\\b${escape(needle)}`).test(text)) return 2.5;
  if (text.includes(needle)) return 2;
  return tokensOf(needle).every((token) => text.includes(token)) ? 1.5 : 0;
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

const SNIPPET_LEAD = 36;
const SNIPPET_LENGTH = 120;

function snippetFor(doc: SearchDoc, query: string): Snippet | undefined {
  const needle = query.trim().toLowerCase();
  const tokens = tokensOf(needle).sort((a, b) => b.length - a.length);
  const target = doc.bodyLower.includes(needle) ? needle : tokens.find((token) => doc.bodyLower.includes(token));
  if (!target) return undefined;
  const at = doc.bodyLower.indexOf(target);
  let start = Math.max(0, at - SNIPPET_LEAD);
  // Start on a word boundary so the snippet never opens mid-word.
  if (start > 0) start = doc.body.indexOf(' ', start) + 1 || start;
  if (start > at) start = at;
  const matchEnd = at + target.length;
  let end = Math.min(doc.body.length, start + SNIPPET_LENGTH);
  // …and end on one, too.
  if (end < doc.body.length) end = Math.max(matchEnd, doc.body.lastIndexOf(' ', end));
  return {
    before: `${start > 0 ? '…' : ''}${doc.body.slice(start, at)}`,
    match: doc.body.slice(at, matchEnd),
    after: `${doc.body.slice(matchEnd, end)}${end < doc.body.length ? '…' : ''}`,
  };
}

export interface Hit {
  item: ArtifactSummary;
  score: number;
  /** Present for matches found in the body rather than the title. */
  snippet?: Snippet;
}

/** Title matches first (prefix, word, contains), then full-text matches; ties go to the most recently edited. */
export function searchDocs(index: readonly SearchDoc[], query: string, limit = 30): Hit[] {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [];
  const hits: Hit[] = [];
  for (const doc of index) {
    const title = labelScore(doc.item.title, query);
    if (title > 0) {
      hits.push({ item: doc.item, score: title });
    } else if (tokens.every((token) => doc.title.includes(token) || doc.bodyLower.includes(token))) {
      hits.push({ item: doc.item, score: 1, snippet: snippetFor(doc, query) });
    }
  }
  return hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.snippet ? 0 : a.item.title.length - b.item.title.length) ||
        b.item.updated.localeCompare(a.item.updated),
    )
    .slice(0, limit);
}
