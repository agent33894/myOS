import { useState } from 'react';
import { toast } from 'sonner';
import { capture } from '../../data/gateway';
import { closeOverlay, useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '../../ui';

/**
 * ⌘N: one line into today's daily note (or the capture file from Settings).
 * `[ ]`, a date such as "tomorrow", a repeat such as "every tue", or `!` makes it a task.
 */
export function QuickCapture() {
  const open = useUIStore((state) => state.overlay === 'capture');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const note = await capture(text);
      setText('');
      closeOverlay();
      toast.success(`Added to ${note.path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add that');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeOverlay()}>
      <DialogContent size="md" className="mt-24 self-start">
        <DialogTitle className="sr-only">Capture</DialogTitle>
        <DialogDescription className="sr-only">Add a line to today’s daily note. Start with [ ] or add a date to make it a task.</DialogDescription>
        <Input
          autoFocus
          variant="ghost"
          aria-label="Capture"
          placeholder="Call Sam tomorrow #work"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          className="h-12 text-md"
        />
      </DialogContent>
    </Dialog>
  );
}
