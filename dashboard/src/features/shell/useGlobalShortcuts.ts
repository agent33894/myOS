import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sections } from '../../app/routes';
import { toSettingsUrl } from '../../app/navigation';
import { useUIStore } from '../../store/ui';
import { hasPrimaryModifier } from '../../lib/platform';
import { sectionUrl } from './navigationMemory';
import { useCreate } from './useCreate';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

// Navigating underneath an open dialog reads as the app losing your place.
const dialogOpen = () => document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;

/**
 * App-wide shortcuts (see shortcuts.ts). ⌘F is left to pages and the editor;
 * ⌘Z is bound by useUndoShortcuts.
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate();
  const { newNote } = useCreate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUIStore.getState();
      const key = event.key.toLowerCase();

      if (!hasPrimaryModifier(event)) {
        if (event.key === '?' && !event.altKey && !isTyping(event.target)) {
          event.preventDefault();
          ui.toggleKeyboardShortcuts();
        }
        return;
      }
      if (event.altKey) return;

      if (key === 'k') {
        event.preventDefault();
        ui.toggleCommandPalette();
      } else if (key === 'n') {
        event.preventDefault();
        if (event.shiftKey) {
          ui.closeCommandPalette();
          void newNote();
        } else {
          ui.toggleQuickCapture();
        }
      } else if (key === '\\') {
        event.preventDefault();
        ui.toggleSidebar();
      } else if (!event.shiftKey && (key === ',' || /^[1-9]$/.test(key)) && !dialogOpen()) {
        const section = sections[Number(key) - 1];
        const target = key === ',' ? toSettingsUrl() : section && sectionUrl(section);
        if (!target) return;
        event.preventDefault();
        navigate(target);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, newNote]);
}
