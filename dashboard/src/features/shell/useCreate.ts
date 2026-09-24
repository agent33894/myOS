import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArtifactType } from '@shared/types';
import { toNoteUrl, toProjectUrl } from '../../app/navigation';
import { create } from '../../data/gateway';
import { useUIStore } from '../../store/ui';

const failed = (what: string) => (error: unknown) =>
  toast.error(error instanceof Error ? error.message : `Could not create the ${what}`);

/**
 * The three ways to make something, shared by the New button, the palette,
 * and shortcuts. New notes and projects open with `?new=1` so the page
 * focuses the title.
 */
export function useCreate() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      newTask: () => useUIStore.getState().openQuickCapture(),
      newNote: () =>
        create({ type: ArtifactType.MEMO, title: 'Untitled' }, 'Create note')
          .then((note) => navigate(toNoteUrl(note.filePath, { isNew: true })))
          .catch(failed('note')),
      newProject: () =>
        create({ type: ArtifactType.PROJECT, title: 'Untitled project' }, 'Create project')
          .then((project) => navigate(toProjectUrl(project.id, { isNew: true })))
          .catch(failed('project')),
    }),
    [navigate],
  );
}
