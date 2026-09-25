import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorState, Selection, TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { extractTasks } from '@shared/tasks';
import { attach, parseWithSource, serializeWithSource, type SourceMap } from './markdownSource';

// TipTap makes task items only of `-`, `*`, `+` bullets with `[ ]` or `[x]`.
const RENDERED_TASK = /^\s*[-*+]\s+\[[ xX]\]\s/;

/** Task items with text, outside quotes, in document order: the ones the file has as task lines. */
function taskItemsIn(node: PMNode, offset: number): number[] {
  const found: number[] = [];
  node.descendants((child, pos) => {
    if (child.type.name === 'blockquote') return false;
    if (child.type.name === 'taskItem' && (child.firstChild?.textContent.trim() ?? '')) found.push(offset + pos);
    return true;
  });
  return found;
}

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
 * document being replaced. A reload of the same file (a task checked, a
 * change from another app) keeps the caret about where it was. Returns the
 * map that keeps untouched blocks as written.
 */
function load(editor: Editor, markdown: string, keepCaret = false): SourceMap | null {
  const { doc: json, source } = parseWithSource(editor.markdown!, markdown);
  const parsed = editor.schema.nodeFromJSON(json);
  // An empty file parses to a doc with no blocks; the schema needs one.
  const doc = parsed.type.createAndFill(parsed.attrs, parsed.content) ?? parsed;
  const selection = keepCaret ? Selection.near(doc.resolve(Math.min(editor.state.selection.from, doc.content.size))) : TextSelection.atStart(doc);
  editor.view.updateState(EditorState.create({ doc, plugins: editor.state.plugins, selection }));
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
    /**
     * The 0-based line, in the Markdown this editor emits, of the task item
     * at `pos`: found in its own top-level block by its place among that
     * block's task lines. Null when the block's task lines and task items
     * don't pair up one to one, so a caller never guesses.
     */
    taskLine(pos: number): number | null {
      const { doc } = editor.state;
      if (doc.nodeAt(pos)?.type.name !== 'taskItem') return null;
      const top = doc.resolve(pos).index(0);
      let blockPos = 0;
      for (let index = 0; index < top; index += 1) blockPos += doc.child(index).nodeSize;
      const items = taskItemsIn(doc.child(top), blockPos + 1);
      const ordinal = items.indexOf(pos);
      const starts: number[] = [];
      const markdown = serializeWithSource(editor, source, starts);
      const start = starts[top];
      if (ordinal < 0 || start === undefined || start < 0) return null;
      const end = starts.slice(top + 1).find((next) => next >= 0) ?? markdown.length;
      const lines = extractTasks(markdown.slice(start, end), '').filter((task) => RENDERED_TASK.test(task.raw));
      if (lines.length !== items.length) return null;
      return markdown.slice(0, start).split('\n').length - 1 + lines[ordinal].line - 1;
    },
    /** A value from the host: another document, a reload from disk, or the echo of our own change. */
    receive(value: string, key: string) {
      const switched = key !== documentKey;
      const normalize = (markdown: string) => editor.markdown!.serialize(editor.markdown!.parse(markdown));
      if (switched || needsSync(lastSeen, current, value, normalize)) source = load(editor, value, !switched);
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

  return sync;
}
