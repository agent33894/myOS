import { useMemo } from 'react';
import { projectSwatchFor } from '@shared/design-system/accents';
import { matchProject } from '@shared/inbox';
import { ArtifactType } from '@shared/types';
import { PROJECT_CLOSED_STATUSES } from '@shared/spec';
import { useArtifacts } from '../../data/selectors';

export interface ProjectRef {
  id: string;
  title: string;
  filePath: string;
  /** Decorative swatch color for dots and bars. */
  color: string;
  closed: boolean;
}

export const projectColor = (project: { title: string; swatch?: string }) =>
  projectSwatchFor(project.title, project.swatch).hex;

/**
 * Every project, plus lookup by the `project:` value items carry (an id, or a
 * title in older files) and by the prefix typed after `@`.
 */
export function useProjectRefs() {
  const artifacts = useArtifacts();
  return useMemo(() => {
    const all: ProjectRef[] = artifacts
      .filter((artifact) => artifact.type === ArtifactType.PROJECT)
      .map((project) => ({
        id: project.id,
        title: project.title,
        filePath: project.filePath,
        color: projectColor(project),
        closed: PROJECT_CLOSED_STATUSES.has(project.status),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
    const open = all.filter((project) => !project.closed);

    const find = (ref?: string | null) =>
      ref ? all.find((project) => project.id === ref || project.title === ref) : undefined;

    const match = (typed: string) => matchProject(typed, open);

    return { all, open, find, match };
  }, [artifacts]);
}
