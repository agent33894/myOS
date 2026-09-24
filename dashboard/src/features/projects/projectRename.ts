import { useCallback } from 'react';
import { toast } from 'sonner';
import { projectSwatchFor } from '@shared/design-system/tokens';
import type { ArtifactSummary } from '@shared/types';
import { patchMany, read, save } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import { joinTitleEcho, splitTitleEcho } from '../shell/titleEcho';
import { projectBaseArtifact } from './projectMutations';

/**
 * Rename a project without side effects. The swatch is pinned to the old
 * title's color so the project keeps its ink, and items still linked by the
 * old title are relinked to the rename-stable project id.
 */
export function useProjectRename() {
  const rename = useCallback(async (project: ArtifactSummary, newTitle: string) => {
    const base = projectBaseArtifact(project.id) ?? project;
    const title = newTitle.trim();
    if (!title || title === base.title) return;
    const oldTitle = base.title;
    try {
      const fields = { title, swatch: base.swatch ?? projectSwatchFor(oldTitle).name };
      // An older page's "# <title>" first line follows the rename.
      const current = await read(base.filePath);
      const { body, hadEcho } = splitTitleEcho(current.content, oldTitle);
      if (hadEcho) await save(base.filePath, { fields: {}, content: joinTitleEcho(body, true, title) }, current.rev);

      const relinks = Object.values(useDataStore.getState().byPath)
        .filter((artifact) => artifact.id !== base.id && artifact.project === oldTitle)
        .map((artifact) => ({ path: artifact.filePath, fields: { project: base.id } }));
      await patchMany([{ path: base.filePath, fields }, ...relinks], `Rename project to ${title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not rename the project');
    }
  }, []);

  return { rename };
}
