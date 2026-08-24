import { useMemo } from 'react';
import { useArtifacts } from '../store/selectors';
import type { Artifact } from '../types/artifacts';
import { ArtifactType as ArtifactTypeEnum } from '../types/artifacts';
import { localDateStamp } from '../features/today/todaySelectors';
import { computeProjectStats, isLinkedToProject, type ProjectStats } from './projectStats';

export interface ProjectWithStats extends Omit<Artifact, 'type'>, ProjectStats {
  type: ArtifactTypeEnum.PROJECT;
  linkedArtifacts: Artifact[];
}

/**
 * Projects with computed statistics: linked artifacts (via `project:` title/id
 * match plus `related:` links in either direction), task ledger, materials,
 * and health. Pure logic lives in projectStats.ts.
 */
export function useProjects() {
  const artifacts = useArtifacts();

  const allProjects = useMemo(() => {
    const today = localDateStamp();
    const projects = artifacts.filter((a) => a.type === ArtifactTypeEnum.PROJECT);

    return projects.map((project): ProjectWithStats => {
      const linkedArtifacts = artifacts.filter((a) => isLinkedToProject(a, project));
      return {
        ...(project as Artifact & { type: ArtifactTypeEnum.PROJECT }),
        linkedArtifacts,
        ...computeProjectStats(project, linkedArtifacts, today),
      };
    });
  }, [artifacts]);

  return { allProjects };
}
