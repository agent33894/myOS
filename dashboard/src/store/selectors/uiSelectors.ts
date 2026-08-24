import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../ui';

// ============ UI STORE SELECTORS ============

export const useIsKeyboardShortcutsOpen = () => useUIStore((state) => state.isKeyboardShortcutsOpen);

export const useModalStates = () =>
  useUIStore(
    useShallow((state) => ({
      isCommandPaletteOpen: state.isCommandPaletteOpen,
      isQuickCaptureOpen: state.isQuickCaptureOpen,
      isKeyboardShortcutsOpen: state.isKeyboardShortcutsOpen,
    }))
  );

// Action selectors
export const useCommandPaletteActions = () =>
  useUIStore(
    useShallow((state) => ({
      openCommandPalette: state.openCommandPalette,
      closeCommandPalette: state.closeCommandPalette,
      toggleCommandPalette: state.toggleCommandPalette,
    }))
  );

export const useQuickCaptureActions = () =>
  useUIStore(
    useShallow((state) => ({
      openQuickCapture: state.openQuickCapture,
      closeQuickCapture: state.closeQuickCapture,
      toggleQuickCapture: state.toggleQuickCapture,
    }))
  );

export const useKeyboardShortcutsActions = () =>
  useUIStore(
    useShallow((state) => ({
      openKeyboardShortcuts: state.openKeyboardShortcuts,
      closeKeyboardShortcuts: state.closeKeyboardShortcuts,
      toggleKeyboardShortcuts: state.toggleKeyboardShortcuts,
    }))
  );

/**
 * All modal toggle actions - for keyboard shortcuts
 */
export const useModalToggleActions = () =>
  useUIStore(
    useShallow((state) => ({
      toggleCommandPalette: state.toggleCommandPalette,
      toggleQuickCapture: state.toggleQuickCapture,
      toggleKeyboardShortcuts: state.toggleKeyboardShortcuts,
    }))
  );
