import { useEffect } from 'react';
import { Minimize2 } from 'lucide-react';
import { hasPrimaryModifier } from '../../lib/platform';
import { useUIStore } from '../../store/ui';
import { Button, Kbd } from '../../ui';
import { SaveAsTemplate } from './SaveAsTemplate';
import { TemplatePicker } from './TemplatePicker';
import './focus.css';

export const FOCUS_SHORTCUT = 'mod+.';

export const toggleFocusMode = () => {
  const { focusMode, setFocusMode } = useUIStore.getState();
  setFocusMode(!focusMode);
};

// A menu, popover, or dialog handles its own Escape first.
const overlayOpen = () => document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-popper-content-wrapper]') !== null;

// The find bar and other fields close themselves on Escape first.
const inField = (target: EventTarget | null) => target instanceof HTMLElement && target.tagName === 'INPUT';

/** ⌘. toggles focus mode and Escape leaves it; the page reads `html[data-focus-mode]` to step its chrome back. */
function useFocusMode() {
  const focusMode = useUIStore((state) => state.focusMode);

  useEffect(() => {
    const root = document.documentElement;
    if (focusMode) root.dataset.focusMode = '';
    else delete root.dataset.focusMode;
    return () => {
      delete root.dataset.focusMode;
    };
  }, [focusMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && event.key === '.') {
        event.preventDefault();
        toggleFocusMode();
      } else if (event.key === 'Escape' && useUIStore.getState().focusMode && !overlayOpen() && !inField(event.target)) {
        useUIStore.getState().setFocusMode(false);
      }
    };
    // Capture: the editor claims Escape for itself, but outside a menu Escape always means "leave focus".
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
}

/** Knowledge features that live above every page: focus mode and the template dialogs. Mounted once by AppShell. */
export function KnowledgeLayer() {
  useFocusMode();
  return (
    <>
      <TemplatePicker />
      <SaveAsTemplate />
    </>
  );
}

/** The one piece of chrome focus mode keeps: a quiet way out. */
export function FocusExit() {
  return (
    <Button
      size="sm"
      variant="ghost"
      leadingIcon={Minimize2}
      onClick={() => useUIStore.getState().setFocusMode(false)}
      className="focus-exit no-drag ml-auto"
    >
      Exit focus
      <Kbd shortcut="escape" className="bg-transparent" />
    </Button>
  );
}
