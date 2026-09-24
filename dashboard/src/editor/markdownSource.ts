import type { Editor, JSONContent } from '@tiptap/core';
import type { MarkdownManager } from '@tiptap/markdown';
import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Editing one paragraph must not restyle the rest of the file: `*` bullets,
 * hand-aligned tables, `1)` lists, and blank-line habits stay as written.
 * A document is parsed block by block, remembering each top-level block's
 * source text; serializing reuses that text for every block the user did
 * not touch. ProseMirror keeps untouched nodes as the same objects across
 * edits, so node identity is the "untouched" test.
 */

interface Span {
  /** The block's source, without trailing newlines. */
  raw: string;
  /** Source between the previous block and this one (blank lines, link definitions). */
  before: string;
  /** How many top-level nodes the block parsed into; only 1:1 blocks are reused. */
  nodes: number;
}

export interface SourceMap {
  spans: Span[];
  /** Source after the last block. */
  after: string;
  /** Filled by `attach` once the document is in the editor. */
  byNode: WeakMap<PMNode, number>;
}

interface Token {
  type?: string;
  raw: string;
}

type TokenParser = { parseToken?: (token: Token) => JSONContent | JSONContent[] | null };

/** Parse exactly as `MarkdownManager.parse` does, recording where each block came from. */
export function parseWithSource(manager: MarkdownManager, markdown: string): { doc: JSONContent; source: SourceMap | null } {
  const parseToken = (manager as unknown as TokenParser).parseToken?.bind(manager);
  if (!parseToken) return { doc: manager.parse(markdown), source: null };

  const content: JSONContent[] = [];
  const spans: Span[] = [];
  // Blocks are located in the source itself, so text the lexer drops
  // (link definitions) survives in the gaps between them.
  let cursor = 0;
  let intact = true;
  for (const token of manager.instance.lexer(markdown) as Token[]) {
    const parsed = token.type ? parseToken(token) : null;
    const nodes = parsed === null ? [] : Array.isArray(parsed) ? parsed : [parsed];
    if (nodes.length === 0) continue;
    const raw = token.raw.replace(/\n+$/, '');
    const start = markdown.indexOf(raw, cursor);
    if (start < 0) intact = false;
    spans.push({ raw, before: intact ? markdown.slice(cursor, start) : '', nodes: nodes.length });
    content.push(...nodes);
    if (intact) cursor = start + raw.length;
  }
  const doc = { type: 'doc', content };
  return { doc, source: intact ? { spans, after: markdown.slice(cursor), byNode: new WeakMap() } : null };
}

/**
 * Link the editor's top-level nodes to their spans. Plugins may append a
 * trailing empty paragraph when the document loads; anything else that
 * breaks the 1:1 order turns preservation off for this document.
 */
export function attach(source: SourceMap | null, doc: PMNode): SourceMap | null {
  if (!source) return null;
  const expected = source.spans.reduce((total, span) => total + span.nodes, 0);
  const trailingEmpty = doc.childCount === expected + 1 && doc.lastChild?.type.name === 'paragraph' && doc.lastChild.content.size === 0;
  if (doc.childCount !== expected && !trailingEmpty) return null;
  let child = 0;
  source.spans.forEach((span, index) => {
    if (span.nodes === 1) source.byNode.set(doc.child(child), index);
    child += span.nodes;
  });
  return source;
}

/** The document as Markdown, reusing the original text of every untouched block. */
export function serializeWithSource(editor: Editor, source: SourceMap | null): string {
  if (!source) return editor.getMarkdown();
  const { doc } = editor.state;
  const parts: string[] = [];
  const isTrailingEmpty = (index: number) =>
    index === doc.childCount - 1 && doc.child(index).type.name === 'paragraph' && doc.child(index).content.size === 0;
  // The span the previous node stood for, so neighbours keep their original spacing.
  let previous: number | null = null;
  doc.forEach((node, _offset, index) => {
    let span = source.byNode.get(node);
    let text: string;
    if (span === undefined) {
      text = editor.markdown!.serialize({ type: 'doc', content: [node.toJSON()] }).replace(/\n+$/, '');
      if (!text && isTrailingEmpty(index)) return;
      // An edited block standing where an original one was keeps that block's place.
      const replaced = previous === null ? (parts.length ? undefined : 0) : previous + 1;
      const atEnd = index + 1 === doc.childCount || isTrailingEmpty(index + 1);
      const next = atEnd ? source.spans.length : source.byNode.get(doc.child(index + 1));
      span = replaced !== undefined && next === replaced + 1 && replaced < source.spans.length ? replaced : undefined;
    } else {
      text = source.spans[span].raw;
    }
    const followsOriginalOrder = span !== undefined && (previous === null ? parts.length === 0 && span === 0 : span === previous + 1);
    parts.push(followsOriginalOrder ? source.spans[span!].before : parts.length ? '\n\n' : '', text);
    previous = span ?? null;
  });
  if (previous === source.spans.length - 1) parts.push(source.after);
  else if (source.after.endsWith('\n')) parts.push('\n');
  return parts.join('');
}
