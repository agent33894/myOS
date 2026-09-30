import type { ArtifactSummary } from '@shared/types';

export type NoteSort = 'edited' | 'created' | 'title';

const SORTS: Record<NoteSort, (a: ArtifactSummary, b: ArtifactSummary) => number> = {
  edited: (a, b) => b.updated.localeCompare(a.updated),
  created: (a, b) => b.created.localeCompare(a.created) || b.updated.localeCompare(a.updated),
  title: (a, b) => a.title.localeCompare(b.title),
};

/** Markdown noise that makes a poor preview line. */
const plain = (line: string) =>
  line
    .replace(/^\s{0,3}(#{1,6}\s|>\s?|[-*+]\s(\[.\]\s)?|\d+\.\s)/, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/[*_`~]|!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();

const isHeading = (line: string) => /^\s{0,3}#{1,6}\s/.test(line);

/**
 * The first line of real text (not a repeat of the title, and not a section
 * heading unless there is nothing else), or the words around the first match of `query`.
 */
export function snippet(body: string | undefined, query = '', title = ''): string {
  if (!body) return '';
  const wanted = query.trim().toLowerCase();
  const lines = body
    .split('\n')
    .map((raw) => ({ text: plain(raw), heading: isHeading(raw) }))
    .filter(({ text }) => text && text !== title && !text.startsWith('```') && !/^[-=_*]{3,}$/.test(text));
  if (wanted) {
    const hit = lines.find(({ text }) => text.toLowerCase().includes(wanted))?.text;
    if (hit) {
      const at = hit.toLowerCase().indexOf(wanted);
      return at > 40 ? `…${hit.slice(at - 30)}` : hit;
    }
  }
  return (lines.find(({ heading }) => !heading) ?? lines[0])?.text ?? '';
}

/** Title and full-text search together; title matches rank first. */
export function searchNotes(notes: readonly ArtifactSummary[], query: string, sort: NoteSort): ArtifactSummary[] {
  const sorted = [...notes].sort(SORTS[sort]);
  const wanted = query.trim().toLowerCase();
  if (!wanted) return sorted;
  const inTitle = sorted.filter((note) => note.title.toLowerCase().includes(wanted));
  const inBody = sorted.filter(
    (note) => !note.title.toLowerCase().includes(wanted) && (note.searchText ?? '').toLowerCase().includes(wanted),
  );
  return [...inTitle, ...inBody];
}
