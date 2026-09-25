import { mergeAttributes, type AnyExtension } from '@tiptap/core';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extension-placeholder';
import { renderTableToMarkdown, Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Typography } from '@tiptap/extension-typography';
import { Markdown } from '@tiptap/markdown';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Marked, type Tokens } from 'marked';
import { CodeBlockView } from './blocks/code/CodeBlockView';
import { CodeHighlight } from './blocks/code/highlight';
import { RichBlock } from './blocks/RichBlock';
import { FindInPage } from './find/plugin';
import { FocusMode } from './focus/focus';
import { resolveAssetUrl } from './links/assets';
import { WikiLinks } from './links/wikiLinks';
import { LinkSuggest } from './links/wikiSuggest';
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

// TipTap pads tables with blank lines of their own, on top of the blank line
// between blocks; trimming keeps files from growing extra empty lines.
const CompactTable = Table.extend({
  renderMarkdown: (node, helpers) => renderTableToMarkdown(node, helpers).trim(),
});

interface ExtensionOptions {
  placeholder: string;
  /** Receives keys while the "/" menu is open. */
  slashKeys?: { current: ((event: KeyboardEvent) => boolean) | null };
  /** Receives keys while the "[[" link suggestions are open. */
  linkKeys?: { current: ((event: KeyboardEvent) => boolean) | null };
}

/**
 * Inline tags (`Result<T>`, `<kbd>`) stay literal text. The editor has no node
 * for arbitrary HTML, and parsing them as HTML silently dropped them on save.
 */
const INLINE_TAG = /^(?:<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s[^<>]*)?\/?>)/;
export const markdownParser = new Marked({
  tokenizer: {
    tag(src) {
      const match = INLINE_TAG.exec(src);
      return match ? ({ type: 'text', raw: match[0], text: match[0] } as unknown as Tokens.Tag) : undefined;
    },
  },
});

/** Every extension the editor uses, configured once. Order matters for Markdown: rich blocks claim their fences before code blocks do. */
export function createExtensions({ placeholder, slashKeys = { current: null }, linkKeys = { current: null } }: ExtensionOptions): AnyExtension[] {
  return [
    StarterKit.configure({ codeBlock: false, link: false }),
    RichBlock,
    HighlightedCodeBlock,
    CodeHighlight,
    // Without these, `- [ ]` parses as a plain bullet and autosave drops the checkbox.
    TaskList,
    TaskItem.configure({ nested: true }),
    CompactTable,
    TableRow,
    TableHeader,
    TableCell,
    AssetImage.configure({ inline: true, allowBase64: true }),
    AssetLink.configure({ openOnClick: false, autolink: true, protocols: ['myos-next'] }),
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
    LinkSuggest.configure({ onKeyDown: (event) => linkKeys.current?.(event) ?? false }),
    FindInPage,
    FocusMode,
    // A function, not the ref: configure() deep-copies plain objects.
    SlashCommand.configure({ onKeyDown: (event) => slashKeys.current?.(event) ?? false }),
    Markdown.configure({ marked: markdownParser as unknown as typeof import('marked').marked }),
  ];
}
