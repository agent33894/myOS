import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { formatLocalDate } from '@shared/date';

// Task dates, repeats, and tags stay plain text in the document, so the file
// round-trips byte for byte; this extension only dresses them as soft chips.

interface Token {
  from: number;
  to: number;
  kind: 'date' | 'repeat' | 'tag';
  /** The date, for date tokens. */
  date?: string;
  /** What introduces a date: 📅, ⏳, 🛫, ✅, or `due:`. */
  mark?: string;
}

const TOKENS =
  /(📅|⏳|🛫|✅|➕|❌)\uFE0F?\s?(\d{4}-\d{2}-\d{2})|(?<=^|\s)(due:)(\d{4}-\d{2}-\d{2})(?=\s|$)|🔁\uFE0F?\s?[a-zA-Z0-9, ]*[a-zA-Z0-9]|(?<=^|\s)#[\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*/gu;

/** Chips in one run of text. */
function tokensIn(text: string): Token[] {
  return [...text.matchAll(TOKENS)].map((match) => {
    const from = match.index ?? 0;
    const to = from + match[0].length;
    if (match[2] || match[4]) return { from, to, kind: 'date', date: match[2] ?? match[4], mark: match[1] ?? match[3] };
    return { from, to, kind: match[0].startsWith('#') ? 'tag' : 'repeat' };
  });
}

const LABELS: Record<string, string> = { '📅': 'Due', '⏳': 'Scheduled', '🛫': 'Starts', '✅': 'Done', '➕': 'Created', '❌': 'Cancelled', 'due:': 'Due' };

function decorate(doc: PMNode, today: string): DecorationSet {
  const decorations: Decoration[] = [];
  let openTask = false;
  doc.descendants((node, pos, parent) => {
    if (node.type.name === 'taskItem') openTask = !node.attrs.checked;
    if (!node.isText || parent?.type.spec.code || node.marks.some((mark) => mark.type.spec.code || mark.type.name === 'link')) return;
    const inTask = parent !== null && doc.resolve(pos).node(-1)?.type.name === 'taskItem';
    for (const token of tokensIn(node.text ?? '')) {
      if (token.kind !== 'tag' && !inTask) continue;
      // A due date (\uD83D\uDCC5 or due:) that has passed on an open task reads as late.
      const late = LABELS[token.mark ?? ''] === 'Due' && openTask && token.date! < today;
      const label = token.kind === 'date' ? `${LABELS[token.mark ?? ''] ?? 'Date'} ${token.date}` : undefined;
      decorations.push(
        Decoration.inline(pos + token.from, pos + token.to, {
          class: `md-chip md-chip-${token.kind}${late ? ' is-late' : ''}`,
          ...(label ? { title: late ? `${label}, late` : label } : {}),
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

const key = new PluginKey<{ set: DecorationSet; day: string }>('task-tokens');

/** Soft chips for task dates (📅 ⏳ 🛫 ✅ and due:), repeats (🔁), and #tags. Never an edit. */
export const TaskTokens = Extension.create({
  name: 'taskTokens',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_config, state) => ({ set: decorate(state.doc, formatLocalDate()), day: formatLocalDate() }),
          apply: (tr, previous) => {
            const day = formatLocalDate();
            return tr.docChanged || day !== previous.day ? { set: decorate(tr.doc, day), day } : previous;
          },
        },
        props: { decorations: (state) => key.getState(state)?.set },
      }),
    ];
  },
});
