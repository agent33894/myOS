import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatLocalDate, nextMonday, parseLocalDate, shiftDate } from '@shared/date';
import type { Task, TaskDateField } from '@shared/tasks';
import { go, openNote, toNoteUrl } from '../../app/navigation';
import { editTask, setTaskDate, toggleTask } from '../../data/gateway';
import { undo } from '../../data/undo';
import { setSplit, showTab, useUIStore } from '../../store/ui';
import { bodyWithTag, cleanTag } from './taskEdits';

/*
 * What a task row can do. Every write goes through the gateway (which
 * records undo) and confirms with a short toast that offers Undo.
 */

const message = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

function confirm(text: string) {
  toast.success(text, {
    action: {
      label: 'Undo',
      onClick: () => void undo().catch((error: unknown) => toast.error(message(error, 'Could not undo that'))),
    },
  });
}

async function write(run: () => Promise<unknown>, done: string, failed: string): Promise<void> {
  try {
    await run();
    confirm(done);
  } catch (error) {
    toast.error(message(error, failed));
  }
}

const short = (text: string) => (text.length > 48 ? `${text.slice(0, 47)}…` : text);

/** Check a task off (a repeating task gains its next copy) or uncheck it. */
export const toggle = (task: Task) =>
  write(() => toggleTask(task), task.status === 'open' ? `Done · ${short(task.text)}` : `Reopened · ${short(task.text)}`, 'Could not change that task');

const FIELD_WORD: Record<TaskDateField, string> = { due: 'Due', scheduled: 'Scheduled', start: 'Starts' };

/** Set (or with null, clear) one of the task's dates; writes only that emoji token. */
export function setDate(task: Task, field: TaskDateField, date: string | null): Promise<void> {
  if ((task[field] ?? null) === date) return Promise.resolve();
  const done = date ? `${FIELD_WORD[field]} ${dayLabel(date)}` : `${FIELD_WORD[field]} date cleared`;
  return write(() => setTaskDate(task, field, date), done, 'Could not change that date');
}

/** Add `#tag` to a task line, after its description. */
export function addTag(task: Task, input: string): Promise<void> {
  const tag = cleanTag(input);
  if (!tag) {
    toast.error('A tag is one word, such as release or work/api.');
    return Promise.resolve();
  }
  const body = bodyWithTag(task.raw, tag);
  if (body === null) {
    toast(`Already tagged #${tag}`);
    return Promise.resolve();
  }
  return write(() => editTask(task, body), `Tagged #${tag}`, 'Could not tag that task');
}

/** The quick picks shown for a date: today, tomorrow, and next Monday. */
export function quickDates(today = formatLocalDate()) {
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: shiftDate(today, 1) },
    { label: 'Next week', date: formatLocalDate(nextMonday(parseLocalDate(today))) },
  ];
}

/** "Today", "Tomorrow", "Yesterday", "Fri", "Oct 2", or "Oct 2, 2027". */
export function dayLabel(date: string, today = formatLocalDate()): string {
  if (date === today) return 'Today';
  if (date === shiftDate(today, 1)) return 'Tomorrow';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  const day = parseLocalDate(date);
  if (date > today && date <= shiftDate(today, 6)) return format(day, 'EEE');
  return format(day, date.slice(0, 4) === today.slice(0, 4) ? 'MMM d' : 'MMM d, yyyy');
}

/** The note URL that opens a task's file at its line (`&line=` is read by the note tab). */
export const taskUrl = (task: Pick<Task, 'path' | 'line'>) => (task.line > 0 ? `${toNoteUrl(task.path)}&line=${task.line}` : toNoteUrl(task.path));

/**
 * Open a task's file at its line. `beside` opens it to the side of the
 * note that was on screen (or last open), leaving that note in front.
 */
export function openTask(task: Pick<Task, 'path' | 'line'>, { beside = false } = {}): void {
  const { tabs, activeTab } = useUIStore.getState();
  const current = activeTab ?? (tabs.length ? tabs.length - 1 : null);
  const main = current === null ? null : tabs[current]?.path;
  if (!beside || !main || main === task.path) {
    go(taskUrl(task));
    return;
  }
  showTab(task.path);
  setSplit(useUIStore.getState().tabs.findIndex((tab) => tab.path === task.path));
  openNote(main);
}
