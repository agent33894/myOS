export function extractCommitHashFromHref(href: string): string | null {
  const normalized = href.trim();
  if (!normalized) return null;

  const directHashMatch = normalized.match(/^([a-f0-9]{7,40})$/i);
  if (directHashMatch) return directHashMatch[1];

  const directCommitMatch = normalized.match(/(?:^|\/)commit\/([a-f0-9]{7,40})(?:[/?#].*)?$/i);
  if (directCommitMatch) return directCommitMatch[1];

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(normalized, base);
    const parsedValue = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const parsedCommitMatch = parsedValue.match(/(?:^|\/)commit\/([a-f0-9]{7,40})(?:[/?#].*)?$/i);
    return parsedCommitMatch ? parsedCommitMatch[1] : null;
  } catch {
    return null;
  }
}
