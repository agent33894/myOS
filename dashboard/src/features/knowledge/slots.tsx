import type { ArtifactSummary } from '@shared/types';

/** Knowledge properties on notes (review schedule). */
export function KnowledgeProperties(_: { item: ArtifactSummary }) {
  return null;
}

/** Knowledge actions in a page's ⋯ menu (review, save as template, focus). */
export function KnowledgeMenuItems(_: { item: ArtifactSummary; flush: () => Promise<void> }) {
  return null;
}

/** Knowledge settings (templates, focus). */
export function KnowledgeSettings() {
  return null;
}
