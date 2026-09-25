import { useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Kbd } from '../../ui';
import { SHORTCUT_GROUPS } from './shortcuts';

/** The `?` sheet: every shortcut, grouped. */
export function KeyboardShortcutsDialog() {
  const open = useUIStore((state) => state.isKeyboardShortcutsOpen);
  const close = useUIStore((state) => state.closeKeyboardShortcuts);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        size="lg"
        aria-describedby={undefined}
        className="gap-6 lg:max-w-5xl"
        // A reference sheet: focus the sheet itself, not its close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUT_GROUPS.map((group, index) => (
            <section key={group.title} aria-labelledby={`shortcuts-group-${index}`} className="flex flex-col gap-1">
              <h3 id={`shortcuts-group-${index}`} className="pb-1 text-sm font-medium text-text-secondary">
                {group.title}
              </h3>
              {group.items.map((item) => (
                <div key={item.label} className="flex h-8 items-center justify-between gap-4 text-base text-text">
                  <span>{item.label}</span>
                  <Kbd shortcut={item.keys} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
