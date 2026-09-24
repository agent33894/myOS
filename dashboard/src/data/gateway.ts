import { formatLocalDate } from '@shared/date';
import type { ArtifactRetype, ArtifactSave } from '@shared/ipc/contracts';
import { captureDraft } from '@shared/inbox';
import { ArtifactType, TodoStatus, type Artifact, type ArtifactDraft, type ArtifactPatch, type ArtifactSummary } from '@shared/types';
import { invoke } from './ipc';
import { applyArtifact, dropArtifact, useDataStore } from './store';
import { record } from './undo';

/**
 * The single write path. Every change lands in the store from the main
 * process's result, and user-level changes record an exact undo.
 */

async function applied(write: Promise<Artifact>): Promise<Artifact> {
  const artifact = await write;
  applyArtifact(artifact);
  return artifact;
}

const currentRev = (path: string) => useDataStore.getState().byPath[path]?.rev;

async function deleteFile(path: string): Promise<Artifact> {
  const snapshot = await invoke('artifacts:delete', path, currentRev(path));
  dropArtifact(path);
  return snapshot;
}

const restoreFile = (snapshot: Artifact) => applied(invoke('artifacts:restore', snapshot));

async function retypeFile(path: string, change: ArtifactRetype, expectRev?: string): Promise<Artifact> {
  const moved = await applied(invoke('artifacts:retype', path, change, expectRev));
  if (moved.filePath !== path) dropArtifact(path);
  return moved;
}

/** Read a file (with its body) and refresh the store. */
export const read = (path: string) => applied(invoke('artifacts:read', path));

export async function create(draft: ArtifactDraft, label = `Create “${draft.title ?? 'Untitled'}”`): Promise<Artifact> {
  const created = await applied(invoke('artifacts:create', draft));
  let snapshot = created;
  record({
    label,
    undo: async () => {
      snapshot = await deleteFile(created.filePath);
    },
    redo: () => restoreFile(snapshot),
  });
  return created;
}

/** Quick Capture: a task when the text carries a date, flag, priority, or @project; otherwise an Inbox item. */
export function capture(text: string): Promise<Artifact> {
  const projects = Object.values(useDataStore.getState().byPath).filter((item) => item.type === ArtifactType.PROJECT);
  const draft = captureDraft(text, projects);
  return create(draft, `Capture “${draft.title}”`);
}

/** Full-document write from the editor; fails with CONFLICT when the file moved past `expectRev`. */
export const save = (path: string, change: ArtifactSave, expectRev: string) =>
  applied(invoke('artifacts:save', path, change, expectRev));

interface FieldChange {
  path: string;
  fields: ArtifactPatch;
}

// Clearing is spelled `null` on the wire; `undefined` would be dropped by some callers' spreads.
const withNulls = (fields: ArtifactPatch) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value ?? null])) as ArtifactPatch;

/** A first patch merges onto whatever is on disk; undo and redo refuse to run over someone else's change. */
async function patchAll(changes: FieldChange[], checkRev: boolean): Promise<Artifact[]> {
  const results: Artifact[] = [];
  for (const { path, fields } of changes) {
    const expectRev = checkRev ? currentRev(path) : undefined;
    results.push(await applied(invoke('artifacts:patch', path, withNulls(fields), expectRev)));
  }
  return results;
}

/** The current values of the keys `fields` is about to change; `null` for keys that are absent. */
function valuesBefore(path: string, fields: object): ArtifactPatch {
  const before = useDataStore.getState().byPath[path] as unknown as Record<string, unknown> | undefined;
  return Object.fromEntries(Object.keys(fields).map((key) => [key, before?.[key] ?? null]));
}

/** Frontmatter-only changes to several files, undone as one step by writing the previous values back. */
export async function patchMany(changes: FieldChange[], label: string): Promise<Artifact[]> {
  const previous = changes.map(({ path, fields }) => ({ path, fields: valuesBefore(path, fields) }));
  const results = await patchAll(changes, false);
  record({ label, undo: () => patchAll(previous, true), redo: () => patchAll(changes, true) });
  return results;
}

/** Frontmatter-only change; the body on disk is untouched. */
export const patch = (path: string, fields: ArtifactPatch, label: string) =>
  patchMany([{ path, fields }], label).then(([artifact]) => artifact);

/**
 * Change a file's type, moving it to that type's folder. Undo retypes it back
 * with the previous values, so edits made since then survive.
 */
export async function retype(path: string, change: ArtifactRetype, label: string): Promise<Artifact> {
  const { type, ...fields } = change;
  const before = useDataStore.getState().byPath[path];
  const previous = { ...valuesBefore(path, { ...fields, domain: null, status: null }), type: before?.type ?? type };
  let current = await retypeFile(path, change);
  record({
    label,
    undo: async () => {
      current = await retypeFile(current.filePath, previous, currentRev(current.filePath));
    },
    redo: async () => {
      current = await retypeFile(current.filePath, change, currentRev(current.filePath));
    },
  });
  return current;
}

/** Delete a file; undo restores it at the same path with the same frontmatter and body. */
export async function remove(path: string, label?: string): Promise<Artifact> {
  let snapshot = await deleteFile(path);
  record({
    label: label ?? `Delete “${snapshot.title}”`,
    undo: () => restoreFile(snapshot),
    redo: async () => {
      snapshot = await deleteFile(path);
    },
  });
  return snapshot;
}

/** @public Put a deleted snapshot back (exact path, frontmatter, body). */
export const restore = restoreFile;

export const toggleComplete = (task: ArtifactSummary) =>
  task.status === TodoStatus.DONE
    ? patch(task.filePath, { status: TodoStatus.PENDING, completedDate: null }, `Reopen “${task.title}”`)
    : patch(task.filePath, { status: TodoStatus.DONE, completedDate: formatLocalDate() }, `Complete “${task.title}”`);

/** @public */
export const setDue = (task: ArtifactSummary, due: string | null) =>
  patch(task.filePath, { due }, due ? `Due ${due}: “${task.title}”` : `Clear due date: “${task.title}”`);

/** Hide a task from Today until `until` (a local YYYY-MM-DD date). */
export const defer = (task: ArtifactSummary, until: string | null) =>
  patch(task.filePath, { deferDate: until }, until ? `Defer “${task.title}”` : `Stop deferring “${task.title}”`);

/** @public */
export const setFlag = (task: ArtifactSummary, flagged: boolean) =>
  patch(task.filePath, { flagged: flagged || null }, `${flagged ? 'Flag' : 'Unflag'} “${task.title}”`);

/** @public */
export const moveToProject = (item: ArtifactSummary, projectId: string | null) =>
  patch(item.filePath, { project: projectId }, projectId ? `Move “${item.title}” to a project` : `Remove “${item.title}” from its project`);
