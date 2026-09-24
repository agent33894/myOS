import type { Editor, Range } from '@tiptap/core';
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Table,
  type LucideIcon,
} from 'lucide-react';
import { BLOCKS, newBlockSource, type BlockKind } from '../blocks/registry';

export interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  group: 'basic' | 'more';
  /** Runs after the typed "/query" has been removed. */
  run: (editor: Editor, actions: { attachFile: () => void }) => void;
}

const basic = (
  id: string,
  label: string,
  description: string,
  icon: LucideIcon,
  keywords: string[],
  run: SlashItem['run'],
): SlashItem => ({ id, label, description, icon, keywords, group: 'basic', run });

const heading = (level: 1 | 2 | 3, icon: LucideIcon, description: string) =>
  basic(`h${level}`, `Heading ${level}`, description, icon, ['title', 'heading', `h${level}`], (editor) =>
    editor.chain().focus().setNode('heading', { level }).run(),
  );

const richBlock = (kind: BlockKind): SlashItem => {
  const { label, description, icon, keywords } = BLOCKS[kind];
  return {
    id: kind,
    label,
    description,
    icon,
    keywords: [kind, ...keywords],
    group: 'more',
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent([{ type: 'richBlock', attrs: { language: kind, source: newBlockSource(kind), fresh: true } }, { type: 'paragraph' }])
        .run(),
  };
};

/** Everything `/` can insert: basics first, richer blocks under "More blocks". */
export const SLASH_ITEMS: SlashItem[] = [
  basic('text', 'Text', 'Plain writing', Pilcrow, ['paragraph', 'plain'], (editor) => editor.chain().focus().setParagraph().run()),
  heading(1, Heading1, 'Large section heading'),
  heading(2, Heading2, 'Medium section heading'),
  heading(3, Heading3, 'Small section heading'),
  basic('bullets', 'Bulleted list', 'A simple list', List, ['unordered', 'bullet', 'ul'], (editor) => editor.chain().focus().toggleBulletList().run()),
  basic('numbers', 'Numbered list', 'A list with numbers', ListOrdered, ['ordered', 'ol', '1.'], (editor) => editor.chain().focus().toggleOrderedList().run()),
  basic('todo', 'To-do list', 'Things to check off', ListTodo, ['task', 'checkbox', 'check'], (editor) => editor.chain().focus().toggleTaskList().run()),
  basic('quote', 'Quote', 'Set a passage apart', Quote, ['blockquote', 'citation'], (editor) => editor.chain().focus().toggleBlockquote().run()),
  basic('divider', 'Divider', 'A line between sections', Minus, ['hr', 'rule', 'separator'], (editor) => editor.chain().focus().setHorizontalRule().run()),
  basic('code', 'Code', 'Code with highlighting', Code2, ['snippet', 'pre', 'program'], (editor) => editor.chain().focus().setCodeBlock().run()),
  basic('table', 'Table', 'Rows and columns', Table, ['grid', 'columns'], (editor) =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  ),
  basic('file', 'Image or file', 'Attach from your computer', ImagePlus, ['image', 'picture', 'photo', 'attachment', 'upload', 'pdf'], (_editor, actions) =>
    actions.attachFile(),
  ),
  ...(Object.keys(BLOCKS) as BlockKind[]).map(richBlock),
];

/** How well `item` matches: label prefix beats a label word beats a keyword; null when it doesn't. */
function score(item: SlashItem, query: string): number | null {
  const label = item.label.toLowerCase();
  if (label.startsWith(query)) return 0;
  const starts = (text: string) => text.split(/[\s-]+/).some((word) => word.startsWith(query));
  if (starts(label)) return 1;
  return item.keywords.some((keyword) => starts(keyword.toLowerCase())) ? 2 : null;
}

/** All items when the query is empty; otherwise the matches, best first. */
export function filterItems(query: string): SlashItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SLASH_ITEMS;
  return SLASH_ITEMS.map((item, order) => ({ item, order, score: score(item, needle) }))
    .filter((entry): entry is { item: SlashItem; order: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map((entry) => entry.item);
}

export function removeQuery(editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
}
