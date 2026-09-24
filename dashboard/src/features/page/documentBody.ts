import type { useDocument } from '../../data/useDocument';
import { joinTitleEcho, splitTitleEcho } from '../shell/titleEcho';

type Doc = Pick<ReturnType<typeof useDocument>, 'title' | 'content' | 'edit'>;

/**
 * The body as the editor should see it. Older files repeat their title as a
 * leading "# Title"; the page already shows the title, so the echo is hidden
 * here and written back (following any rename) on save. The editor also
 * re-serializes as it loads, so only a change beyond surrounding whitespace
 * counts as an edit: opening a page never rewrites the file.
 */
export function documentBody(doc: Doc) {
  const { body, hadEcho } = splitTitleEcho(doc.content ?? '', doc.title);
  return {
    value: body,
    onChange: (markdown: string) => {
      if (markdown.trim() !== body.trim()) doc.edit({ content: joinTitleEcho(markdown, hadEcho, doc.title) });
    },
    /** Rename, keeping a hidden echo in step with the new title. */
    onTitleChange: (title: string) =>
      doc.edit(hadEcho ? { title, content: joinTitleEcho(body, true, title) } : { title }),
  };
}
