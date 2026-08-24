import type { Artifact } from '../../types/artifacts';

export type SearchScope = 'full' | 'titles' | 'tags';

export interface SearchHit {
  artifact: Artifact;
  score: number;
  /** Short body excerpt around the first body match (full-text scope only). */
  context?: string;
}

interface IndexEntry {
  artifact: Artifact;
  title: string;
  tags: string[];
  body: string;
  bodyRaw: string;
  updatedAt: number;
}

type LibrarySearchIndex = IndexEntry[];

/** Rank tiers: title beats tags beats body; whole-query title hits beat token hits. */
const TITLE_EXACT = 100;
const TITLE_PREFIX = 50;
const TITLE_TOKEN = 24;
const TAG_TOKEN = 12;
const BODY_TOKEN = 4;

const CONTEXT_RADIUS = 45;

export function buildSearchIndex(artifacts: Artifact[]): LibrarySearchIndex {
  return artifacts.map((artifact) => {
    const bodyRaw = artifact.searchContent ?? '';
    const updatedAt = new Date(artifact.updated).getTime();
    return {
      artifact,
      title: artifact.title.toLowerCase(),
      tags: artifact.tags.map((tag) => tag.toLowerCase()),
      body: bodyRaw.toLowerCase(),
      bodyRaw,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  });
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** ~90-char excerpt around the first match, trimmed to word boundaries. */
function contextSnippet(bodyRaw: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - CONTEXT_RADIUS);
  const end = Math.min(bodyRaw.length, matchIndex + matchLength + CONTEXT_RADIUS);
  let snippet = bodyRaw.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = `…${snippet.replace(/^\S*\s/, '')}`;
  if (end < bodyRaw.length) snippet = `${snippet.replace(/\s\S*$/, '')}…`;
  return snippet;
}

function scoreEntry(entry: IndexEntry, query: string, tokens: string[], scope: SearchScope): SearchHit | null {
  let score = 0;
  let hits = 0;
  let firstBodyMatch = -1;
  let firstBodyLength = 0;

  for (const token of tokens) {
    const inTitle = entry.title.includes(token);
    const inTags = entry.tags.some((tag) => tag.includes(token));
    const bodyIndex = scope === 'full' ? entry.body.indexOf(token) : -1;

    const matched =
      (scope === 'titles' && inTitle) ||
      (scope === 'tags' && inTags) ||
      (scope === 'full' && (inTitle || inTags || bodyIndex !== -1));
    if (!matched) return null; // AND semantics: every token must land within scope.

    if (inTitle && scope !== 'tags') {
      score += TITLE_TOKEN;
      hits += 1;
    }
    if (inTags && scope !== 'titles') {
      score += TAG_TOKEN;
      hits += 1;
    }
    if (bodyIndex !== -1) {
      score += BODY_TOKEN;
      hits += 1;
      if (firstBodyMatch === -1) {
        firstBodyMatch = bodyIndex;
        firstBodyLength = token.length;
      }
    }
  }

  if (scope !== 'tags') {
    if (entry.title === query) score += TITLE_EXACT;
    else if (entry.title.startsWith(query)) score += TITLE_PREFIX;
  }

  const titleOrTagHit = score > hits * BODY_TOKEN || scope !== 'full';
  const context =
    !titleOrTagHit && firstBodyMatch !== -1
      ? contextSnippet(entry.bodyRaw, firstBodyMatch, firstBodyLength)
      : undefined;

  return { artifact: entry.artifact, score: score * 1000 + hits, context };
}

/**
 * Ranked scoped search. Callers treat an empty query as browse mode and skip
 * this entirely; given tokens, every token must match within the scope.
 * Order: score desc, then updated desc.
 */
export function searchArtifacts(index: LibrarySearchIndex, query: string, scope: SearchScope): SearchHit[] {
  const normalized = query.trim().toLowerCase();
  const tokens = tokenize(normalized);
  if (tokens.length === 0) return [];

  const hits: Array<SearchHit & { updatedAt: number }> = [];
  for (const entry of index) {
    const hit = scoreEntry(entry, normalized, tokens, scope);
    if (hit) hits.push({ ...hit, updatedAt: entry.updatedAt });
  }
  hits.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
  return hits.map(({ artifact, score, context }) => ({ artifact, score, context }));
}
