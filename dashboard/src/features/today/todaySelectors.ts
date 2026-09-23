import { startOfDay, subDays } from 'date-fns';
import { formatLocalDate } from '@shared/date';
import type { Artifact } from '../../types/artifacts';

export { selectInPlay, selectNextUp } from '@shared/today';

export type RecordKind = 'capture' | 'decision' | 'session' | 'completed';

export function localDateStamp(date = new Date()): string {
  return formatLocalDate(date);
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
