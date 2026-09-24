import { useCallback, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import type { Artifact } from '@shared/types';
import { read, save } from './gateway';
import { IpcError, isConflict } from './ipc';
import { useDataStore } from './store';

const AUTOSAVE_DELAY_MS = 1000;

interface Version {
  rev: string;
  title: string;
  content: string;
}

export interface DocumentConflict {
  theirs: Artifact;
}

/** One open document: what's on disk (`base`), local edits (`draft`), and a queue of disk operations. */
interface Session {
  path: string;
  base: Version | null;
  draft: { title: string; content: string } | null;
  conflict: DocumentConflict | null;
  missing: boolean;
  saving: boolean;
  lastSaved: Date | null;
  queue: Promise<void>;
}

const versionOf = (artifact: Artifact): Version => ({
  rev: artifact.rev,
  title: artifact.title,
  content: artifact.content,
});

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
 * are recognised because their rev is the one we just wrote.
 */
export function useDocument(path: string | null) {
  const artifact = useDataStore((state) => (path ? state.byPath[path] : undefined));
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
    async (session: Session, theirs?: Artifact) => {
      if (!session.base) return;
      if (!theirs && useDataStore.getState().byPath[session.path]?.rev === session.base.rev) return;
      const disk = theirs ?? (await read(session.path));
      if (disk.rev === session.base.rev) return;
      if (!session.draft) session.base = versionOf(disk);
      // Only frontmatter moved (a status toggle, another app's tag edit): our body edits still apply.
      else if (disk.content === session.base.content) session.base = { ...versionOf(disk), title: session.base.title };
      else session.conflict = { theirs: disk };
      update(session);
    },
    [update],
  );

  const persist = useCallback(
    async (session: Session): Promise<void> => {
      const { draft, base } = session;
      if (!draft || !base || session.conflict) return;
      session.saving = true;
      update(session);
      let rebased = false;
      try {
        const title = draft.title.trim();
        const saved = await save(session.path, { fields: title ? { title } : {}, content: draft.content }, base.rev);
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
      if (rebased || (session.draft && session.draft !== draft)) return persist(session);
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
      const { bodies, byPath } = useDataStore.getState();
      const cached = bodies[path];
      if (cached && cached.rev === byPath[path]?.rev) {
        session.base = { rev: cached.rev, title: byPath[path].title, content: cached.content };
        update(session);
      } else {
        void enqueue(session, async () => {
          try {
            session.base = versionOf(await read(path));
          } catch (error) {
            if (!(error instanceof IpcError && error.code === 'NOT_FOUND')) throw error;
            session.missing = true;
          }
          update(session);
        });
      }
    }
    const onBeforeUnload = () => void flush(session);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flush(session);
    };
  }, [path, enqueue, flush, update]);

  // The file changed on disk (another app, Git, our own list actions): reconcile after queued work.
  const diskRev = artifact?.rev;
  useEffect(() => {
    const session = sessionRef.current;
    if (!diskRev || !session.base || diskRev === session.base.rev) return;
    void enqueue(session, () => reconcile(session));
  }, [diskRev, enqueue, reconcile]);

  const edit = useCallback(
    (change: { title?: string; content?: string }) => {
      const session = sessionRef.current;
      const current = session.draft ?? session.base;
      if (!current) return;
      session.draft = { title: change.title ?? current.title, content: change.content ?? current.content };
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
    session.draft ??= { title: session.base.title, content: session.base.content };
    session.base = versionOf(session.conflict.theirs);
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
  const shown = session.draft ?? session.base;
  return {
    /** Live metadata for the file (undefined once it is gone). */
    artifact,
    title: shown?.title ?? artifact?.title ?? '',
    /** The body; null while loading or when the file no longer exists. */
    content: shown?.content ?? null,
    missing: session.missing,
    dirty: session.draft !== null,
    saving: session.saving,
    lastSaved: session.lastSaved,
    conflict: session.conflict,
    edit,
    saveNow,
    keepMine,
    loadTheirs,
  };
}
