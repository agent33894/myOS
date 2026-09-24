import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorState, TextSelection } from '@tiptap/pm/state';

/**
 * Whether an incoming `value` must be loaded into the editor. Our own
 * `onChange` echoes back as `value` (already shown), and the editor's
 * serialization may differ slightly from the file (already equivalent);
 * neither should reset the document under the caret.
 */
export function needsSync(lastEmitted: string | null, current: () => string, next: string): boolean {
  return lastEmitted !== next && current() !== next;
}

/**
 * Replace the document without an undo step, an `update` event, or a focus
 * change. A fresh state also drops the undo history, which belongs to the
 * document being replaced.
 */
function load(editor: Editor, markdown: string) {
  const parsed = editor.schema.nodeFromJSON(editor.markdown!.parse(markdown));
  // An empty file parses to a doc with no blocks; the schema needs one.
  const doc = parsed.type.createAndFill(parsed.attrs, parsed.content) ?? parsed;
  const state = EditorState.create({ doc, plugins: editor.state.plugins, selection: TextSelection.atStart(doc) });
  editor.view.updateState(state);
  // Let listeners (menus, find bar) observe the new document.
  editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
}

/**
 * Keeps the editor and the Markdown `value` in step: emits edits through
 * `onChange`, and loads `value` when it changes from outside (another
 * document, a reload from disk) without echoing it back.
 */
export function useMarkdownSync(editor: Editor, value: string, documentKey: string, onChange: (markdown: string) => void) {
  const lastEmitted = useRef<string | null>(value);
  const loadedKey = useRef(documentKey);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const emit = () => {
      const markdown = editor.getMarkdown();
      lastEmitted.current = markdown;
      onChangeRef.current(markdown);
    };
    editor.on('update', emit);
    return () => {
      editor.off('update', emit);
    };
  }, [editor]);

  useEffect(() => {
    const switched = loadedKey.current !== documentKey;
    if (switched || needsSync(lastEmitted.current, () => editor.getMarkdown(), value)) load(editor, value);
    loadedKey.current = documentKey;
    lastEmitted.current = value;
  }, [editor, value, documentKey]);
}
