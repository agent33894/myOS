import { useCallback } from 'react';
import { projectSwatchFor } from '@shared/design-system/accents';
import type { Artifact } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { joinTitleEcho, splitTitleEcho } from '../shell/titleEcho';
import { projectBaseArtifact, useArtifactEdit } from './projectMutations';

/**
 * Rename a project without side effects. The swatch is pinned to the old
 * title's deterministic color first, so renaming never shifts the project's
 * ink; artifacts still linked by title are then relinked to the rename-stable
 * project id. Accepts plain Artifacts or ProjectWithStats (resolved to the
 * raw store artifact via projectBaseArtifact).
 */
export function useProjectRename() {
  const { applyEdit } = useArtifactEdit();

  const rename = useCallback(
    async (project: Artifact, newTitle: string) => {
      const base = projectBaseArtifact(project.id) ?? project;
      const title = newTitle.trim();
      if (!title || title === base.title) return;

      const oldTitle = base.title;
      // The scaffolded "# <title>" body echo must follow the rename, or the
      // old title lingers as visible Brief content.
      const { body, hadEcho } = splitTitleEcho(base.content, oldTitle);
      await applyEdit(
        base,
        {
          title,
          swatch: base.swatch ?? projectSwatchFor(oldTitle).name,
          content: joinTitleEcho(body, hadEcho, title),
        },
        `Rename project to ${title}`,
      );

      const linkedByTitle = useArtifactsStore
        .getState()
        .artifacts.filter(
          (artifact) => artifact.id !== base.id && artifact.project === oldTitle,
        );
      for (const artifact of linkedByTitle) {
        await applyEdit(artifact, { project: base.id }, `Relink ${artifact.title}`);
      }
    },
    [applyEdit],
  );

  return { rename };
}
