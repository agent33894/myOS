import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Typography } from '@tiptap/extension-typography';
import { TextAlign } from '@tiptap/extension-text-align';
import { mergeAttributes } from '@tiptap/core';
import { parseMarkdownChartBlock } from '../../../utils/chartBlocks';
import { resolveVaultAssetUrl } from '../../../utils/assetPaths';

export type RichBlockLanguage = 'chart' | 'mermaid' | 'callout' | 'kpi' | 'roadmap';

interface ParsedFencedCodeBlock {
  language: string;
  body: string;
}

interface ArtifactRendererExtensionOptions {
  placeholder: string;
}

const VaultImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      src: resolveVaultAssetUrl(HTMLAttributes.src as string) ?? HTMLAttributes.src,
    })];
  },
});

const VaultLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      href: resolveVaultAssetUrl(HTMLAttributes.href as string) ?? HTMLAttributes.href,
    }), 0];
  },
});

function toRichBlockLanguage(value: string | null | undefined): RichBlockLanguage | null {
  const normalized = (value || '').toLowerCase().trim();
  if (normalized === 'chart') return 'chart';
  if (normalized === 'mermaid') return 'mermaid';
  if (normalized === 'callout') return 'callout';
  if (normalized === 'kpi') return 'kpi';
  if (normalized === 'roadmap') return 'roadmap';
  return null;
}

export function parseFencedCodeBlock(value: string): ParsedFencedCodeBlock | null {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  const match = normalized.match(/^```([a-z0-9_-]+)[ \t]*\n([\s\S]*?)\n```$/i);
  if (!match) return null;
  return {
    language: match[1].toLowerCase(),
    body: match[2],
  };
}

export function resolveRichBlockLanguage(
  languageAttr: unknown,
  codeText: string
): RichBlockLanguage | null {
  const explicitLanguage = toRichBlockLanguage(typeof languageAttr === 'string' ? languageAttr : null);
  if (explicitLanguage) return explicitLanguage;
  return parseMarkdownChartBlock(codeText).ok ? 'chart' : null;
}

export function createArtifactRendererExtensions({
  placeholder,
}: ArtifactRendererExtensionOptions) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: false,
    }),
    CodeBlock.configure({
      HTMLAttributes: {
        class: 'bg-foreground  text-muted-foreground rounded-md p-4 font-mono text-sm',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse border border-border ',
      },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class: 'border border-border  bg-secondary  px-4 py-2 font-semibold',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-border  px-4 py-2',
      },
    }),
    VaultImage.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full rounded-lg',
      },
    }),
    Placeholder.configure({
      placeholder,
      showOnlyCurrent: false,
      showOnlyWhenEditable: false,
    }),
    Typography,
    Markdown,
    VaultLink.configure({
      openOnClick: false,
      protocols: ['myos'],
      HTMLAttributes: {
        class: 'artifact-markdown-link',
      },
    }),
  ];
}
