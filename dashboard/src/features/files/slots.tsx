import type { ArtifactSummary } from '@shared/types';

/** The Area property on every page. */
export function AreaProperty(_: { item: ArtifactSummary; flush: () => Promise<void>; onMoved: (path: string) => void }) {
  return null;
}

/** File actions in a page's ⋯ menu (export, copy, version history). */
export function FileMenuItems(_: { item: ArtifactSummary; flush: () => Promise<void>; onMoved: (path: string) => void }) {
  return null;
}

/** File settings (areas, file names). */
export function FileSettings() {
  return null;
}
