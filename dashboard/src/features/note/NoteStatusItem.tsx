import { useActivePath } from '../../store/ui';
import { useNoteStatus } from './noteStatus';

/** Status bar: the note's word count and whether it is saved. */
export function NoteStatusItem() {
  const active = useActivePath();
  const { path, words, saving, dirty, saved } = useNoteStatus();
  if (!active || active !== path) return null;
  return (
    <span aria-live="polite">
      {words} {words === 1 ? 'word' : 'words'}
      {saving ? ' · saving' : dirty ? ' · edited' : saved ? ' · saved' : ''}
    </span>
  );
}
