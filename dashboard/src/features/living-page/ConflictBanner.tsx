/** Shown instead of overwriting when the open file changed on disk while it had unsaved edits. */
export function ConflictBanner({ onLoadTheirs, onKeepMine }: { onLoadTheirs: () => void; onKeepMine: () => void }) {
  return (
    <div className="chronicle-undo-pill" role="alert">
      <span>This page changed on disk</span>
      <button onClick={onLoadTheirs}>Load theirs</button>
      <button onClick={onKeepMine}>Keep mine</button>
    </div>
  );
}
