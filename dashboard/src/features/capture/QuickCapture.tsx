import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, CornerDownLeft } from 'lucide-react';
import { captureLine } from '@shared/capture';
import { capture, dailyPath } from '../../data/gateway';
import { offerUndo } from '../../data/undo';
import { useSettings } from '../../store/settings';
import { closeOverlay, useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Icon, Input, Kbd } from '../../ui';

/** Where a capture goes right now: today's daily note, or the capture file from Settings. */
function useCaptureTarget(open: boolean): string | null {
  const setting = useSettings((state) => state.captureTarget);
  const dailyFolder = useSettings((state) => state.dailyFolder);
  const dailyPattern = useSettings((state) => state.dailyPattern);
  const [daily, setDaily] = useState<string | null>(null);
  useEffect(() => {
    if (!open || setting !== 'daily') return;
    let live = true;
    void dailyPath().then((path) => live && setDaily(path));
    return () => {
      live = false;
    };
  }, [open, setting, dailyFolder, dailyPattern]);
  return setting === 'daily' ? daily : setting;
}

/**
 * ⌘N (and `myos-next --capture`): one line into today's daily note, or the
 * capture file from Settings. `[ ]`, a date such as "tomorrow", a repeat
 * such as "every tue", or `!` makes it a task. Enter saves and closes;
 * Shift+Enter saves and stays open for the next line.
 */
export function QuickCapture() {
  const open = useUIStore((state) => state.overlay === 'capture');
  const heading = useSettings((state) => state.captureHeading);
  const target = useCaptureTarget(open);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const line = text.trim() ? captureLine(text) : null;

  const submit = async (keepOpen: boolean) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const note = await capture(text, target ?? undefined);
      setText('');
      if (!keepOpen) closeOverlay();
      offerUndo(`Added to ${note.path}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add that');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeOverlay()}>
      <DialogContent size="md" className="mt-24 gap-3 self-start p-4">
        <DialogTitle className="sr-only">Capture</DialogTitle>
        <DialogDescription className="sr-only">Add a line to today’s daily note. Start with [ ] or add a date to make it a task.</DialogDescription>
        <Input
          autoFocus
          variant="ghost"
          aria-label="Capture"
          placeholder="Ship the parser fix tomorrow #release"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit(event.shiftKey);
            }
          }}
          className="h-12 pr-8 text-md"
        />
        <div className="flex min-h-6 items-center gap-2 px-1 text-sm text-text-secondary">
          <Icon icon={ArrowRight} size="sm" className="text-text-tertiary" />
          <span className="min-w-0 truncate font-mono text-xs">
            {target ?? '…'}
            {heading ? ` › ${heading}` : ''}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
            <Kbd shortcut="enter" /> add
            <span className="ml-2" />
            <Kbd shortcut="shift+enter" /> add another
          </span>
        </div>
        {line ? (
          <p className="flex items-center gap-2 truncate rounded-md bg-sunken px-3 py-2 font-mono text-xs text-text-secondary">
            <Icon icon={CornerDownLeft} size="sm" className="text-text-tertiary" />
            <span className="truncate">{line}</span>
          </p>
        ) : (
          <p className="px-1 text-xs text-text-tertiary">Start with [ ], or add a date such as tomorrow or fri, to make it a task.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
