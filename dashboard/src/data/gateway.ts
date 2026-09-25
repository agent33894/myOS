import type { CheckEntry } from '@shared/checklist';
import type { ArtifactRetype, ArtifactSave } from '@shared/ipc/contracts';
import { captureDraft, parseCapture } from '@shared/inbox';
import { PROJECT_CLOSED_STATUSES } from '@shared/spec';
import { ArtifactType, type Artifact, type ArtifactDraft, type ArtifactPatch, type ArtifactSummary, type Domain } from '@shared/types';
import { useSettingsStore } from '../store/settings';
import { invoke } from './ipc';
import { applyArtifact, dropArtifact, useDataStore } from './store';
import { record } from './undo';

/**
 * The single write path. Every change lands in the store from the main
 * process's result, and user-level changes record an exact undo.
 * Planning, recall, templates, and the journal build on these in
 * `planning.ts` and `pages.ts`.
 */

async function applied(write: Promise<Artifact>): Promise<Artifact> {
  const artifact = await write;
  applyArtifact(artifact);
  return artifact;
}

/** Apply a write that may have moved the file, dropping the old path from the store. */
async function moved(from: string, write: Promise<Artifact>): Promise<Artifact> {
  const artifact = await applied(write);
  if (artifact.filePath !== from) dropArtifact(from);
  return artifact;
}

export const currentRev = (path: string) => useDataStore.getState().byPath[path]?.rev;

/** The area new items take when their project has none (Settings). */
const defaultArea = () => useSettingsStore.getState().defaultArea;

async function deleteFile(path: string): Promise<Artifact> {
  const snapshot = await invoke('artifacts:delete', path, currentRev(path));
  dropArtifact(path);
  return snapshot;
}

const restoreFile = (snapshot: Artifact) => applied(invoke('artifacts:restore', snapshot));

const retypeFile = (path: string, change: ArtifactRetype, expectRev?: string) =>
  moved(path, invoke('artifacts:retype', path, change, expectRev));

const moveFile = (path: string, to: string) => moved(path, invoke('artifacts:move', path, to, currentRev(path)));

/** Read a file (with its body) and refresh the store. */
export const read = (path: string) => applied(invoke('artifacts:read', path));

/** Create a file; it takes its project's area, else the draft's, else the default area from Settings. */
export async function create(draft: ArtifactDraft, label = `Create “${draft.title ?? 'Untitled'}”`): Promise<Artifact> {
  const created = await applied(invoke('artifacts:create', { ...draft, domain: draft.domain ?? defaultArea() }));
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

/** Quick Capture: a task when the text carries a date, repeat, estimate, flag, priority, or @project; otherwise an Inbox item. */
export function capture(text: string): Promise<Artifact> {
  const projects = Object.values(useDataStore.getState().byPath).filter(
    (item) => item.type === ArtifactType.PROJECT && !PROJECT_CLOSED_STATUSES.has(item.status),
  );
  const draft = captureDraft(parseCapture(text, projects), defaultArea());
  return create(draft, `Capture “${draft.title}”`);
}

/** Full-document write from the editor; fails with CONFLICT when the file moved past `expectRev`. */
export const save = (path: string, change: ArtifactSave, expectRev: string) =>
  applied(invoke('artifacts:save', path, change, expectRev));

export interface FieldChange {
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
  const forward = { ...change, domain: change.domain ?? defaultArea() };
  let current = await retypeFile(path, forward);
  record({
    label,
    undo: async () => {
      current = await retypeFile(current.filePath, previous, currentRev(current.filePath));
    },
    redo: async () => {
      current = await retypeFile(current.filePath, forward, currentRev(current.filePath));
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

// ---- Checklist lines, file names, areas, and versions ------------------------

const toggleLine = (entry: Pick<CheckEntry, 'path' | 'line' | 'text'>) =>
  applied(invoke('artifacts:toggle-check', entry.path, entry.line, entry.text));

/** @public Tick or untick a checklist line in its note; nothing else in the file changes. */
export async function toggleCheck(entry: CheckEntry): Promise<Artifact> {
  const result = await toggleLine(entry);
  record({ label: `${entry.done ? 'Uncheck' : 'Check'} “${entry.text}”`, undo: () => toggleLine(entry), redo: () => toggleLine(entry) });
  return result;
}

/**
 * @public Rename the file after its title (`<slug>.md` in the same folder).
 * Resolves to the file at its new path; callers showing the old path should follow it.
 */
export async function rename(item: ArtifactSummary): Promise<Artifact> {
  const from = item.filePath;
  let current = await moved(from, invoke('artifacts:rename', from, currentRev(from)));
  if (current.filePath === from) return current;
  record({
    label: `Rename “${item.title}”`,
    undo: async () => {
      current = await moveFile(current.filePath, from);
    },
    redo: async () => {
      current = await moved(from, invoke('artifacts:rename', from, currentRev(from)));
    },
  });
  return current;
}

/** @public Move an item to another area: its `domain` changes and the file moves to that area's folder. */
export async function moveToArea(item: ArtifactSummary, domain: Domain): Promise<Artifact> {
  const from = item.filePath;
  const previous = item.domain ?? null;
  let current = await moved(from, invoke('artifacts:move-area', from, domain, currentRev(from)));
  record({
    label: `Move “${item.title}” to another area`,
    undo: async () => {
      const back = await moveFile(current.filePath, from);
      current = await applied(invoke('artifacts:patch', back.filePath, { domain: previous }, back.rev));
    },
    redo: async () => {
      current = await moved(current.filePath, invoke('artifacts:move-area', current.filePath, domain, currentRev(current.filePath)));
    },
  });
  return current;
}

/** @public Saved versions of a file, newest first. */
export const listVersions = (item: Pick<ArtifactSummary, 'filePath'>) => invoke('history:list', item.filePath);

/** @public The full text of one saved version. */
export const readVersion = (item: Pick<ArtifactSummary, 'filePath'>, id: string) => invoke('history:read', item.filePath, id);

const restoreTo = (path: string, id: string) => applied(invoke('history:restore', path, id, currentRev(path)));

/** @public Put a saved version back. The text it replaced is kept as the newest version, which undo restores. */
export async function restoreVersion(item: ArtifactSummary, id: string): Promise<Artifact> {
  const path = item.filePath;
  const restored = await restoreTo(path, id);
  const [replaced] = await invoke('history:list', path);
  record({
    label: `Restore a version of “${item.title}”`,
    undo: () => restoreTo(path, replaced.id),
    redo: () => restoreTo(path, id),
  });
  return restored;
}
