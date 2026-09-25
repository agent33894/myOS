import { useRef } from 'react';
import { toast } from 'sonner';
import { formatLocalDate } from '@shared/date';
import { extractTasks, toggleTaskLine, type Task } from '@shared/tasks';
import { toggleTask } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import type { TaskClick } from '../../editor';
import { sameTaskText } from '../../editor/lines';

interface DocumentLike {
  content: string | null;
  dirty: boolean;
  edit: (content: string) => void;
  saveNow: () => Promise<void>;
}

// TipTap makes task items only of `-`, `*`, `+` bullets with `[ ]` or `[x]`.
const RENDERED_TASK = /^\s*[-*+]\s+\[[ xX]\]\s/;

const failed = (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not change that task');

/**
 * Checking a task from the editor, in either mode. It goes through the task
 * line operation (docs/file-format.md#tasks), so `✅ date` is added or removed
 * and a repeating task gains its next occurrence, on that line only. Unsaved
 * edits are saved first, so the line is found where the file has it.
 */
export function useTaskToggle(path: string, doc: DocumentLike) {
  const latest = useRef(doc);
  latest.current = doc;

  /** Toggle the task on body line `line` (0-based) that reads `raw`. */
  async function toggleLine(line: number, raw: string): Promise<boolean> {
    if (latest.current.dirty) await latest.current.saveNow();
    if (latest.current.dirty) return true; // The save did not go through (a conflict); its banner explains.
    const { notes, bodies } = useDataStore.getState();
    const body = bodies[path]?.content ?? latest.current.content;
    if (body === null) return false;
    const inBody = extractTasks(body, path);
    const index = inBody.findIndex((task) => task.line === line + 1 && task.raw === raw.replace(/\r$/, ''));
    if (index < 0) return false;
    // The same task in the file's own index, where lines count the frontmatter too.
    const inFile = (notes[path]?.tasks ?? []).filter((task) => task.line > 0);
    const task: Task | undefined = inFile[index];
    try {
      if (task && task.raw === inBody[index].raw) {
        await toggleTask(task);
        return true;
      }
      // Not in the file's task index (a `type: todo` file): the same line edit, saved like typing.
      const next = toggleTaskLine(body, line + 1, inBody[index].raw, formatLocalDate());
      if (next === null) return false;
      latest.current.edit(next);
      await latest.current.saveNow();
    } catch (error) {
      failed(error);
    }
    return true;
  }

  /** Rendered mode: find the clicked task item's line by its place among task items, checked by its text. */
  async function fromRendered(click: TaskClick): Promise<boolean> {
    const body = latest.current.content;
    if (body === null) return false;
    const tasks = extractTasks(body, path).filter((task) => RENDERED_TASK.test(task.raw));
    const fits = (task: Task | undefined) => task && (task.status === 'done') === click.checked && sameTaskText(task.raw, click.text);
    const direct = tasks[click.ordinal];
    const matches = fits(direct) ? [direct] : tasks.filter(fits);
    if (matches.length !== 1) return false;
    return toggleLine(matches[0].line - 1, matches[0].raw);
  }

  /** Source mode: the line is known exactly. */
  function fromSource(line: number, text: string): void {
    void toggleLine(line, text).then((done) => {
      if (!done) toast('That line is not a task.');
    });
  }

  return { fromRendered, fromSource };
}
