import type { ArtifactSummary } from '@shared/types';
import { ArtifactType } from '@shared/types';
import { PROJECT_CLOSED_STATUSES } from '../../../data/projects';

/** Legacy sidebar showed the first 8 projects; kept as the zero-pinned fallback. */
const FALLBACK_COUNT = 8;

interface SidebarProjectsView {
  pinned: ArtifactSummary[];
  overflow: ArtifactSummary[];
  /** True when nothing is pinned and `pinned` is the legacy first-N fallback. */
  usingFallback: boolean;
}

export function selectOpenProjects(artifacts: ArtifactSummary[]): ArtifactSummary[] {
  return artifacts.filter(
    (artifact) =>
      artifact.type === ArtifactType.PROJECT &&
      !PROJECT_CLOSED_STATUSES.has(String(artifact.status)),
  );
}

const byOrderThenTitle = (a: ArtifactSummary, b: ArtifactSummary) =>
  (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
  a.title.localeCompare(b.title);

const byUpdatedDesc = (a: ArtifactSummary, b: ArtifactSummary) =>
  (b.updated ?? '').localeCompare(a.updated ?? '');

export function selectSidebarProjects(artifacts: ArtifactSummary[]): SidebarProjectsView {
  const open = selectOpenProjects(artifacts);
  const pinned = open.filter((artifact) => artifact.pinned === true).sort(byOrderThenTitle);
  if (pinned.length === 0) {
    return {
      pinned: open.slice(0, FALLBACK_COUNT),
      overflow: open.slice(FALLBACK_COUNT).sort(byUpdatedDesc),
      usingFallback: true,
    };
  }
  const pinnedIds = new Set(pinned.map((artifact) => artifact.id));
  return {
    pinned,
    overflow: open.filter((artifact) => !pinnedIds.has(artifact.id)).sort(byUpdatedDesc),
    usingFallback: false,
  };
}

export function nextPinOrder(pinned: ArtifactSummary[]): number {
  return pinned.reduce((max, artifact) => Math.max(max, artifact.order ?? 0), 0) + 1;
}

interface OrderWrite {
  id: string;
  order: number;
}

/** Moves `fromId` to `toId`'s slot and returns only the rows whose order changed. */
export function reorderWrites(pinned: ArtifactSummary[], fromId: string, toId: string): OrderWrite[] {
  if (fromId === toId) return [];
  const ids = pinned.map((artifact) => artifact.id);
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1) return [];
  ids.splice(to, 0, ...ids.splice(from, 1));
  const current = new Map(pinned.map((artifact) => [artifact.id, artifact.order]));
  return ids
    .map((id, index) => ({ id, order: index + 1 }))
    .filter(({ id, order }) => current.get(id) !== order);
}
