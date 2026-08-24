/**
 * The vault scaffold writes a leading "# <title>" into every artifact body,
 * duplicating the frontmatter title the detail pane already sets in display
 * serif. Drop that echo before rendering; anything else — including a leading
 * H1 that says something different — is real content and passes through.
 *
 * Only blank lines may
 * precede the heading, and comparison is trimmed, lowercased, and
 * whitespace-collapsed.
 */
export function stripTitleEcho(body: string, title: string): string {
  return splitTitleEcho(body, title).body;
}

/**
 * Like stripTitleEcho, but also reports whether an echo was removed so an
 * editing surface can rejoin it on save — files keep their scaffolded
 * "# <title>" line even though the pane never shows it.
 */
export function splitTitleEcho(body: string, title: string): { body: string; hadEcho: boolean } {
  const normalizedTitle = normalizeHeading(title);
  if (!normalizedTitle) return { body, hadEcho: false };
  const lines = body.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  const line = lines[index]?.trim();
  if (!line || !line.startsWith('# ')) return { body, hadEcho: false };
  if (normalizeHeading(line.slice(2)) !== normalizedTitle) return { body, hadEcho: false };
  let rest = index + 1;
  while (rest < lines.length && lines[rest].trim() === '') rest += 1;
  return { body: lines.slice(rest).join('\n'), hadEcho: true };
}

/**
 * Inverse of splitTitleEcho: restore the scaffolded echo line ahead of the
 * edited body. If the title changed since load, the echo follows the new
 * title — the file's H1 should never disagree with its frontmatter.
 */
export function joinTitleEcho(body: string, hadEcho: boolean, title: string): string {
  if (!hadEcho || !title.trim()) return body;
  return body.trim() ? `# ${title.trim()}\n\n${body}` : `# ${title.trim()}\n`;
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
