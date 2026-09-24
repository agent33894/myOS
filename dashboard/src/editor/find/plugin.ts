import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface FindState {
  query: string;
  matches: Array<{ from: number; to: number }>;
  /** Index of the current match. */
  current: number;
  decorations: DecorationSet;
}

type FindMeta = { query: string } | { current: number };

export const findKey = new PluginKey<FindState>('find-in-page');

function search(doc: PMNode, query: string): FindState['matches'] {
  const needle = query.toLowerCase();
  if (!needle) return [];
  const matches: FindState['matches'] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Search each block's text as one string so matches can span marks.
    const text = node.textBetween(0, node.content.size, undefined, '￼').toLowerCase();
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
      matches.push({ from: pos + 1 + at, to: pos + 1 + at + needle.length });
    }
    return false;
  });
  return matches;
}

function withDecorations(doc: PMNode, state: Omit<FindState, 'decorations'>): FindState {
  const decorations = state.matches.map((match, index) =>
    Decoration.inline(match.from, match.to, { class: index === state.current ? 'find-match find-match-current' : 'find-match' }),
  );
  return { ...state, decorations: DecorationSet.create(doc, decorations) };
}

export const setFind = (state: EditorState, meta: FindMeta) => state.tr.setMeta(findKey, meta).setMeta('addToHistory', false);

/** Highlights every match of the find bar's query; the React find bar drives it through `setFind`. */
export const FindInPage = Extension.create({
  name: 'findInPage',
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => ({ query: '', matches: [], current: 0, decorations: DecorationSet.empty }),
          apply(tr, prev) {
            const meta = tr.getMeta(findKey) as FindMeta | undefined;
            if (meta && 'current' in meta) return withDecorations(tr.doc, { ...prev, current: meta.current });
            const query = meta ? meta.query : prev.query;
            if (!meta && !tr.docChanged) return prev;
            if (!query) return { query, matches: [], current: 0, decorations: DecorationSet.empty };
            const matches = search(tr.doc, query);
            const current = meta ? 0 : Math.min(prev.current, Math.max(0, matches.length - 1));
            return withDecorations(tr.doc, { query, matches, current });
          },
        },
        props: { decorations: (state) => findKey.getState(state)?.decorations },
      }),
    ];
  },
});
