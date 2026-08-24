import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SaveStateIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isActivelyEditing: boolean;
}

/**
 * Ambient save state: a five-pixel dot and a whisper of mono garnish — never a
 * button. Shared by the artifact workspace header and the Living Page pane.
 */
export default function SaveStateIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  isActivelyEditing,
}: SaveStateIndicatorProps) {
  const state: 'editing' | 'saving' | 'saved' = isActivelyEditing
    ? 'editing'
    : (isSaving || hasUnsavedChanges)
      ? 'saving'
      : 'saved';

  const formatLastSavedRelative = () => {
    if (!lastSaved) return null;
    const secondsAgo = Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000);
    if (secondsAgo < 60) return 'Just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    return lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const label = state === 'editing'
    ? 'Editing…'
    : state === 'saving'
      ? 'Saving…'
      : lastSaved
        ? `Saved ${formatLastSavedRelative()}`
        : 'Saved';

  return (
    <span className="chronicle-editor-savestate" aria-live="polite">
      {state === 'saving' ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <span
          className={cn('chronicle-editor-savedot', state === 'editing' && 'is-editing')}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
