/**
 * Older files (and files from other tools) open with a "# <title>" line that
 * repeats the frontmatter title the page already shows. The page hides that
 * echo while editing and rejoins it on save, so the file keeps its heading.
 * Only blank lines may precede it; comparison ignores case and spacing.
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
 * Inverse of splitTitleEcho: restore the echo line ahead of the
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
