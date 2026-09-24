import type { ArtifactSummary } from '@shared/types';

const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

function normalizeArtifactPath(path: string): string | null {
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

function pathFromMyOsLink(href: string): string | null {
  if (!href.toLowerCase().startsWith('myos://artifact')) return null;

  try {
    const url = new URL(href);
    return url.searchParams.get('artifact') || url.searchParams.get('path');
  } catch {
    return null;
  }
}

/**
 * Resolve a Markdown href to an artifact already present in the renderer's
 * metadata index. Relative paths follow Markdown semantics and are resolved
 * from the directory containing the current artifact.
 */
export function findLinkedArtifact(
  href: string,
  currentArtifactPath: string | undefined,
  artifacts: ArtifactSummary[],
): ArtifactSummary | null {
  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith('#')) return null;

  const deepLinkPath = pathFromMyOsLink(trimmedHref);
  if (!deepLinkPath && URI_SCHEME_PATTERN.test(trimmedHref)) return null;

  const rawPath = (deepLinkPath ?? trimmedHref).split(/[?#]/, 1)[0];
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  const rootCandidate = normalizeArtifactPath(decodedPath.replace(/^\/+/, ''));
  if (rootCandidate) {
    const directMatch = artifacts.find((artifact) => artifact.filePath === rootCandidate);
    if (directMatch) return directMatch;
  }

  if (!currentArtifactPath || decodedPath.startsWith('/')) return null;
  const currentDirectory = currentArtifactPath.replace(/\\/g, '/').replace(/\/[^/]*$/, '');
  const relativeCandidate = normalizeArtifactPath(`${currentDirectory}/${decodedPath}`);
  if (!relativeCandidate) return null;

  return artifacts.find((artifact) => artifact.filePath === relativeCandidate) ?? null;
}

// `[[Target]]` or `[[Target|label]]`.
const WIKI_LINK_PATTERN = /\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]/g;

export function matchWikiLinks(text: string): Array<{ index: number; length: number; target: string }> {
  return [...text.matchAll(WIKI_LINK_PATTERN)].map((match) => ({
    index: match.index ?? 0,
    length: match[0].length,
    target: match[1].trim(),
  }));
}

function fileStem(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^.*\//, '').replace(/\.md$/i, '');
}

/** `[[Target]]` resolves by title, then id, then file name — case-insensitive. */
export function findWikiLinkedArtifact(target: string, artifacts: ArtifactSummary[]): ArtifactSummary | null {
  const wanted = target.trim().toLowerCase();
  return (
    artifacts.find((artifact) => artifact.title.toLowerCase() === wanted) ??
    artifacts.find((artifact) => artifact.id.toLowerCase() === wanted) ??
    artifacts.find((artifact) => fileStem(artifact.filePath).toLowerCase() === wanted) ??
    null
  );
}

/** Artifacts that link here with `[[...]]` or list this one in `related`. */
export function findBacklinks(target: ArtifactSummary, artifacts: ArtifactSummary[]): ArtifactSummary[] {
  return artifacts.filter((artifact) => {
    if (artifact.id === target.id) return false;
    if ((artifact.related ?? []).includes(target.id)) return true;
    const body = artifact.searchText ?? '';
    if (!body.includes('[[')) return false;
    return matchWikiLinks(body).some(
      (link) => findWikiLinkedArtifact(link.target, [target]) !== null,
    );
  });
}

