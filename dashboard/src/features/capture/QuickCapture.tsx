import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { capture } from '../../data/gateway';
import { useUIStore } from '../../store/ui';
import { Button, Dialog, DialogContent, DialogTitle, Icon, Kbd, Textarea } from '../../ui';
import { toastWithUndo } from '../tasks/actions';
import { useProjectRefs } from '../tasks/projectRefs';
import { CaptureTokens } from './CaptureTokens';
import { resolveCapture } from './resolveCapture';

/**
 * Type and press ⏎; no decisions. `tomorrow`, `#tag`, `@project`, and `!`
 * are optional and show up as pills while you type. Anything with a date,
 * flag, or project becomes a task there; everything else waits in the Inbox.
 */
export default function QuickCapture() {
  const close = useUIStore((state) => state.closeQuickCapture);
  const setStoredDraft = useUIStore((state) => state.setQuickCaptureDraft);
  const [text, setText] = useState(() => useUIStore.getState().quickCaptureDraft);
  const projects = useProjectRefs();
  const resolved = useMemo(() => (text.trim() ? resolveCapture(text, projects.open) : null), [text, projects]);

  // The dialog unmounts on close; the store keeps an unsent draft so Escape never loses it.
  useEffect(() => setStoredDraft(text), [text, setStoredDraft]);

  const save = () => {
    if (!resolved) return;
    close();
    useUIStore.getState().clearQuickCaptureDraft();
    capture(text)
      .then(() => toastWithUndo('Captured'))
      .catch((error: unknown) => {
        useUIStore.getState().setQuickCaptureDraft(text);
        toast.error(error instanceof Error ? error.message : 'Could not capture that. Your text is kept.');
      });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent aria-describedby={undefined} className="mt-24 max-w-xl gap-0 self-start p-0">
        <DialogTitle className="sr-only">Quick capture</DialogTitle>
        <div className="px-6 pb-4 pt-6">
          <Textarea
            autoFocus
            autosize
            variant="ghost"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                save();
              }
            }}
            placeholder="What’s on your mind?"
            aria-label="Capture"
            className="max-h-64 min-h-8 px-0 pr-8 text-lg hover:bg-transparent focus-visible:bg-transparent"
          />
          <CaptureTokens tokens={resolved?.tokens ?? []} className="mt-3" />
        </div>
        <div className="flex items-center gap-3 rounded-b-xl bg-text/5 px-6 py-3">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-text-secondary">
            <Icon icon={ArrowRight} size="sm" className="text-text-tertiary" />
            <span className="truncate">{resolved?.destination ?? 'Inbox'}</span>
          </p>
          <span className="hidden items-center gap-1 text-xs text-text-tertiary sm:flex">
            <Kbd shortcut="shift+enter" /> new line
          </span>
          <Button variant="primary" size="sm" onClick={save} disabled={!resolved}>
            Capture
            <Kbd shortcut="enter" className="h-4 bg-accent-on/15 text-accent-on" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
