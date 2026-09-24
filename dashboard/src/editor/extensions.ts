import { mergeAttributes, type AnyExtension } from '@tiptap/core';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Typography } from '@tiptap/extension-typography';
import { Markdown } from '@tiptap/markdown';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CodeBlockView } from './blocks/code/CodeBlockView';
import { CodeHighlight } from './blocks/code/highlight';
import { RichBlock } from './blocks/RichBlock';
import { FindInPage } from './find/plugin';
import { resolveAssetUrl } from './links/assets';
import { WikiLinks } from './links/wikiLinks';
import { SlashCommand } from './slash/plugin';

// Workspace assets (`assets/…`) render through the app's myos:// protocol; the
// Markdown keeps the relative path.
const AssetImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: resolveAssetUrl(HTMLAttributes.src) ?? HTMLAttributes.src })];
  },
});

const AssetLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { href: resolveAssetUrl(HTMLAttributes.href) ?? HTMLAttributes.href }), 0];
  },
});

const HighlightedCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, {
      // The language picker and copy button handle their own events.
      stopEvent: ({ event }) => event.target instanceof Element && Boolean(event.target.closest('[data-block-chrome]')),
    });
  },
});

interface ExtensionOptions {
  placeholder: string;
  /** Receives keys while the "/" menu is open. */
  slashKeys?: { current: ((event: KeyboardEvent) => boolean) | null };
}

/** Every extension the editor uses, configured once. Order matters for Markdown: rich blocks claim their fences before code blocks do. */
export function createExtensions({ placeholder, slashKeys = { current: null } }: ExtensionOptions): AnyExtension[] {
  return [
    StarterKit.configure({ codeBlock: false, link: false }),
    RichBlock,
    HighlightedCodeBlock,
    CodeHighlight,
    // Without these, `- [ ]` parses as a plain bullet and autosave drops the checkbox.
    TaskList,
    TaskItem.configure({ nested: true }),
    Table,
    TableRow,
    TableHeader,
    TableCell,
    AssetImage.configure({ inline: true, allowBase64: true }),
    AssetLink.configure({ openOnClick: false, autolink: true, protocols: ['myos'] }),
    Placeholder.configure({
      showOnlyCurrent: true,
      includeChildren: false,
      placeholder: ({ editor, node }) => {
        if (node.type.name === 'heading') return 'Heading';
        return editor.isEmpty ? placeholder : '';
      },
    }),
    Typography,
    WikiLinks,
    FindInPage,
    SlashCommand.configure({ onKeyDown: slashKeys }),
    Markdown,
  ];
}
