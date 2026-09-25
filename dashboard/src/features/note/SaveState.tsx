/** A whisper of save status: “Saving…”, then “Saved”. */
export function SaveState({ saving, dirty, saved }: { saving: boolean; dirty: boolean; saved: boolean }) {
  const label = saving ? 'Saving…' : !dirty && saved ? 'Saved' : '';
  return (
    <span aria-live="polite" className="text-xs text-text-tertiary transition-opacity duration-base">
      {label}
    </span>
  );
}
