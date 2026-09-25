import { formatLocalDate } from '../../shared/date';
import type { TaskRef } from '../../shared/ipc/contracts';
import type { Note } from '../../shared/spec';
import { appendLine, setTaskDate, setTaskText, toggleTaskLine, type TaskDateField } from '../../shared/tasks';
import { DomainError } from '../errors';
import { editNote, readNote, saveNote, writeOrCreate } from './files';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS: readonly string[] = ['due', 'scheduled', 'start'] satisfies TaskDateField[];

function checkRef(task: TaskRef): void {
  if (!task || typeof task.path !== 'string' || !Number.isInteger(task.line) || task.line < 0 || typeof task.raw !== 'string') {
    throw new DomainError('INVALID', 'That task reference is incomplete.');
  }
}

/** Line tasks flip `[ ]`/`[x]` and the ✅ date; a `type: todo` file flips `status: done`. */
export async function toggleTask(task: TaskRef, expectRev?: string, today = formatLocalDate()): Promise<Note> {
  checkRef(task);
  if (task.line > 0) return editNote(task.path, expectRev, (raw) => toggleTaskLine(raw, task.line, task.raw, today));
  const note = await readNote(task.path);
  if (expectRev !== undefined && note.rev !== expectRev) throw new DomainError('CONFLICT', `“${note.title}” changed on disk.`);
  const done = String(note.properties.status ?? '').toLowerCase() === 'done';
  return saveNote(task.path, { properties: { status: done ? 'pending' : 'done', completedDate: done ? null : today } }, note.rev);
}

export async function setTaskDateOn(task: TaskRef, field: TaskDateField, date: string | null, expectRev?: string): Promise<Note> {
  checkRef(task);
  if (!FIELDS.includes(field)) throw new DomainError('INVALID', `${String(field)} is not a task date.`);
  if (date !== null && !DATE.test(date)) throw new DomainError('INVALID', 'Dates are written YYYY-MM-DD.');
  if (task.line === 0) {
    const note = await readNote(task.path);
    return saveNote(task.path, { properties: { [field]: date } }, expectRev ?? note.rev);
  }
  return editNote(task.path, expectRev, (raw) => setTaskDate(raw, task.line, task.raw, field, date));
}

export async function editTask(task: TaskRef, text: string, expectRev?: string): Promise<Note> {
  checkRef(task);
  if (!text.trim() || /[\r\n]/.test(text)) throw new DomainError('INVALID', 'A task is one line of text.');
  if (task.line === 0) {
    const note = await readNote(task.path);
    return saveNote(task.path, { properties: { title: text.trim() } }, expectRev ?? note.rev);
  }
  return editNote(task.path, expectRev, (raw) => setTaskText(raw, task.line, task.raw, text));
}

/** Add one line to a file (made when missing), at the end or under `heading`. */
export function appendToFile(path: string, line: string, heading?: string): Promise<Note> {
  if (!line.trim() || /[\r\n]/.test(line)) throw new DomainError('INVALID', 'Only one line can be added at a time.');
  return writeOrCreate(path, (raw) => appendLine(raw, line, heading));
}
