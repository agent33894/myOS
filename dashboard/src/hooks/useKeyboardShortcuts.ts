import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteActions, useModalToggleActions } from '../store/selectors';
import { useUIStore } from '../store/ui';
import { sidebarRoutes } from '../app/routes';
import { hasPrimaryModifier } from '../utils/platform';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { openCommandPalette, toggleCommandPalette } = useCommandPaletteActions();
  const { toggleQuickCapture, toggleKeyboardShortcuts } = useModalToggleActions();
  const navRoutes = useMemo(() => sidebarRoutes.map((item) => item.href), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // New Artifact: Cmd+Shift+N — Quick Capture, same as Cmd+N. Creation
      // happens in the overlay; nothing navigates to the hidden workspace.
      if (hasPrimaryModifier(e) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        toggleQuickCapture();
        return;
      }

      // Quick Capture: Cmd+N (Mac) or Ctrl+N (Windows)
      if (hasPrimaryModifier(e) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        toggleQuickCapture();
        return;
      }

      // Search: Cmd+F (Mac) or Ctrl+F (Windows)
      if (hasPrimaryModifier(e) && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Command Palette: Cmd+K (Mac) or Ctrl+K (Windows)
      if (hasPrimaryModifier(e) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd/Ctrl + 1-9: Navigate to pages (sequentially based on top nav order).
      // Suppressed while an overlay is open — navigating underneath a capture
      // or palette reads as the app losing your place.
      if (hasPrimaryModifier(e) && e.key >= '1' && e.key <= '9') {
        const ui = useUIStore.getState();
        if (ui.isCommandPaletteOpen || ui.isQuickCaptureOpen || ui.isKeyboardShortcutsOpen) return;
        // Component-local dialogs (Inbox processor, Refine, save/load modals)
        // aren't in the ui store; their mounted surface is the guard. Changing
        // the route underneath an open dialog reads as the app losing your place.
        if (document.querySelector('.chronicle-modal-layer')) return;
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (navRoutes[index]) {
          navigate(navRoutes[index]);
        }
      }

      // ? key: Show keyboard shortcuts help (only when not in input)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          toggleKeyboardShortcuts();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    navigate,
    navRoutes,
    openCommandPalette,
    toggleCommandPalette,
    toggleQuickCapture,
    toggleKeyboardShortcuts,
  ]);
}
