import { canonicalPath } from './spec';
import { ArtifactType, type Artifact } from './types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Where the journal page for `date` (YYYY-MM-DD) lives. */
export const journalPath = (date: string) => canonicalPath(date, ArtifactType.JOURNAL);

/** The day a journal page is for, from its file name; undefined for anything else. */
export function journalDate(item: Pick<Artifact, 'type' | 'filePath'>): string | undefined {
  const name = item.filePath.split('/').pop()?.replace(/\.md$/i, '') ?? '';
  return item.type === ArtifactType.JOURNAL && DATE.test(name) ? name : undefined;
}

/**
 * `content` with `line` added at the end of the `## heading` section, creating
 * the section at the end when it is missing. Everything else stays as written.
 */
export function appendUnderHeading(content: string, heading: string, line: string): string {
  const lines = content.split('\n');
  const title = heading.trim().toLowerCase();
  const start = lines.findIndex((text) => /^##\s/.test(text) && text.replace(/^##\s+/, '').trim().toLowerCase() === title);
  if (start < 0) return `${content.trimEnd()}${content.trim() ? '\n\n' : ''}## ${heading}\n\n${line}`;
  const next = lines.findIndex((text, index) => index > start && /^#{1,2}\s/.test(text));
  let end = next < 0 ? lines.length : next;
  while (end > start + 1 && !lines[end - 1].trim()) end -= 1;
  const gap = end === start + 1 ? [''] : [];
  return [...lines.slice(0, end), ...gap, line, ...lines.slice(end)].join('\n');
}
