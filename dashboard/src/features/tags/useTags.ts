import { useMemo } from 'react';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { useArtifacts } from '../../data/selectors';

export interface TagCount {
  tag: string;
  count: number;
}

/** Tags in use on notes, tasks, and projects (templates don't count), most used first. */
export function tagCounts(items: readonly ArtifactSummary[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.type === ArtifactType.TEMPLATE) continue;
    for (const tag of new Set(item.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function useTags(): TagCount[] {
  const artifacts = useArtifacts();
  return useMemo(() => tagCounts(artifacts), [artifacts]);
}
