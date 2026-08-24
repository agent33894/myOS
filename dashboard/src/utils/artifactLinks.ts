import type { Artifact } from '../types/artifacts';

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
  artifacts: Artifact[],
): Artifact | null {
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
