import { useCallback, useMemo } from 'react';
import { useDocument } from '../../data/useDocument';
import { joinTitleEcho, splitTitleEcho } from '../shell/titleEcho';

/**
 * The Living Page's view of a document: title and body are always editable
 * and autosave through `useDocument`. Older files carry a "# <title>" echo at
 * the top of the body; the pane hides it and keeps it in step with the title.
 */
export function useLivingPageController(path: string) {
  const document = useDocument(path);
  const { title, content, edit } = document;
  const { body, hadEcho } = useMemo(
    () => (content === null ? { body: null, hadEcho: false } : splitTitleEcho(content, title)),
    [content, title],
  );

  const onTitleChange = useCallback(
    (next: string) => edit({ title: next, content: body === null ? undefined : joinTitleEcho(body, hadEcho, next) }),
    [body, edit, hadEcho],
  );

  const onBodyChange = useCallback(
    (markdown: string) => {
      if (body === null || markdown === body) return;
      edit({ content: joinTitleEcho(markdown, hadEcho, title) });
    },
    [body, edit, hadEcho, title],
  );

  return {
    title,
    docBody: body,
    isSaving: document.saving,
    lastSaved: document.lastSaved,
    hasUnsavedChanges: document.dirty,
    isActivelyEditing: document.dirty && !document.saving,
    conflict: document.conflict,
    keepMine: document.keepMine,
    loadTheirs: document.loadTheirs,
    onTitleChange,
    onBodyChange,
    saveNow: document.saveNow,
  };
}
