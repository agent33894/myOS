import { compareAsc, parseISO } from 'date-fns';
import { formatLocalDate } from './date';
import type { Artifact } from './types';

// Shared by the Today page and the `myos today` command so both always agree.
type TodayArtifact = Pick<Artifact, 'id' | 'type' | 'status' | 'title' | 'due' | 'flagged' | 'updated' | 'created'>;

function isOpenTodo(artifact: TodayArtifact) {
  return artifact.type === 'todo' && artifact.status !== 'done' && artifact.status !== 'cancelled';
}

export function selectInPlay<T extends TodayArtifact>(artifacts: T[], now = new Date()): T[] {
  const today = formatLocalDate(now);
  return artifacts
    .filter(
      (artifact) =>
        isOpenTodo(artifact) &&
        (artifact.due === today ||
          Boolean(artifact.due && artifact.due < today) ||
          artifact.status === 'in-progress' ||
          artifact.flagged),
    )
    .sort((a, b) => {
      if (a.due && b.due) return compareAsc(parseISO(a.due), parseISO(b.due));
      if (a.due) return -1;
      if (b.due) return 1;
      return a.title.localeCompare(b.title);
    });
}

/** Open todos that are not yet in play — the queue behind today's work. */
export function selectNextUp<T extends TodayArtifact>(artifacts: T[], now = new Date(), limit = 12): T[] {
  const inPlayIds = new Set(selectInPlay(artifacts, now).map((artifact) => artifact.id));
  return artifacts
    .filter((artifact) => isOpenTodo(artifact) && !inPlayIds.has(artifact.id))
    .sort((a, b) => {
      if (a.due && b.due) return compareAsc(parseISO(a.due), parseISO(b.due));
      if (a.due) return -1;
      if (b.due) return 1;
      return new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime();
    })
    .slice(0, limit);
}
