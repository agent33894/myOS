import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { matchWikiLinks } from '../../../utils/artifactLinks';

// Wiki links stay plain text in the document, so Markdown round-trips
// byte-for-byte; this extension only decorates them.

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || parent?.type.name === 'codeBlock') return;
    if (node.marks.some((mark) => mark.type.name === 'code')) return;
    for (const link of matchWikiLinks(node.text ?? '')) {
      const start = pos + link.index;
      decorations.push(
        Decoration.inline(start, start + link.length, {
          class: 'chronicle-wikilink',
          'data-wikilink': link.target,
        }),
      );
    }
  });
  return decorations.length > 0 ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

const WIKI_LINK_PLUGIN_KEY = new PluginKey<DecorationSet>('wiki-links');

export const WikiLinks = Extension.create({
  name: 'wikiLinks',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: WIKI_LINK_PLUGIN_KEY,
        state: {
          init: (_config, state) => buildDecorations(state.doc),
          apply: (transaction, decorations) =>
            transaction.docChanged ? buildDecorations(transaction.doc) : decorations,
        },
        props: {
          decorations: (state) => WIKI_LINK_PLUGIN_KEY.getState(state),
        },
      }),
    ];
  },
});
