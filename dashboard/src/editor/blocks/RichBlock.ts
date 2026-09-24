import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { fence } from './model';
import { RichBlockView } from './nodeView';
import { blockKind } from './registry';

/**
 * Fenced code whose language is a rich block kind (```chart, ```callout, …)
 * becomes one atom node holding the fence verbatim, rendered by a React node
 * view. The Markdown on disk is unchanged until the block itself is edited.
 */
export const RichBlock = Node.create({
  name: 'richBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      language: { default: '' },
      source: { default: '' },
      /** Just inserted from the slash menu: open in edit mode. Never written to disk. */
      fresh: { default: false, rendered: false },
    };
  },

  // Copy and paste inside the editor keeps blocks intact.
  parseHTML() {
    return [
      {
        tag: 'pre[data-rich-block]',
        priority: 60,
        getAttrs: (element) => ({
          language: element.getAttribute('data-rich-block') ?? '',
          source: element.textContent ?? '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return ['pre', { 'data-rich-block': node.attrs.language }, ['code', {}, node.attrs.source]];
  },

  renderText({ node }) {
    return fence(node.attrs.language, node.attrs.source);
  },

  markdownTokenName: 'code',

  parseMarkdown(token, helpers) {
    if (!token.raw?.startsWith('```')) return [];
    const source = token.text ?? '';
    if (!blockKind(token.lang, source)) return [];
    return helpers.createNode('richBlock', { language: token.lang ?? '', source });
  },

  renderMarkdown(node) {
    return fence(node.attrs?.language ?? '', node.attrs?.source ?? '');
  },

  addNodeView() {
    return ReactNodeViewRenderer(RichBlockView, {
      // The block owns every event inside it (forms, menus, keys); ProseMirror
      // only sees drags.
      stopEvent: ({ event }) => !event.type.startsWith('drag') && event.type !== 'drop',
    });
  },
});
