import { toast } from 'sonner';
import { ArtifactType } from '@shared/types';
import { toNoteUrl } from '../../app/navigation';
import { create } from '../../data/gateway';

/** Open a fresh note with the title selected, ready to type. */
export async function createNote(fields: { project?: string } = {}): Promise<string | null> {
  try {
    const note = await create({ type: ArtifactType.MEMO, title: '', ...fields }, 'Create note');
    return `${toNoteUrl(note.filePath)}&new=1`;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create a note');
    return null;
  }
}
