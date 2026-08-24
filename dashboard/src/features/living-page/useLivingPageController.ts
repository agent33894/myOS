import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Artifact } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { useUndoableArtifact } from '../../hooks/useUndoableArtifact';
import { shouldRunAutoSaveAfterIdle } from './autoSaveGate';
import { splitTitleEcho } from '../shell/titleEcho';
import {
  buildLivingPageArtifact,
  shouldReloadFromExternalChange,
  type LivingPageSnapshot,
} from './livingPageSave';

const EDITING_QUIET_WINDOW_MS = 1600;

/**
 * The Living Page controller: the detail pane is the document. Title and body
 * are always editable; saves are autosave-only (the pane deliberately ignores
 * the enableAutoSave setting — with no Save button it would otherwise be
 * silently unsaveable). Everything here is built around one hazard: our own
 * save echoing back through the file watcher and stomping the caret.
 */
export function useLivingPageController(artifact: Artifact) {
  const loadContent = useArtifactsStore((state) => state.loadContent);
  const { undoableUpdate } = useUndoableArtifact();

  const [title, setTitle] = useState(artifact.title);
  const [docBody, setDocBody] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isActivelyEditing, setIsActivelyEditing] = useState(false);
  const [editActivityTick, setEditActivityTick] = useState(0);

  const editVersionRef = useRef(0);
  const hadEchoRef = useRef(false);
  const lastSaveAtRef = useRef(0);
  const deletionPendingRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);
  const loadedFilePathRef = useRef<string>('');
  const artifactRef = useRef(artifact);
  artifactRef.current = artifact;
  const docBodyRef = useRef<string | null>(null);
  docBodyRef.current = docBody;

  // Snapshot pairs the loaded file with the pane's current edits. It uses the
  // *loaded* filePath, not the incoming prop, so the flush that runs while
  // switching artifacts writes the outgoing document, never the incoming one.
  const snapshotRef = useRef<LivingPageSnapshot>({
    filePath: '',
    title: '',
    body: null,
    hadEcho: false,
    dirty: false,
  });
  snapshotRef.current = {
    filePath: loadedFilePathRef.current,
    title,
    body: docBody,
    hadEcho: hadEchoRef.current,
    dirty: hasUnsavedChanges,
  };

  const persistSnapshot = useCallback(
    async (snapshot: LivingPageSnapshot, overrides?: Partial<Artifact>, label?: string) => {
      if (deletionPendingRef.current) return null;
      if (!snapshot.filePath || snapshot.body === null || !snapshot.title.trim()) return null;
      const store = useArtifactsStore.getState();
      const previous = store.artifacts.find((item) => item.filePath === snapshot.filePath);
      if (!previous) return null;
      const next = buildLivingPageArtifact(previous, snapshot, overrides);
      const persisted = await undoableUpdate(snapshot.filePath, previous, next, label);
      store.updateArtifact(persisted);
      lastSaveAtRef.current = Date.now();
      return persisted;
    },
    [undoableUpdate],
  );

  const saveNow = useCallback(
    async (overrides?: Partial<Artifact>, label?: string) => {
      const snapshot = snapshotRef.current;
      if (snapshot.body === null || !snapshot.title.trim()) return;
      const version = editVersionRef.current;
      setIsSaving(true);
      try {
        const persisted = await persistSnapshot(snapshot, overrides, label);
        // Ignore stale completions if newer edits landed while in flight.
        if (persisted && editVersionRef.current === version) {
          setHasUnsavedChanges(false);
          setLastSaved(new Date());
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save changes');
      } finally {
        setIsSaving(false);
      }
    },
    [persistSnapshot],
  );

  // Load — keyed on id ONLY. Keying on `updated` would reload (and stomp the
  // caret) every time our own save bounced back through the watcher.
  const artifactId = artifact.id;
  useEffect(() => {
    const incoming = artifactRef.current;
    setTitle(incoming.title);
    setDocBody(null);
    hadEchoRef.current = false;
    deletionPendingRef.current = false;
    editVersionRef.current = 0;
    setHasUnsavedChanges(false);
    setIsActivelyEditing(false);
    setLastSaved(null);

    let active = true;
    void loadContent(artifactId).then(
      (value) => {
        if (!active) return;
        const { body, hadEcho } = splitTitleEcho(value, artifactRef.current.title);
        hadEchoRef.current = hadEcho;
        loadedIdRef.current = artifactId;
        loadedFilePathRef.current = artifactRef.current.filePath;
        setDocBody(body);
      },
      () => {
        if (!active) return;
        loadedIdRef.current = artifactId;
        loadedFilePathRef.current = artifactRef.current.filePath;
        setDocBody('');
      },
    );
    return () => {
      active = false;
      // Flush the outgoing document before the pane moves on.
      const snapshot = snapshotRef.current;
      if (snapshot.dirty && !deletionPendingRef.current) void persistSnapshot(snapshot);
    };
  }, [artifactId, loadContent, persistSnapshot]);

  // External change — a store `updated` we didn't just cause means the file
  // changed on disk (another editor, Git operation, or another window). Reload only when the
  // pane is clean and outside the echo window of our own save.
  const artifactUpdated = artifact.updated;
  useEffect(() => {
    if (loadedIdRef.current !== artifactId) return;
    if (docBodyRef.current === null) return;
    if (
      !shouldReloadFromExternalChange({
        hasUnsavedChanges,
        isSaving,
        lastSaveAt: lastSaveAtRef.current,
        now: Date.now(),
      })
    ) {
      return;
    }
    let active = true;
    void loadContent(artifactId).then((value) => {
      if (!active) return;
      const { body, hadEcho } = splitTitleEcho(value, artifactRef.current.title);
      hadEchoRef.current = hadEcho;
      setTitle(artifactRef.current.title);
      setDocBody((current) => (current === body ? current : body));
    });
    return () => {
      active = false;
    };
    // Narrow deps by design: this effect answers "did `updated` change", with
    // everything else read at fire time. Wider deps would re-run it on every
    // keystroke.
  }, [artifactUpdated]);

  // Editing quiet window: typing holds autosave off until 1600ms of stillness.
  useEffect(() => {
    if (!isActivelyEditing) return;
    const timer = window.setTimeout(() => {
      setIsActivelyEditing(false);
    }, EDITING_QUIET_WINDOW_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [editActivityTick, isActivelyEditing]);

  const markDirty = useCallback(() => {
    editVersionRef.current += 1;
    setIsActivelyEditing(true);
    setEditActivityTick(Date.now());
    setHasUnsavedChanges(true);
  }, []);

  useEffect(() => {
    if (
      !shouldRunAutoSaveAfterIdle({
        enableAutoSave: true,
        hasUnsavedChanges,
        isActivelyEditing,
        title,
        isNewArtifact: false,
        artifactLoaded: docBody !== null,
      })
    ) {
      return;
    }
    void saveNow();
  }, [hasUnsavedChanges, isActivelyEditing, title, docBody, saveNow]);

  // Quit protection: the quiet window plus save latency is an open window.
  useEffect(() => {
    const onBeforeUnload = () => {
      const snapshot = snapshotRef.current;
      if (snapshot.dirty) void persistSnapshot(snapshot);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [persistSnapshot]);

  const onTitleChange = useCallback(
    (next: string) => {
      setTitle(next);
      markDirty();
    },
    [markDirty],
  );

  const onBodyChange = useCallback(
    (markdown: string) => {
      if (docBodyRef.current === null || docBodyRef.current === markdown) return;
      setDocBody(markdown);
      markDirty();
    },
    [markDirty],
  );

  const beginDelete = useCallback(() => {
    deletionPendingRef.current = true;
  }, []);

  const cancelDelete = useCallback(() => {
    deletionPendingRef.current = false;
    const snapshot = snapshotRef.current;
    if (snapshot.dirty) void saveNow();
  }, [saveNow]);

  return {
    title,
    docBody,
    // Whether the loaded file carried a scaffolded "# Title" echo — surfaces
    // that need the full on-disk markdown rejoin it themselves.
    hadTitleEcho: hadEchoRef.current,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    isActivelyEditing,
    onTitleChange,
    onBodyChange,
    saveNow,
    beginDelete,
    cancelDelete,
  };
}
