import { closeOverlay, useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui';
import { ShortcutList } from './ShortcutList';

/** The `?` sheet: every shortcut, grouped. */
export function KeyboardShortcutsDialog() {
  const open = useUIStore((state) => state.overlay === 'shortcuts');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeOverlay()}>
      <DialogContent
        size="lg"
        aria-describedby={undefined}
        className="gap-6"
        // A reference sheet: focus the sheet itself, not its close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ShortcutList className="overflow-y-auto" />
      </DialogContent>
    </Dialog>
  );
}
