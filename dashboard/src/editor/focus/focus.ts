import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/**
 * Focus mode inside the editor: typewriter scrolling keeps the caret's line
 * near the middle of the window, and (optionally) every block but the one
 * you are writing in softly dims. Decorations only; the document never changes.
 */

export interface FocusOptions {
  /** Keep the caret line vertically centered. */
  typewriter: boolean;
  /** Dim every top-level block except the current one. */
  dim: boolean;
}

const OFF: FocusOptions = { typewriter: false, dim: false };
const focusKey = new PluginKey<FocusOptions>('focus-mode');

/** Turn focus behaviour on or off. Not an edit and not an undo step. */
export const setFocusMode = (tr: Transaction, options: FocusOptions) =>
  tr.setMeta(focusKey, options).setMeta('preventUpdate', true).setMeta('addToHistory', false);

interface FocusStorage {
  /** The current options, so a document loaded while focus mode is on starts in it. */
  options: FocusOptions;
}

declare module '@tiptap/core' {
  interface Storage {
    focusMode: FocusStorage;
  }
}

function currentBlock(state: EditorState): DecorationSet {
  const options = focusKey.getState(state);
  if (!options?.dim || state.doc.childCount === 0) return DecorationSet.empty;
  const $from = state.selection.$from;
  const index = $from.depth === 0 ? Math.min($from.index(0), state.doc.childCount - 1) : $from.index(0);
  const start = $from.depth === 0 ? state.doc.resolve(0).posAtIndex(index) : $from.before(1);
  const node = state.doc.child(index);
  return DecorationSet.create(state.doc, [Decoration.node(start, start + node.nodeSize, { class: 'is-focused' })]);
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** Bring the caret's line to the vertical middle of the scrolling page, without animation (it would chase every keystroke). */
function centerCaret(view: EditorView) {
  const container = scrollParent(view.dom);
  if (!container) return;
  const caret = view.coordsAtPos(view.state.selection.head);
  const box = container.getBoundingClientRect();
  const offset = (caret.top + caret.bottom) / 2 - (box.top + box.height / 2);
  if (Math.abs(offset) > 4) container.scrollTop += offset;
}

export const FocusMode = Extension.create<object, FocusStorage>({
  name: 'focusMode',
  addStorage() {
    return { options: OFF };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin<FocusOptions>({
        key: focusKey,
        state: {
          init: () => storage.options,
          apply: (tr, options) => {
            const next = tr.getMeta(focusKey) as FocusOptions | undefined;
            if (next) storage.options = next;
            return next ?? options;
          },
        },
        props: { decorations: currentBlock },
        view: () => ({
          update(view, previous) {
            const options = focusKey.getState(view.state);
            if (!options?.typewriter || !view.hasFocus()) return;
            const turnedOn = !focusKey.getState(previous)?.typewriter;
            if (turnedOn || !view.state.selection.eq(previous.selection) || !view.state.doc.eq(previous.doc)) {
              requestAnimationFrame(() => {
                if (!view.isDestroyed) centerCaret(view);
              });
            }
          },
        }),
      }),
    ];
  },
});
