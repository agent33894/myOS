import type { NoteSave, TaskRef } from '@shared/ipc/contracts';
import type { Note, Properties } from '@shared/spec';
import type { Task, TaskDateField } from '@shared/tasks';
import { useSettings } from '../store/settings';
import { followMove } from '../store/ui';
import { IpcError, invoke } from './ipc';
import { applyNote, dropNote, load, recordMove, useDataStore } from './store';
import { record } from './undo';

/**
 * The single write path. Every change lands in the store from the main
 * process's result, and user-level changes record an exact undo.
 */

async function applied(write: Promise<Note>): Promise<Note> {
  const note = await write;
  applyNote(note);
  return note;
}

export const currentRev = (path: string) => useDataStore.getState().notes[path]?.rev;

const parentOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
const join = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

/** Read a file (with its body) and refresh the store. */
export const read = (path: string) => applied(invoke('files:read', path));

/** Full or partial write from the editor; fails with CONFLICT when the file moved past `expectRev`. */
export const save = (path: string, change: NoteSave, expectRev: string) => applied(invoke('files:save', path, change, expectRev));

async function deleteFile(path: string): Promise<Note> {
  const snapshot = await invoke('files:delete', path, currentRev(path));
  dropNote(path);
  return snapshot;
}

const restoreFile = (snapshot: Note) => applied(invoke('files:restore', snapshot));

/** A new file at `path` (`.md` added when missing), empty unless `content` is given. Undo removes it. */
export async function createNote(path: string, content?: string): Promise<Note> {
  const created = await applied(invoke('files:create', /\.md$/i.test(path) ? path : `${path}.md`, content));
  let snapshot = created;
  record({
    label: `Create ${created.path}`,
    undo: async () => {
      snapshot = await deleteFile(created.path);
    },
    redo: () => restoreFile(snapshot),
  });
  return created;
}

/** `Untitled.md`, `Untitled 2.md`, … in `folder`: the first name that is free. */
export function freeName(folder: string, stem = 'Untitled'): string {
  const { notes } = useDataStore.getState();
  for (let count = 1; ; count += 1) {
    const path = join(folder, `${count === 1 ? stem : `${stem} ${count}`}.md`);
    if (!notes[path]) return path;
  }
}

/** Delete a file; undo puts it back byte for byte. */
export async function remove(path: string): Promise<Note> {
  let snapshot = await deleteFile(path);
  record({
    label: `Delete ${path}`,
    undo: () => restoreFile(snapshot),
    redo: async () => {
      snapshot = await deleteFile(path);
    },
  });
  return snapshot;
}

async function moveFile(from: string, to: string): Promise<Note> {
  const moved = await applied(invoke('files:move', from, to, currentRev(from)));
  dropNote(from);
  recordMove(from, moved.path);
  followMove(from, moved.path);
  return moved;
}

/** Move a file to `to` (a full path); undo moves it back. Open tabs follow. */
export async function move(path: string, to: string): Promise<Note> {
  const moved = await moveFile(path, to);
  if (moved.path !== path) record({ label: `Move ${path}`, undo: () => moveFile(moved.path, path), redo: () => moveFile(path, moved.path) });
  return moved;
}

/** @public Rename a file in its folder; `name` may leave out `.md`. */
export const rename = (path: string, name: string) => move(path, join(parentOf(path), /\.md$/i.test(name) ? name : `${name}.md`));

/** @public A new, empty folder. */
export async function createFolder(path: string): Promise<string> {
  const created = await invoke('folders:create', path);
  await load();
  return created;
}

async function moveFolderTo(from: string, to: string): Promise<string> {
  const moved = await invoke('folders:move', from, to);
  recordMove(from, moved);
  followMove(from, moved);
  await load();
  return moved;
}

/** Move or rename a folder with everything in it; undo moves it back. */
export async function moveFolder(path: string, to: string): Promise<string> {
  const moved = await moveFolderTo(path, to);
  if (moved !== path) record({ label: `Move ${path}`, undo: () => moveFolderTo(moved, path), redo: () => moveFolderTo(path, moved) });
  return moved;
}

/** @public */
export const renameFolder = (path: string, name: string) => moveFolder(path, join(parentOf(path), name));

/**
 * @public Delete a folder and everything in it. Each note is kept in history first,
 * and the folder goes to the system trash when there is one; there is no undo.
 */
export async function removeFolder(path: string): Promise<string[]> {
  const removed = await invoke('folders:delete', path);
  await load();
  return removed;
}

// ---- Tasks and captures --------------------------------------------------------

const refOf = (task: Task): TaskRef => ({ path: task.path, line: task.line, raw: task.raw });

/** Property changes that turn `from` back into `to`. */
const propertiesTo = (to: Properties, from: Properties) =>
  Object.fromEntries([...new Set([...Object.keys(to), ...Object.keys(from)])].map((key) => [key, key in to ? to[key] : null]));

/**
 * Run a write that changes one file, with an undo that puts the file's body
 * and properties back as they were (and redo that repeats the result). A
 * file the write created is removed again.
 */
async function undoable(path: string, label: string, write: () => Promise<Note>): Promise<Note> {
  const before = await invoke('files:read', path).catch((error: unknown) => {
    if (error instanceof IpcError && error.code === 'NOT_FOUND') return null;
    throw error;
  });
  const after = await applied(write());
  const put = (target: Note) =>
    save(path, { content: target.content, properties: propertiesTo(target.properties, useDataStore.getState().notes[path]?.properties ?? {}) }, currentRev(path) ?? '');
  let removed: Note | null = null;
  record({
    label,
    undo: async () => {
      if (before) await put(before);
      else removed = await deleteFile(path);
    },
    redo: async () => {
      if (removed) await restoreFile(removed);
      else await put(after);
    },
  });
  return after;
}

/** Check or uncheck a task; a repeating task gains its next occurrence above it. */
export const toggleTask = (task: Task) =>
  undoable(task.path, `${task.status === 'open' ? 'Check' : 'Uncheck'} “${task.text}”`, () => invoke('tasks:toggle', refOf(task), currentRev(task.path)));

/** @public Set or (null) clear the due, scheduled, or start date on a task. */
export const setTaskDate = (task: Task, field: TaskDateField, date: string | null) =>
  undoable(task.path, `Change the ${field} date of “${task.text}”`, () => invoke('tasks:set-date', refOf(task), field, date, currentRev(task.path)));

/** @public Replace a task's text (everything after the checkbox). */
export const editTask = (task: Task, text: string) =>
  undoable(task.path, `Edit “${task.text}”`, () => invoke('tasks:edit', refOf(task), text, currentRev(task.path)));

/** @public Add a line to a file (made when missing), at the end or under `heading`. */
export const appendLine = (path: string, line: string, heading?: string) =>
  undoable(path, `Add to ${path}`, () => invoke('tasks:append', path, line, heading));

/** Quick capture: a line in today's daily note, or in `target`. Resolves to the file written. */
export async function capture(text: string, target?: string): Promise<Note> {
  const path = target ?? (await captureFile());
  return undoable(path, `Capture “${text.trim()}”`, () => invoke('daily:capture', text, path));
}

async function captureFile(): Promise<string> {
  const setting = useSettings.getState().captureTarget;
  return setting === 'daily' ? dailyPath() : setting;
}

/** The daily note path for `date` (YYYY-MM-DD), today by default. The file may not exist yet. */
export const dailyPath = (date?: string) => invoke('daily:path', date);

// ---- Local copies --------------------------------------------------------------

/** Local copies of a file, newest first. */
export const listVersions = (path: string) => invoke('history:list', path);

/** The full text of one local copy. */
export const readVersion = (path: string, id: string) => invoke('history:read', path, id);

const restoreTo = (path: string, id: string) => applied(invoke('history:restore', path, id, currentRev(path)));

/** Put a local copy back. The text it replaced becomes the newest copy, which undo restores. */
export async function restoreVersion(path: string, id: string): Promise<Note> {
  const restored = await restoreTo(path, id);
  const [replaced] = await invoke('history:list', path);
  record({ label: `Restore an earlier copy of ${path}`, undo: () => restoreTo(path, replaced.id), redo: () => restoreTo(path, id) });
  return restored;
}
