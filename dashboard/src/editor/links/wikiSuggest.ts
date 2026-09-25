import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';

export interface LinkSuggestState {
  active: boolean;
  /** Position of the first "[" of "[[". */
  from: number;
  /** Text typed after "[[". */
  query: string;
}

const CLOSED: LinkSuggestState = { active: false, from: 0, query: '' };
const MAX_QUERY = 80;

export const linkSuggestKey = new PluginKey<LinkSuggestState>('link-suggest');

export const closeLinkSuggest = (state: EditorState) => state.tr.setMeta(linkSuggestKey, 'close');

/** Where the popover stands after `state`, following the caret as the user types. */
function follow(prev: LinkSuggestState, state: EditorState): LinkSuggestState {
  const { selection, doc } = state;
  if (!selection.empty || selection.from < prev.from + 2) return CLOSED;
  const $start = doc.resolve(prev.from);
  if ($start.parent !== selection.$from.parent) return CLOSED;
  const text = doc.textBetween(prev.from, selection.from, '\n', '\0');
  if (!text.startsWith('[[') || text.length > MAX_QUERY + 2 || /[[\]\n|\0]/.test(text.slice(2))) return CLOSED;
  return { active: true, from: prev.from, query: text.slice(2) };
}

interface LinkSuggestOptions {
  /** Keys while the popover is open; return true when handled. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Typing "[[" opens link suggestions. Like the "/" menu, the plugin only
 * tracks the query; the React popover renders it and handles keys. The link
 * itself is plain `[[Title]]` text, so Markdown round-trips unchanged.
 */
export const LinkSuggest = Extension.create<LinkSuggestOptions>({
  name: 'linkSuggest',

  addOptions() {
    return { onKeyDown: () => false };
  },

  addProseMirrorPlugins() {
    const { onKeyDown } = this.options;
    return [
      new Plugin<LinkSuggestState>({
        key: linkSuggestKey,
        state: {
          init: () => CLOSED,
          apply(tr, prev, _old, state) {
            const meta = tr.getMeta(linkSuggestKey) as number | 'close' | undefined;
            if (meta === 'close') return CLOSED;
            if (typeof meta === 'number') return follow({ active: true, from: meta, query: '' }, state);
            if (!prev.active) return prev;
            return follow({ ...prev, from: tr.mapping.map(prev.from) }, state);
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== '[') return false;
            const $from = view.state.doc.resolve(from);
            if ($from.parent.type.spec.code || !$from.parent.isTextblock || $from.marks().some((mark) => mark.type.spec.code)) return false;
            const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\0');
            if (!before.endsWith('[') || before.endsWith('[[')) return false;
            view.dispatch(view.state.tr.insertText('[', from, to).setMeta(linkSuggestKey, from - 1));
            return true;
          },
          handleKeyDown(view, event) {
            return linkSuggestKey.getState(view.state)?.active ? onKeyDown(event) : false;
          },
          handleDOMEvents: {
            blur(view) {
              if (linkSuggestKey.getState(view.state)?.active) view.dispatch(closeLinkSuggest(view.state));
              return false;
            },
          },
        },
      }),
    ];
  },
});
