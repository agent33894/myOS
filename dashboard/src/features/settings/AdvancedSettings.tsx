import { useState } from 'react';
import { toast } from 'sonner';
import { Keyboard, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '../../store/settings';
import { useUIStore } from '../../store/ui';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui';
import { GitRules } from './GitRules';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

function ResetSettings() {
  const [open, setOpen] = useState(false);
  const reset = useSettingsStore((state) => state.resetAllSettings);

  return (
    <SettingsRow
      label="Reset settings"
      description="Theme, accent, reading font, and reminders go back to their defaults. Your files are not touched."
      control={
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="danger" leadingIcon={RotateCcw} onClick={() => setOpen(true)}>
            Reset…
          </Button>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Reset all settings?</DialogTitle>
              <DialogDescription>
                Appearance and reminders return to their defaults. Your folder and files stay as they are.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button
                variant="danger"
                onClick={() => {
                  reset();
                  setOpen(false);
                  toast.success('Settings reset');
                }}
              >
                Reset settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

export function AdvancedSettings() {
  const openShortcuts = useUIStore((state) => state.openKeyboardShortcuts);

  return (
    <>
      <SettingsGroup
        title="Git"
        description="If your folder is in a Git repository, choose which folders Git should ignore. myOS keeps these rules in .gitignore."
      >
        <GitRules />
      </SettingsGroup>

      <SettingsGroup title="Help">
        <SettingsRow
          label="Keyboard shortcuts"
          description="Every shortcut in one place. Press ? anytime to see them."
          control={
            <Button leadingIcon={Keyboard} onClick={openShortcuts}>
              Show shortcuts
            </Button>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Reset">
        <ResetSettings />
      </SettingsGroup>
    </>
  );
}
