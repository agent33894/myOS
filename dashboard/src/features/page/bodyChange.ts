import type { useDocument } from '../../data/useDocument';

type Doc = Pick<ReturnType<typeof useDocument>, 'content' | 'edit'>;

/**
 * The editor re-serializes a body as it loads (a trailing newline, say).
 * Only a change beyond surrounding whitespace counts as an edit, so opening a
 * page never rewrites the file.
 */
export const bodyChange = (doc: Doc) => (markdown: string) => {
  if (markdown.trim() !== (doc.content ?? '').trim()) doc.edit({ content: markdown });
};
