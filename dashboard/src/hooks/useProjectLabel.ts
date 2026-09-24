import { useCallback, useMemo } from 'react';
import { useArtifacts } from '../data/selectors';

/**
 * `project:` may hold a project's id or its title (see isLinkedToProject);
 * rows should always show the title.
 */
export function useProjectLabel(): (project: string | undefined) => string | undefined {
  const artifacts = useArtifacts();
  const titles = useMemo(
    () =>
      new Map(
        artifacts
          .filter((artifact) => artifact.type === 'project')
          .map((project) => [project.id, project.title]),
      ),
    [artifacts],
  );
  return useCallback((project) => (project ? titles.get(project) ?? project : undefined), [titles]);
}
