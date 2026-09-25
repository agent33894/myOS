import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { extractTasks } from '@shared/tasks';
import { TASK_LINE } from '@shared/tasks/parse';

const box = Decoration.mark({ class: 'cm-task-box', attributes: { title: 'Check or uncheck' } });
const done = Decoration.line({ class: 'cm-task-done' });

/** The `[ ]` of every task line (outside code fences, as the file format counts them). */
function build(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const task of extractTasks(state.doc.toString(), '')) {
    const line = state.doc.line(task.line);
    const match = TASK_LINE.exec(line.text);
    if (!match) continue;
    if (task.status !== 'open') builder.add(line.from, line.from, done);
    const start = line.from + match[1].length - 1;
    builder.add(start, start + match[2].length + 2, box);
  }
  return builder.finish();
}

/**
 * Task checkboxes in source mode: `[ ]` is clickable and checks the task off
 * through the host (the same task line operation as everywhere else), so the
 * ✅ date and repeat lines are written exactly.
 */
export function taskBoxes(onToggle: (line: number, text: string) => void) {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = build(view.state);
        }
        update(update: ViewUpdate) {
          if (update.docChanged) this.decorations = build(update.state);
        }
      },
      { decorations: (plugin) => plugin.decorations },
    ),
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const target = event.target instanceof Element ? event.target.closest('.cm-task-box') : null;
        if (!target || event.button !== 0) return false;
        event.preventDefault();
        const line = view.state.doc.lineAt(view.posAtDOM(target));
        onToggle(line.number - 1, line.text);
        return true;
      },
    }),
  ];
}
