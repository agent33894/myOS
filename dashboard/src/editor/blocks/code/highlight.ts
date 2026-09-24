import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { loadLanguage, tokenize } from './shiki';

const key = new PluginKey<DecorationSet>('code-highlight');

// Highlighting runs per keystroke, so tokens are cached by (language, text) and
// only the code block being edited is re-tokenized.
type Span = [from: number, to: number, color: string];
const cache = new Map<string, Span[]>();
const CACHE_LIMIT = 200;

function decorationsFor(text: string, language: string, offset: number): Decoration[] | null {
  const cacheKey = `${language}\u0000${text}`;
  let relative = cache.get(cacheKey);
  if (relative === undefined) {
    const lines = tokenize(text, language);
    if (!lines) return null;
    relative = [];
    let position = 0;
    for (const line of lines) {
      for (const token of line) {
        const end = position + token.content.length;
        if (token.color && token.content.trim()) relative.push([position, end, token.color]);
        position = end;
      }
      position += 1; // the newline between lines
    }
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, relative);
  }
  return relative.map(([from, to, color]) => Decoration.inline(offset + from, offset + to, { style: `color: ${color}` }));
}

function build(doc: PMNode, request: (language: string) => void): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return;
    const language = node.attrs.language as string | null;
    if (!language || !node.textContent) return false;
    const tokens = decorationsFor(node.textContent, language, pos + 1);
    if (tokens) decorations.push(...tokens);
    else request(language);
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

export const CodeHighlight = Extension.create({
  name: 'codeHighlight',

  addProseMirrorPlugins() {
    let refresh: (() => void) | null = null;
    const request = (language: string) => {
      void loadLanguage(language).then((ok) => ok && refresh?.());
    };

    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => build(state.doc, request),
          apply: (tr, decorations) =>
            tr.docChanged || tr.getMeta(key) ? build(tr.doc, request) : decorations.map(tr.mapping, tr.doc),
        },
        props: {
          decorations: (state) => key.getState(state),
        },
        view: (view) => {
          refresh = () => {
            if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(key, true).setMeta('addToHistory', false));
          };
          return { destroy: () => (refresh = null) };
        },
      }),
    ];
  },
});
