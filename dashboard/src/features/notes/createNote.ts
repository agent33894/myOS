import { toast } from 'sonner';
import { ArtifactType } from '@shared/types';
import { toNoteUrl } from '../../app/navigation';
import { create } from '../../data/gateway';

/** A fresh note in a project, opened with its title selected (`?new=1`). */
export async function createNote(fields: { project?: string } = {}): Promise<string | null> {
  try {
    const note = await create({ type: ArtifactType.MEMO, title: 'Untitled', ...fields }, 'Create note');
    return toNoteUrl(note.filePath, { isNew: true });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create a note');
    return null;
  }
}
