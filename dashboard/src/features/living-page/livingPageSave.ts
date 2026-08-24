import type { Artifact } from '../../types/artifacts';
import { joinTitleEcho } from '../shell/titleEcho';

/**
 * How long after our own save we treat a store `updated` change as the file
 * watcher echoing that save back at us. The watcher batches at 150ms in main
 * and 250ms in the renderer, plus IPC latency; 3s clears all of it with room.
 */
export const LIVING_PAGE_ECHO_WINDOW_MS = 3000;

export interface LivingPageSnapshot {
  filePath: string;
  title: string;
  body: string | null;
  hadEcho: boolean;
  dirty: boolean;
}

/**
 * Merge the pane's edits over the latest store artifact. Metadata edited
 * elsewhere (tags, project, status) passes through untouched; only title and
 * body — plus any explicit overrides such as a todo status toggle — are ours.
 */
export function buildLivingPageArtifact(
  previous: Artifact,
  snapshot: LivingPageSnapshot,
  overrides?: Partial<Artifact>,
): Artifact {
  const title = snapshot.title.trim();
  return {
    ...previous,
    title,
    content: joinTitleEcho(snapshot.body ?? '', snapshot.hadEcho, title),
    ...overrides,
  };
}

interface ExternalChangeGateParams {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaveAt: number;
  now: number;
  echoWindowMs?: number;
}

/**
 * Should a store `updated` change reload the pane from disk? Our own edits
 * outrank incoming ones (last-writer-wins is the vault's existing model), and
 * anything landing shortly after our save is that save echoing back through
 * the file watcher — reloading then would stomp the caret.
 */
export function shouldReloadFromExternalChange({
  hasUnsavedChanges,
  isSaving,
  lastSaveAt,
  now,
  echoWindowMs = LIVING_PAGE_ECHO_WINDOW_MS,
}: ExternalChangeGateParams): boolean {
  if (hasUnsavedChanges || isSaving) return false;
  if (now - lastSaveAt < echoWindowMs) return false;
  return true;
}
