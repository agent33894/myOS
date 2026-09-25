import { useActivePath } from '../../store/ui';
import { readingTime, useNoteStatus } from './noteStatus';

/** Status bar: the note's words, reading time, and whether it is saved. */
export function NoteStatusItem() {
  const active = useActivePath();
  const { path, words, saving, dirty, saved } = useNoteStatus();
  if (!active || active !== path) return null;
  const state = saving ? 'Saving…' : dirty ? 'Not saved yet' : saved ? 'Saved' : null;
  return (
    <span aria-live="polite" className="flex items-center gap-2">
      <span>
        {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
      </span>
      {words > 0 ? <span>· {readingTime(words)}</span> : null}
      {state ? <span>· {state}</span> : null}
    </span>
  );
}
