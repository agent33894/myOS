import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { matchWikiLinks } from '../../lib/artifactLinks';

// Wiki links stay plain text in the document, so Markdown round-trips
// byte-for-byte; this extension only decorates them for styling and clicks.
// A link to a page that does not exist yet is marked `is-missing`.

type Exists = (target: string) => boolean;

function decorate(doc: PMNode, exists: Exists): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || parent?.type.spec.code || node.marks.some((mark) => mark.type.spec.code)) return;
    for (const link of matchWikiLinks(node.text ?? '')) {
      const from = pos + link.index;
      const missing = !exists(link.target);
      decorations.push(
        Decoration.inline(from, from + link.length, {
          class: missing ? 'wiki-link is-missing' : 'wiki-link',
          'data-wikilink': link.target,
          ...(missing ? { title: `Create “${link.target}”` } : {}),
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

const key = new PluginKey<DecorationSet>('wiki-links');
const REFRESH = 'wiki-links-refresh';

/** A transaction that restyles links after pages were created or renamed. Not an edit and not an undo step. */
export const refreshWikiLinks = (tr: Transaction) => tr.setMeta(REFRESH, true).setMeta('preventUpdate', true).setMeta('addToHistory', false);

interface WikiLinksStorage {
  /** Whether a `[[target]]` resolves to a page; every link counts as existing until the editor says otherwise. */
  exists: Exists;
}

declare module '@tiptap/core' {
  interface Storage {
    wikiLinks: WikiLinksStorage;
  }
}

export const WikiLinks = Extension.create<object, WikiLinksStorage>({
  name: 'wikiLinks',
  addStorage() {
    return { exists: () => true };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    const exists: Exists = (target) => storage.exists(target);
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => decorate(state.doc, exists),
          apply: (tr, decorations) => (tr.docChanged || tr.getMeta(REFRESH) ? decorate(tr.doc, exists) : decorations),
        },
        props: { decorations: (state) => key.getState(state) },
      }),
    ];
  },
});
