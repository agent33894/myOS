import { compareAsc, parseISO, startOfDay, subDays } from 'date-fns';
import { formatLocalDate } from '@shared/date';
import type { Artifact } from '../../types/artifacts';

export type RecordKind = 'capture' | 'decision' | 'session' | 'completed';

export function localDateStamp(date = new Date()): string {
  return formatLocalDate(date);
}

function isOpenTodo(artifact: Artifact) {
  return artifact.type === 'todo' && artifact.status !== 'done' && artifact.status !== 'cancelled';
}

export function selectInPlay(artifacts: Artifact[], now = new Date()): Artifact[] {
  const today = localDateStamp(now);
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
export function selectNextUp(artifacts: Artifact[], now = new Date(), limit = 12): Artifact[] {
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

export function recordKind(artifact: Artifact): RecordKind | null {
  if (artifact.type === 'todo' && artifact.status === 'done' && artifact.completedDate) return 'completed';
  if (artifact.type === 'decision') return 'decision';
  if (artifact.type === 'inbox') return 'capture';
  if (artifact.type === 'development' && artifact.tags?.includes('session')) return 'session';
  return null;
}

export function recordDateStamp(artifact: Artifact): string {
  if (artifact.type === 'todo' && artifact.completedDate) return artifact.completedDate;
  const timestamp = new Date(artifact.updated || artifact.created);
  return Number.isFinite(timestamp.getTime()) ? localDateStamp(timestamp) : localDateStamp();
}

function recordTimestamp(artifact: Artifact): number {
  if (artifact.type === 'todo' && artifact.completedDate) {
    return new Date(`${artifact.completedDate}T12:00:00`).getTime();
  }
  return new Date(artifact.updated || artifact.created).getTime();
}

export function selectRecord(artifacts: Artifact[], now = new Date(), lookbackDays = 14): Artifact[] {
  const earliest = startOfDay(subDays(now, lookbackDays - 1)).getTime();
  return artifacts
    .filter((artifact) => {
      if (!recordKind(artifact)) return false;
      const timestamp = recordTimestamp(artifact);
      return Number.isFinite(timestamp) && timestamp >= earliest;
    })
    .sort((a, b) => recordTimestamp(b) - recordTimestamp(a));
}
