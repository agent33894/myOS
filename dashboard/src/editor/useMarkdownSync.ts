import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { attach, parseWithSource, serializeWithSource, type SourceMap } from './markdownSource';

/**
 * Whether an incoming `value` must be loaded into the editor. Our own
 * `onChange` echoes back as `value`, sometimes reformatted by the host or the
 * file on disk (a trailing newline, aligned tables). A value that shows the
 * same document as the editor must never reset it under the caret.
 */
export function needsSync(lastSeen: string | null, current: () => string, next: string, normalize: (markdown: string) => string): boolean {
  if (lastSeen === next) return false;
  const shown = current().trimEnd();
  return shown !== next.trimEnd() && shown !== normalize(next).trimEnd();
}

/**
 * Let plugins normalize the document (trailing paragraph, table fixes) in a
 * transaction that is neither an edit nor an undo step, so opening a page
 * never reports a change.
 */
function settle(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setMeta('preventUpdate', true).setMeta('addToHistory', false));
}

/**
 * Replace the document without an undo step, an `update` event, or a focus
 * change. A fresh state also drops the undo history, which belongs to the
 * document being replaced. Returns the map that keeps untouched blocks as written.
 */
function load(editor: Editor, markdown: string): SourceMap | null {
  const { doc: json, source } = parseWithSource(editor.markdown!, markdown);
  const parsed = editor.schema.nodeFromJSON(json);
  // An empty file parses to a doc with no blocks; the schema needs one.
  const doc = parsed.type.createAndFill(parsed.attrs, parsed.content) ?? parsed;
  editor.view.updateState(EditorState.create({ doc, plugins: editor.state.plugins, selection: TextSelection.atStart(doc) }));
  settle(editor);
  return attach(source, editor.state.doc);
}

/**
 * Two-way binding between an editor and a Markdown value. `onChange` fires
 * only for edits: never for a loaded value, its normalization, or an edit
 * that serializes to the Markdown already seen.
 */
export function connectMarkdown(editor: Editor, initial: { value: string; documentKey: string }, onChange: (markdown: string) => void) {
  let lastSeen = initial.value;
  let documentKey = initial.documentKey;
  let source = load(editor, initial.value);
  const current = () => serializeWithSource(editor, source);

  const emit = () => {
    const markdown = current();
    if (markdown === lastSeen) return;
    lastSeen = markdown;
    onChange(markdown);
  };
  editor.on('update', emit);

  return {
    /** A value from the host: another document, a reload from disk, or the echo of our own change. */
    receive(value: string, key: string) {
      const switched = key !== documentKey;
      const normalize = (markdown: string) => editor.markdown!.serialize(editor.markdown!.parse(markdown));
      if (switched || needsSync(lastSeen, current, value, normalize)) source = load(editor, value);
      documentKey = key;
      lastSeen = value;
    },
    disconnect: () => {
      editor.off('update', emit);
    },
  };
}

/** React binding for `connectMarkdown`. */
export function useMarkdownSync(editor: Editor, value: string, documentKey: string, onChange: (markdown: string) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [sync, setSync] = useState<ReturnType<typeof connectMarkdown> | null>(null);

  useEffect(() => {
    const connection = connectMarkdown(editor, { value, documentKey }, (markdown) => onChangeRef.current(markdown));
    setSync(connection);
    return connection.disconnect;
  }, [editor]);

  useEffect(() => {
    sync?.receive(value, documentKey);
  }, [sync, value, documentKey]);
}
