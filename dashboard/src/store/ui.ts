import { create } from 'zustand';
import type { ArtifactType, Domain, TodoPriority } from '../types/artifacts';

/**
 * An unsent quick capture. `null` filing fields mean "untouched" — the
 * capture derives its filing from the text (explicit prefix) or stays Unfiled.
 */
export interface QuickCaptureDraft {
  text: string;
  type: ArtifactType | null;
  domain: Domain | null;
  priority: TodoPriority | null;
}

const EMPTY_QUICK_CAPTURE_DRAFT: QuickCaptureDraft = {
  text: '',
  type: null,
  domain: null,
  priority: null,
};

interface UIState {
  isCommandPaletteOpen: boolean;
  isQuickCaptureOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isZenMode: boolean;
  /** Unsent capture survives Escape/⌘N so a reflexive close never loses a draft. */
  quickCaptureDraft: QuickCaptureDraft;
  setQuickCaptureDraft: (draft: QuickCaptureDraft) => void;
  clearQuickCaptureDraft: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openQuickCapture: () => void;
  closeQuickCapture: () => void;
  toggleQuickCapture: () => void;
  openKeyboardShortcuts: () => void;
  closeKeyboardShortcuts: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleZenMode: () => void;
  setZenMode: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCommandPaletteOpen: false,
  isQuickCaptureOpen: false,
  isKeyboardShortcutsOpen: false,
  isZenMode: false,
  quickCaptureDraft: EMPTY_QUICK_CAPTURE_DRAFT,
  setQuickCaptureDraft: (draft: QuickCaptureDraft) => set({ quickCaptureDraft: draft }),
  clearQuickCaptureDraft: () => set({ quickCaptureDraft: EMPTY_QUICK_CAPTURE_DRAFT }),
  // Overlays are mutually exclusive — opening one closes the others.
  openCommandPalette: () => set({ isCommandPaletteOpen: true, isQuickCaptureOpen: false, isKeyboardShortcutsOpen: false }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen, isQuickCaptureOpen: false, isKeyboardShortcutsOpen: false })),
  openQuickCapture: () => set({ isQuickCaptureOpen: true, isCommandPaletteOpen: false, isKeyboardShortcutsOpen: false }),
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
  toggleQuickCapture: () => set((state) => ({ isQuickCaptureOpen: !state.isQuickCaptureOpen, isCommandPaletteOpen: false, isKeyboardShortcutsOpen: false })),
  openKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: true, isCommandPaletteOpen: false, isQuickCaptureOpen: false }),
  closeKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: false }),
  toggleKeyboardShortcuts: () => set((state) => ({ isKeyboardShortcutsOpen: !state.isKeyboardShortcutsOpen, isCommandPaletteOpen: false, isQuickCaptureOpen: false })),
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
  setZenMode: (value: boolean) => set({ isZenMode: value }),
}));
