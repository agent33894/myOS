import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { viewFromFence } from '@shared/query';
import { ViewFenceView } from './ViewFenceView';

/** Markdown for a view fence. An empty body closes on the next line, as people write it. */
export const viewFence = (info: string, source: string) => (source ? `\`\`\`${info}\n${source}\n\`\`\`` : `\`\`\`${info}\n\`\`\``);

/**
 * ```` ```tasks ```` and ```` ```notes ```` fences (see docs/file-format.md#views)
 * become one atom node holding the fence as written, rendered as a live view.
 * The Markdown stays as it is until the query itself is edited.
 */
interface ViewFenceStorage {
  /** The note the editor shows, handed to each view as its `sourcePath`. */
  sourcePath: string;
}

declare module '@tiptap/core' {
  interface Storage {
    viewFence: ViewFenceStorage;
  }
}

export const ViewFence = Node.create<object, ViewFenceStorage>({
  name: 'viewFence',

  addStorage() {
    return { sourcePath: '' };
  },
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      /** The info string after the backticks: `tasks`, or `notes #meeting sort:modified`. */
      info: { default: 'tasks' },
      /** The lines inside the fence. */
      source: { default: '' },
      /** Just inserted from the `/` menu: open with the query field focused. Never written to disk. */
      fresh: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-view-fence]',
        priority: 70,
        getAttrs: (element) => ({ info: element.getAttribute('data-view-fence') ?? 'tasks', source: element.textContent ?? '' }),
      },
    ];
  },

  renderHTML({ node }) {
    return ['pre', { 'data-view-fence': node.attrs.info }, ['code', {}, node.attrs.source]];
  },

  renderText({ node }) {
    return viewFence(node.attrs.info, node.attrs.source);
  },

  markdownTokenName: 'code',

  parseMarkdown(token, helpers) {
    const fenced = token.raw?.startsWith('```') || token.raw?.startsWith('~~~');
    if (!fenced || !viewFromFence(token.lang ?? '', token.text ?? '')) return [];
    return helpers.createNode('viewFence', { info: (token.lang ?? '').trim(), source: token.text ?? '' });
  },

  renderMarkdown(node) {
    return viewFence(node.attrs?.info ?? 'tasks', node.attrs?.source ?? '');
  },

  addNodeView() {
    return ReactNodeViewRenderer(ViewFenceView, {
      // The view owns its clicks, fields, and keys; ProseMirror sees only drags.
      stopEvent: ({ event }) => !event.type.startsWith('drag') && event.type !== 'drop',
    });
  },
});
