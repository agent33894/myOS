import { shell } from 'electron';
import { mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path';
import type { FolderListing, NoteSave, VersionInfo } from '../../shared/ipc/contracts';
import type { Note, NoteSummary } from '../../shared/spec';
import { DomainError, isMissingFile } from '../errors';
import { listVersions, moveHistory, readVersion, snapshotBeforeWrite } from '../history/history';
import { isHiddenName, resolveInWorkspace, scanTree, toWorkspacePath } from '../workspace/paths';
import { applyPatch, parseDocument, revOf, rewriteDocument } from './markdown';

const hiddenSegment = (path: string) => path.split(/[\\/]/).some((segment) => isHiddenName(segment));

/** Notes are Markdown files outside dot folders and node_modules; nothing here may touch `.git/` or other files. */
function resolveNote(path: string): string {
  if (!/\.md$/i.test(path) || hiddenSegment(path)) throw new DomainError('INVALID', `${path} is not a Markdown file in the folder.`);
  return resolveInWorkspace(path);
}

function resolveFolder(path: string): string {
  const absolute = resolveInWorkspace(path);
  if (hiddenSegment(path) || toWorkspacePath(absolute) === '') throw new DomainError('INVALID', `${path} is not a folder that can change.`);
  return absolute;
}

interface Loaded {
  absolute: string;
  note: Note;
  raw: string;
}

async function load(path: string): Promise<Loaded> {
  const absolute = resolveNote(path);
  try {
    const [raw, stats] = await Promise.all([readFile(absolute, 'utf-8'), stat(absolute)]);
    return { absolute, note: parseDocument(raw, toWorkspacePath(absolute), stats), raw };
  } catch (error) {
    if (isMissingFile(error)) throw new DomainError('NOT_FOUND', `${path} no longer exists.`);
    throw error;
  }
}

function assertRev(note: Note, expectRev?: string) {
  if (expectRev !== undefined && note.rev !== expectRev) throw new DomainError('CONFLICT', `“${note.title}” changed on disk.`);
}

async function exists(absolute: string): Promise<boolean> {
  return stat(absolute).then(
    () => true,
    (error: unknown) => {
      if (isMissingFile(error)) return false;
      throw error;
    },
  );
}

/** Write `text` and return what a fresh read would see. `wx` refuses to replace an existing file. */
async function write(path: string, text: string, flag: 'w' | 'wx'): Promise<Note> {
  const absolute = resolveNote(path);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    await writeFile(absolute, text, { encoding: 'utf-8', flag });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new DomainError('CONFLICT', `${path} already exists.`);
    throw error;
  }
  return parseDocument(text, toWorkspacePath(absolute), await stat(absolute));
}

/** Keep the file as it is now in version history before a change that replaces or removes it. */
const keepVersion = ({ note, raw }: Loaded) => snapshotBeforeWrite(note.path, raw);

// ---- Listing ---------------------------------------------------------------

const SEARCH_TEXT_LIMIT = 60_000;
const listCache = new Map<string, NoteSummary>();

function summarize({ content, ...note }: Note): NoteSummary {
  const half = SEARCH_TEXT_LIMIT / 2;
  const searchText = content.length <= SEARCH_TEXT_LIMIT ? content : `${content.slice(0, half)}\n${content.slice(-half)}`;
  return { ...note, searchText };
}

/** Every folder and note; unchanged files come from a cache keyed by rev. */
export async function listFiles(): Promise<FolderListing> {
  const { folders, files } = await scanTree();
  const notes = await Promise.all(
    files.map(async (path) => {
      try {
        const absolute = resolveInWorkspace(path);
        const cached = listCache.get(absolute);
        const stats = await stat(absolute);
        if (cached?.rev === revOf(stats)) return cached;
        const summary = summarize(parseDocument(await readFile(absolute, 'utf-8'), path, stats));
        listCache.set(absolute, summary);
        return summary;
      } catch (error) {
        console.warn(`Skipping ${path}:`, (error as Error).message);
        return null;
      }
    }),
  );
  const live = new Set(notes.map((note) => note && resolveInWorkspace(note.path)));
  for (const path of listCache.keys()) if (!live.has(path)) listCache.delete(path);
  return { folders, notes: notes.filter((note): note is NoteSummary => note !== null) };
}

// ---- Files -------------------------------------------------------------------

export const readNote = async (path: string): Promise<Note> => (await load(path)).note;

/** A new file with `content` (empty by default); never replaces an existing one. */
export const createNote = (path: string, content = ''): Promise<Note> => write(path, content, 'wx');

export async function saveNote(path: string, { content, properties }: NoteSave, expectRev: string): Promise<Note> {
  const loaded = await load(path);
  const { note, raw } = loaded;
  assertRev(note, expectRev);
  if (properties && Object.keys(properties).length > 0 && note.propertiesError) {
    throw new DomainError('INVALID', `${note.path}: ${note.propertiesError} Fix it in source mode first.`);
  }
  // Saves arrive every second while typing; history keeps one per ten minutes, and never blocks a save.
  await snapshotBeforeWrite(note.path, raw, { throttle: true }).catch((error: unknown) =>
    console.warn(`Could not keep a version of ${note.path}:`, (error as Error).message),
  );
  const next = properties ? applyPatch(note.properties, properties) : note.properties;
  return write(note.path, rewriteDocument(raw, note.properties, next, content), 'w');
}

/**
 * Replace a file's text with `edit(raw)`, checked against `expectRev`. A
 * null result means the edit no longer fits the file (CONFLICT).
 */
export async function editNote(path: string, expectRev: string | undefined, edit: (raw: string, note: Note) => string | null): Promise<Note> {
  const { note, raw } = await load(path);
  assertRev(note, expectRev);
  const text = edit(raw, note);
  if (text === null) throw new DomainError('CONFLICT', `“${note.title}” changed; read it again and retry.`);
  return text === raw ? note : write(note.path, text, 'w');
}

/** Replace a file's text, or create it when missing. */
export async function writeOrCreate(path: string, edit: (raw: string | null) => string): Promise<Note> {
  try {
    return await editNote(path, undefined, (raw) => edit(raw));
  } catch (error) {
    if (!(error instanceof DomainError && error.code === 'NOT_FOUND')) throw error;
    return write(path, edit(null), 'wx');
  }
}

/** Move the file, bytes unchanged, to `to`; refuses to replace a file already there. */
export async function moveNote(path: string, to: string, expectRev?: string): Promise<Note> {
  const { absolute, note, raw } = await load(path);
  assertRev(note, expectRev);
  const target = toWorkspacePath(resolveNote(to));
  if (target === note.path) return note;
  // A case-only rename on a case-insensitive disk is the same file.
  const sameFile = target.toLowerCase() === note.path.toLowerCase();
  if (!sameFile && (await exists(resolveNote(target)))) throw new DomainError('CONFLICT', `${target} already exists.`);
  await mkdir(dirname(resolveNote(target)), { recursive: true });
  await rename(absolute, resolveNote(target));
  await moveHistory(note.path, target);
  return parseDocument(raw, target, await stat(resolveNote(target)));
}

// Undo restores the exact bytes of recently deleted files, not a re-serialization.
const deletedText = new Map<string, string>();
const deletedKey = (note: Pick<Note, 'path' | 'rev'>) => `${note.path}\n${note.rev}`;

/** Keep a local copy, remove the file, and return it for undo. */
export async function deleteNote(path: string, expectRev?: string): Promise<Note> {
  const loaded = await load(path);
  const { absolute, note, raw } = loaded;
  assertRev(note, expectRev);
  await keepVersion(loaded);
  await unlink(absolute);
  deletedText.set(deletedKey(note), raw);
  if (deletedText.size > 50) deletedText.delete(deletedText.keys().next().value!);
  return note;
}

/** Write a deleted file back to its own path; refuses to replace a file that has appeared since. */
export async function restoreNote(snapshot: Note): Promise<Note> {
  const raw = deletedText.get(deletedKey(snapshot));
  if (await exists(resolveNote(snapshot.path))) throw new DomainError('CONFLICT', `${snapshot.path} exists again.`);
  if (raw === undefined) throw new DomainError('NOT_FOUND', `${snapshot.path} can no longer be restored here; use its history.`);
  const restored = await write(snapshot.path, raw, 'wx');
  deletedText.delete(deletedKey(snapshot));
  return restored;
}

// ---- Folders -----------------------------------------------------------------

export async function createFolder(path: string): Promise<string> {
  const absolute = resolveFolder(path);
  if (await exists(absolute)) throw new DomainError('CONFLICT', `${path} already exists.`);
  await mkdir(absolute, { recursive: true });
  return toWorkspacePath(absolute);
}

const notesIn = async (absolute: string, folder: string) => (await scanTree(absolute)).files.map((file) => `${folder}/${file}`);

/** Move or rename a folder with everything in it; the target must not exist. History follows each note. */
export async function moveFolder(path: string, to: string): Promise<string> {
  const from = resolveFolder(path);
  const target = resolveFolder(to);
  const source = toWorkspacePath(from);
  const destination = toWorkspacePath(target);
  if (destination === source) return source;
  if (destination.startsWith(`${source}/`)) throw new DomainError('INVALID', 'A folder cannot move inside itself.');
  if (!(await stat(from)).isDirectory()) throw new DomainError('INVALID', `${path} is not a folder.`);
  if (destination.toLowerCase() !== source.toLowerCase() && (await exists(target))) {
    throw new DomainError('CONFLICT', `${destination} already exists.`);
  }
  const notes = await notesIn(from, source);
  await mkdir(dirname(target), { recursive: true });
  await rename(from, target);
  for (const note of notes) await moveHistory(note, destination + note.slice(source.length));
  return destination;
}

/**
 * Keep a local copy of every note inside, then remove the folder: to the
 * system trash when it has one, otherwise from disk. Returns the removed notes.
 */
export async function deleteFolder(path: string): Promise<string[]> {
  const absolute = resolveFolder(path);
  if (!(await stat(absolute)).isDirectory()) throw new DomainError('INVALID', `${path} is not a folder.`);
  const notes = await notesIn(absolute, toWorkspacePath(absolute));
  for (const note of notes) await keepVersion(await load(note));
  try {
    await shell.trashItem(absolute);
  } catch {
    await rm(absolute, { recursive: true });
  }
  return notes;
}

// ---- Version history ---------------------------------------------------------

export const listHistory = (path: string): Promise<VersionInfo[]> => listVersions(toWorkspacePath(resolveNote(path)));

export const readHistory = (path: string, id: string): Promise<string> => readVersion(toWorkspacePath(resolveNote(path)), id);

/** Write a saved version back as the file; the text it replaces becomes the newest version. */
export async function restoreVersion(path: string, id: string, expectRev?: string): Promise<Note> {
  const loaded = await load(path);
  assertRev(loaded.note, expectRev);
  const text = await readVersion(loaded.note.path, id);
  await keepVersion(loaded);
  return write(loaded.note.path, text, 'w');
}

/** Write `text` (a file's earlier bytes, e.g. from a Git commit) over the file; the text it replaces becomes the newest version. */
export async function restoreText(path: string, text: string, expectRev?: string): Promise<Note> {
  const loaded = await load(path);
  assertRev(loaded.note, expectRev);
  await keepVersion(loaded);
  return write(loaded.note.path, text, 'w');
}
