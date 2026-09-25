import { useCallback, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import type { Note } from '@shared/spec';
import { createNote, read, save } from './gateway';
import { IpcError, isConflict } from './ipc';
import { useDataStore } from './store';

const AUTOSAVE_DELAY_MS = 1000;

interface Version {
  /** Empty for a file that does not exist yet and is made on the first save. */
  rev: string;
  content: string;
}

export interface DocumentConflict {
  theirs: Note;
}

/** One open document: what's on disk (`base`), local edits (`draft`), and a queue of disk operations. */
interface Session {
  path: string;
  base: Version | null;
  draft: string | null;
  conflict: DocumentConflict | null;
  missing: boolean;
  saving: boolean;
  lastSaved: Date | null;
  queue: Promise<void>;
}

/** Paths with edits not yet on disk, for the tab bar's dots. */
const useUnsavedStore = create<Record<string, boolean>>(() => ({}));

function markUnsaved(path: string, unsaved: boolean): void {
  if (path && Boolean(useUnsavedStore.getState()[path]) !== unsaved) useUnsavedStore.setState({ [path]: unsaved });
}

/** Whether an open document at `path` has edits that are not saved yet. */
export const useUnsaved = (path: string | null) => useUnsavedStore((state) => (path ? Boolean(state[path]) : false));

const versionOf = (note: Note): Version => ({ rev: note.rev, content: note.content });

const openSession = (path: string): Session => ({
  path,
  base: null,
  draft: null,
  conflict: null,
  missing: false,
  saving: false,
  lastSaved: null,
  queue: Promise.resolve(),
});

/**
 * The editor's view of one file. Autosaves local edits against the rev they
 * were made on; reloads silently when the file changes on disk and nothing is
 * unsaved; otherwise raises `conflict` instead of overwriting. Our own saves
 * are recognised because their rev is the one we just wrote. With
 * `createOnWrite`, a missing file (today's daily note) opens empty and is
 * made on the first edit.
 */
export function useDocument(path: string | null, { createOnWrite = false } = {}) {
  const note = useDataStore((state) => (path ? state.notes[path] : undefined));
  const [, rerender] = useReducer((tick: number) => tick + 1, 0);
  const sessionRef = useRef<Session>(openSession(path ?? ''));
  const timerRef = useRef<number | null>(null);

  const update = useCallback((session: Session) => {
    if (session === sessionRef.current) rerender();
  }, []);

  const enqueue = useCallback((session: Session, task: () => Promise<void>) => {
    session.queue = session.queue.then(task).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not update this page');
    });
    return session.queue;
  }, []);

  /** Compare the file on disk with what the editor was built on. */
  const reconcile = useCallback(
    async (session: Session, theirs?: Note) => {
      if (!session.base) return;
      if (!theirs && useDataStore.getState().notes[session.path]?.rev === session.base.rev) return;
      const disk = theirs ?? (await read(session.path));
      if (disk.rev === session.base.rev) return;
      // Only properties moved (a task checked from a list, a property set elsewhere): local body edits still apply.
      if (session.draft !== null && disk.content !== session.base.content) session.conflict = { theirs: disk };
      else session.base = versionOf(disk);
      update(session);
    },
    [update],
  );

  const persist = useCallback(
    async (session: Session): Promise<void> => {
      const { draft, base } = session;
      if (draft === null || !base || session.conflict) return;
      session.saving = true;
      update(session);
      let rebased = false;
      try {
        const saved = base.rev ? await save(session.path, { content: draft }, base.rev) : await createNote(session.path, draft);
        session.base = versionOf(saved);
        if (session.draft === draft) session.draft = null;
        session.lastSaved = new Date();
      } catch (error) {
        if (!isConflict(error)) throw error;
        await reconcile(session, await read(session.path));
        rebased = !session.conflict && session.base?.rev !== base.rev;
      } finally {
        session.saving = false;
        update(session);
      }
      // Retry after a frontmatter-only change on disk, and save edits typed while this save ran.
      if (rebased || (session.draft !== null && session.draft !== draft)) return persist(session);
    },
    [reconcile, update],
  );

  const flush = useCallback(
    (session = sessionRef.current) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return enqueue(session, () => persist(session));
    },
    [enqueue, persist],
  );

  if (sessionRef.current.path !== (path ?? '')) sessionRef.current = openSession(path ?? '');

  // Open the document, and hand the outgoing one its final save.
  useEffect(() => {
    const session = sessionRef.current;
    if (path && !session.base) {
      const { bodies, notes } = useDataStore.getState();
      const cached = bodies[path];
      if (cached && cached.rev === notes[path]?.rev) {
        session.base = { rev: cached.rev, content: cached.content };
        update(session);
      } else {
        void enqueue(session, async () => {
          try {
            session.base = versionOf(await read(path));
          } catch (error) {
            if (!(error instanceof IpcError && error.code === 'NOT_FOUND')) throw error;
            if (createOnWrite) session.base = { rev: '', content: '' };
            else session.missing = true;
          }
          update(session);
        });
      }
    }
    const onBeforeUnload = () => void flush(session);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flush(session).finally(() => markUnsaved(session.path, session.draft !== null));
    };
  }, [path, createOnWrite, enqueue, flush, update]);

  // The file changed on disk (another app, Git, our own list actions): reconcile after queued work.
  const diskRev = note?.rev;
  useEffect(() => {
    const session = sessionRef.current;
    if (!diskRev || !session.base || diskRev === session.base.rev) return;
    void enqueue(session, () => reconcile(session));
  }, [diskRev, enqueue, reconcile]);

  const edit = useCallback(
    (content: string) => {
      const session = sessionRef.current;
      if (!session.base) return;
      session.draft = content;
      update(session);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flush(session), AUTOSAVE_DELAY_MS);
    },
    [flush, update],
  );

  /** Resolve a conflict by writing the local version over the one on disk. */
  const keepMine = useCallback(() => {
    const session = sessionRef.current;
    if (!session.conflict || !session.base) return Promise.resolve();
    const { theirs } = session.conflict;
    session.draft = session.draft ?? session.base.content;
    session.base = versionOf(theirs);
    session.conflict = null;
    return flush(session);
  }, [flush]);

  /** Resolve a conflict by dropping local edits for the version on disk. */
  const loadTheirs = useCallback(() => {
    const session = sessionRef.current;
    if (!session.conflict) return;
    session.base = versionOf(session.conflict.theirs);
    session.draft = null;
    session.conflict = null;
    update(session);
  }, [update]);

  const saveNow = useCallback(() => flush(), [flush]);

  const session = sessionRef.current;
  const dirty = session.draft !== null;
  useEffect(() => markUnsaved(path ?? '', dirty), [path, dirty]);
  return {
    /** Live metadata for the file (undefined once it is gone, or before a new file is made). */
    note,
    /** The body; null while loading or when the file no longer exists. */
    content: session.draft ?? session.base?.content ?? null,
    missing: session.missing,
    dirty,
    saving: session.saving,
    lastSaved: session.lastSaved,
    conflict: session.conflict,
    edit,
    saveNow,
    keepMine,
    loadTheirs,
  };
}
