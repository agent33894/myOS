import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

/** A task checkbox the user clicked in the rendered editor. */
export interface TaskClick {
  /** Its place among the note's `- [ ]` / `- [x]` bullet tasks, outside quotes, in document order. */
  ordinal: number;
  /** The task's text as shown. */
  text: string;
  checked: boolean;
  /** The task item's position, for the fallback toggle. */
  pos: number;
  /** The 0-based body line of the task, when the editor could pair it with its line exactly. */
  line: number | null;
}

/**
 * Task items the way the file's task lines count them: TipTap only makes
 * task items of `-`, `*`, and `+` bullets with `[ ]` or `[x]`, and a task
 * inside a quote is not a task line in the file.
 */
function taskItems(doc: PMNode): Array<{ node: PMNode; pos: number }> {
  const items: Array<{ node: PMNode; pos: number }> = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'blockquote') return false;
    if (node.type.name === 'taskItem' && (node.firstChild?.textContent.trim() ?? '')) items.push({ node, pos });
    return true;
  });
  return items;
}

/** The task whose checkbox holds `target`, or null when the click was elsewhere. */
export function taskClickAt(view: EditorView, target: EventTarget | null): TaskClick | null {
  if (!(target instanceof Element)) return null;
  const item = target.closest('ul[data-type="taskList"] > li');
  const box = target.closest('label');
  if (!item || !box || !item.contains(box) || box.parentElement !== item) return null;
  let found: { node: PMNode; pos: number } | null = null;
  view.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'taskItem' && view.nodeDOM(pos) === item) found = { node, pos };
    return true;
  });
  if (!found) return null;
  const { node, pos } = found as { node: PMNode; pos: number };
  const ordinal = taskItems(view.state.doc).findIndex((entry) => entry.pos === pos);
  return { ordinal, text: node.firstChild?.textContent ?? '', checked: Boolean(node.attrs.checked), pos, line: null };
}

/** Flip a task item's checkbox in the document, for tasks that are not task lines in the file. */
export function toggleInDocument(view: EditorView, click: TaskClick): void {
  const node = view.state.doc.nodeAt(click.pos);
  if (node?.type.name !== 'taskItem') return;
  view.dispatch(view.state.tr.setNodeMarkup(click.pos, undefined, { ...node.attrs, checked: !node.attrs.checked }));
}
