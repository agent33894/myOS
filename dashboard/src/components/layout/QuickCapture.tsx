import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { parseCapture } from '@shared/inbox';
import { CommandSurface } from '../ui/CommandSurface';
import { primaryModifier } from '../../utils/platform';
import { useQuickCaptureActions } from '../../store/selectors';
import { useUIStore } from '../../store/ui';
import { capture } from '../../data/gateway';

/**
 * Type and press ⌘↵; no decisions. Optional inline syntax — `tomorrow`,
 * `fri`, `#tag`, `@project`, `!` — makes it a task; anything else waits in
 * the Inbox.
 */
export default function QuickCapture() {
  const { closeQuickCapture } = useQuickCaptureActions();
  const setStoreDraft = useUIStore((state) => state.setQuickCaptureDraft);
  const [text, setText] = useState(() => useUIStore.getState().quickCaptureDraft);
  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);

  // The component unmounts on close; mirror the draft so Escape or a
  // reflexive ⌘N never destroys an unsent capture.
  useEffect(() => {
    setStoreDraft(text);
  }, [text, setStoreDraft]);

  const save = useCallback(() => {
    if (!text.trim()) return;
    // Close immediately; persistence continues in the background and the
    // draft comes back if it fails.
    closeQuickCapture();
    useUIStore.getState().clearQuickCaptureDraft();
    capture(text)
      .then((artifact) => toast.success(artifact.type === 'todo' ? 'Added to tasks' : 'Captured to Inbox'))
      .catch((error: unknown) => {
        useUIStore.getState().setQuickCaptureDraft(text);
        toast.error(error instanceof Error ? error.message : 'Capture failed — draft kept');
      });
  }, [closeQuickCapture, text]);

  const details = parsed
    ? [
        parsed.due ? `due ${parsed.due}` : null,
        parsed.flagged ? 'flagged' : null,
        parsed.priority ? `${parsed.priority} priority` : null,
        parsed.projectRef ? `@${parsed.projectRef}` : null,
      ].filter(Boolean)
    : [];

  return (
    <CommandSurface title="Quick capture" onClose={closeQuickCapture}>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeQuickCapture();
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            save();
          }
        }}
        className="chronicle-capture-input"
        placeholder="What do you need to remember?"
        aria-label="Capture text"
      />
      <div className="chronicle-capture-rail">
        {details.length || parsed?.tags.length ? (
          <div className="chronicle-filing-tags" aria-label="Detected details">
            {details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
            {parsed?.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="chronicle-capture-footer">
        <span>{parsed?.kind === 'task' ? '→ Task' : '→ Inbox'}</span>
        <button className="chronicle-capture-submit active:scale-[0.98]" onClick={save} disabled={!text.trim()}>
          {primaryModifier}↵ Capture
        </button>
      </div>
    </CommandSurface>
  );
}
