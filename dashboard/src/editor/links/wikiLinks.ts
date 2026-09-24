import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { matchWikiLinks } from '../../utils/artifactLinks';

// Wiki links stay plain text in the document, so Markdown round-trips
// byte-for-byte; this extension only decorates them for styling and clicks.

function decorate(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || parent?.type.spec.code || node.marks.some((mark) => mark.type.spec.code)) return;
    for (const link of matchWikiLinks(node.text ?? '')) {
      const from = pos + link.index;
      decorations.push(Decoration.inline(from, from + link.length, { class: 'wiki-link', 'data-wikilink': link.target }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

const key = new PluginKey<DecorationSet>('wiki-links');

export const WikiLinks = Extension.create({
  name: 'wikiLinks',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => decorate(state.doc),
          apply: (tr, decorations) => (tr.docChanged ? decorate(tr.doc) : decorations),
        },
        props: { decorations: (state) => key.getState(state) },
      }),
    ];
  },
});
