import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { flashElement, registerEditor, reportCaret } from './bridge';
import { blockMatch, lineOfText, textAtLine } from './lines';

const REPORT_DELAY_MS = 120;

function textblocks(doc: PMNode): Array<{ node: PMNode; pos: number }> {
  const blocks: Array<{ node: PMNode; pos: number }> = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      blocks.push({ node, pos });
      return false;
    }
    return true;
  });
  return blocks;
}

/** The body line of the caret, found by the text of the block it is in. */
function caretLine(editor: Editor, markdown: string): number | null {
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;
  const start = $from.before();
  const text = $from.parent.textContent;
  if (!text.trim()) return null;
  const blocks = textblocks(editor.state.doc);
  const occurrence = blocks.filter((block) => block.pos < start && block.node.textContent === text).length;
  const line = lineOfText(markdown, text, occurrence);
  return line >= 0 ? line : null;
}

/** Put the caret on the rendered block that shows body line `line`, and scroll it to the middle. */
function revealLine(editor: Editor, markdown: string, line: number, flash = false): boolean {
  const wanted = textAtLine(markdown, line);
  if (!wanted || editor.isDestroyed) return false;
  const blocks = textblocks(editor.state.doc);
  const exact = blocks.filter((block) => blockMatch(block.node.textContent, wanted.key) === 2);
  const target = exact[wanted.occurrence] ?? exact[0] ?? blocks.find((block) => blockMatch(block.node.textContent, wanted.key) === 1);
  if (!target) return false;
  const { view } = editor;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, target.pos + 1)));
  view.focus();
  const dom = view.nodeDOM(target.pos);
  const element = dom instanceof Element ? dom : dom?.parentElement;
  element?.scrollIntoView({ block: 'center' });
  if (flash) flashElement(element?.closest('li') ?? element);
  return true;
}

/**
 * Connect the rendered editor to the note's panels: the Outline jumps to a
 * heading through `revealLine`, and the caret's body line is reported so the
 * Outline marks the current heading and a switch to source keeps the line.
 * `initialLine` puts the caret there once the note is loaded.
 */
export function useEditorBridge(editor: Editor, path: string, markdown: string, initialLine: number | undefined) {
  const latest = useRef(markdown);
  latest.current = markdown;

  useEffect(() => registerEditor(path, { revealLine: (line, options) => revealLine(editor, latest.current, line, options?.flash) }), [editor, path]);

  useEffect(() => {
    let timer = 0;
    const report = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (editor.isDestroyed || !editor.isFocused) return;
        const line = caretLine(editor, latest.current);
        if (line !== null) reportCaret(path, line);
      }, REPORT_DELAY_MS);
    };
    editor.on('selectionUpdate', report);
    editor.on('focus', report);
    return () => {
      window.clearTimeout(timer);
      editor.off('selectionUpdate', report);
      editor.off('focus', report);
    };
  }, [editor, path]);

  useEffect(() => {
    if (initialLine === undefined) return;
    const timer = window.setTimeout(() => (initialLine > 0 ? revealLine(editor, latest.current, initialLine) : editor.commands.focus('start')), 0);
    return () => window.clearTimeout(timer);
  }, [editor, path]);
}
