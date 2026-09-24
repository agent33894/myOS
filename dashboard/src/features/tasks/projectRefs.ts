import { useMemo } from 'react';
import { projectSwatchFor } from '@shared/design-system/accents';
import { ArtifactType } from '@shared/types';
import { PROJECT_CLOSED_STATUSES } from '../../data/projects';
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

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

    /** `@kitch` finds "Kitchen renovation": exact id or title first, then prefixes. */
    const match = (typed: string) => {
      const wanted = slug(typed);
      if (!wanted) return undefined;
      return (
        open.find((project) => project.id === typed || slug(project.title) === wanted) ??
        open.find((project) => slug(project.title).startsWith(wanted) || project.id.startsWith(wanted))
      );
    };

    return { all, open, find, match };
  }, [artifacts]);
}
