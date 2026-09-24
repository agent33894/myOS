import { toast } from 'sonner';
import { projectSwatchFor } from '@shared/design-system/accents';
import { ArtifactStatus, ArtifactType, type ArtifactPatch, type ArtifactSummary } from '@shared/types';
import { PROJECT_CLOSED_STATUSES } from '@shared/spec';
import { moveToProject, patch, patchMany, remove } from '../../../data/gateway';
import { useDataStore } from '../../../data/store';
import { undo } from '../../../data/undo';

const byOrderThenTitle = (a: ArtifactSummary, b: ArtifactSummary) =>
  (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || a.title.localeCompare(b.title);

/** Open projects for the sidebar: pinned first (in pin order), then the rest alphabetically. */
export function sidebarProjects(artifacts: readonly ArtifactSummary[]): ArtifactSummary[] {
  const open = artifacts.filter(
    (artifact) => artifact.type === ArtifactType.PROJECT && !PROJECT_CLOSED_STATUSES.has(String(artifact.status)),
  );
  const pinned = open.filter((project) => project.pinned === true).sort(byOrderThenTitle);
  const rest = open.filter((project) => project.pinned !== true).sort((a, b) => a.title.localeCompare(b.title));
  return [...pinned, ...rest];
}

const withUndo = (message: string) =>
  toast(message, { action: { label: 'Undo', onClick: () => void undo() } });

async function attempt(action: () => Promise<unknown>, failure: string): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : failure);
    return false;
  }
}

const edit = (project: ArtifactSummary, fields: ArtifactPatch, label: string) =>
  attempt(() => patch(project.filePath, fields, label), 'Could not change the project');

/**
 * Rename in place. The color is pinned to the old title's so the dot doesn't
 * change, and items linked by the old title follow to the rename-stable id.
 */
export function renameProject(project: ArtifactSummary, value: string) {
  const title = value.trim();
  if (!title || title === project.title) return;
  const relinks = Object.values(useDataStore.getState().byPath)
    .filter((item) => item.id !== project.id && item.project === project.title)
    .map((item) => ({ path: item.filePath, fields: { project: project.id } }));
  const fields = { title, swatch: project.swatch ?? projectSwatchFor(project.title).name };
  void attempt(
    () => patchMany([{ path: project.filePath, fields }, ...relinks], `Rename project to “${title}”`),
    'Could not rename the project',
  );
}

export const setProjectColor = (project: ArtifactSummary, swatch: string) =>
  edit(project, { swatch }, `Color “${project.title}”`);

export function togglePin(project: ArtifactSummary) {
  if (project.pinned) return edit(project, { pinned: null, order: null }, `Unpin “${project.title}”`);
  const pinned = Object.values(useDataStore.getState().byPath).filter(
    (item) => item.type === ArtifactType.PROJECT && item.pinned,
  );
  const order = pinned.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;
  return edit(project, { pinned: true, order }, `Pin “${project.title}”`);
}

export async function archiveProject(project: ArtifactSummary) {
  if (await edit(project, { status: ArtifactStatus.ARCHIVED }, `Archive “${project.title}”`)) withUndo(`Archived “${project.title}”`);
}

export async function deleteProject(project: ArtifactSummary) {
  const done = await attempt(() => remove(project.filePath, `Delete “${project.title}”`), 'Could not delete the project');
  if (done) withUndo(`Deleted “${project.title}”`);
  return done;
}

/** Drop an item (dragged from any list) onto a sidebar project to move it there. */
export async function moveIntoProject(itemId: string, project: ArtifactSummary) {
  const item = Object.values(useDataStore.getState().byPath).find((candidate) => candidate.id === itemId);
  if (!item || item.type === ArtifactType.PROJECT || item.project === project.id) return;
  const done = await attempt(() => moveToProject(item, project.id), 'Could not move it');
  if (done) withUndo(`Moved to “${project.title}”`);
}
