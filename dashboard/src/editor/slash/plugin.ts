import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';

export interface SlashState {
  active: boolean;
  /** Position of the "/" that opened the menu. */
  from: number;
  /** Text typed after the "/". */
  query: string;
}

const CLOSED: SlashState = { active: false, from: 0, query: '' };
const MAX_QUERY = 24;

export const slashKey = new PluginKey<SlashState>('slash-menu');

export const closeSlash = (state: EditorState) => state.tr.setMeta(slashKey, 'close');

/** Where the menu stands after `state`, following the caret as the user types. */
function follow(prev: SlashState, state: EditorState): SlashState {
  const { selection, doc } = state;
  if (!selection.empty || selection.from <= prev.from) return CLOSED;
  const $slash = doc.resolve(prev.from);
  if ($slash.parent !== selection.$from.parent) return CLOSED;
  const text = doc.textBetween(prev.from, selection.from, '\n', '\0');
  if (!text.startsWith('/') || text.length > MAX_QUERY + 1 || /\s\s|\n/.test(text)) return CLOSED;
  return { active: true, from: prev.from, query: text.slice(1) };
}

interface SlashOptions {
  /** Keys while the menu is open; return true when handled. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Typing "/" at the start of a line or after a space opens the insert menu.
 * The plugin tracks the query; the React menu renders it and handles keys.
 */
export const SlashCommand = Extension.create<SlashOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onKeyDown: () => false };
  },

  addProseMirrorPlugins() {
    const { onKeyDown } = this.options;
    return [
      new Plugin<SlashState>({
        key: slashKey,
        state: {
          init: () => CLOSED,
          apply(tr, prev, _old, state) {
            const meta = tr.getMeta(slashKey) as number | 'close' | undefined;
            if (meta === 'close') return CLOSED;
            if (typeof meta === 'number') return { active: true, from: meta, query: '' };
            if (!prev.active) return prev;
            return follow({ ...prev, from: tr.mapping.map(prev.from) }, state);
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== '/') return false;
            const $from = view.state.doc.resolve(from);
            if ($from.parent.type.spec.code || !$from.parent.isTextblock) return false;
            const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\0');
            if (before && !/\s$/.test(before)) return false;
            view.dispatch(view.state.tr.insertText('/', from, to).setMeta(slashKey, from));
            return true;
          },
          handleKeyDown(view, event) {
            return slashKey.getState(view.state)?.active ? onKeyDown(event) : false;
          },
          handleDOMEvents: {
            blur(view) {
              if (slashKey.getState(view.state)?.active) view.dispatch(closeSlash(view.state));
              return false;
            },
          },
        },
      }),
    ];
  },
});
