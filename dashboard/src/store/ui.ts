import { create } from 'zustand';

const SIDEBAR_KEY = 'myos-sidebar';
const RECENT_KEY = 'myos-recent';
const RECENT_LIMIT = 8;

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 240;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the preference just won't survive a restart.
  }
};

const clampWidth = (width: number) =>
  Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)));

interface SidebarPrefs {
  width: number;
  collapsed: boolean;
}

const sidebar = readJson<Partial<SidebarPrefs>>(SIDEBAR_KEY, {});
const recent = readJson<unknown>(RECENT_KEY, []);

interface UIState {
  isCommandPaletteOpen: boolean;
  isQuickCaptureOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  /** Unsent capture survives Escape/⌘N so a reflexive close never loses a draft. */
  quickCaptureDraft: string;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  /** Workspace paths of recently opened items, newest first. */
  recentPaths: string[];
  /** Focus mode (⌘.): no sidebar or page chrome, just the writing. Never persisted. */
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  setQuickCaptureDraft: (draft: string) => void;
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
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  addRecent: (path: string) => void;
}

const CLOSED = { isCommandPaletteOpen: false, isQuickCaptureOpen: false, isKeyboardShortcutsOpen: false };

export const useUIStore = create<UIState>((set, get) => {
  const persistSidebar = () => {
    const { sidebarWidth: width, sidebarCollapsed: collapsed } = get();
    writeJson(SIDEBAR_KEY, { width, collapsed });
  };

  return {
    ...CLOSED,
    quickCaptureDraft: '',
    sidebarWidth: clampWidth(typeof sidebar.width === 'number' ? sidebar.width : SIDEBAR_DEFAULT_WIDTH),
    sidebarCollapsed: sidebar.collapsed === true,
    focusMode: false,
    setFocusMode: (focusMode) => set({ focusMode }),
    recentPaths: Array.isArray(recent) ? recent.filter((path): path is string => typeof path === 'string') : [],
    setQuickCaptureDraft: (draft) => set({ quickCaptureDraft: draft }),
    clearQuickCaptureDraft: () => set({ quickCaptureDraft: '' }),
    // Overlays are mutually exclusive: opening one closes the others.
    openCommandPalette: () => set({ ...CLOSED, isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleCommandPalette: () => set((state) => ({ ...CLOSED, isCommandPaletteOpen: !state.isCommandPaletteOpen })),
    openQuickCapture: () => set({ ...CLOSED, isQuickCaptureOpen: true }),
    closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
    toggleQuickCapture: () => set((state) => ({ ...CLOSED, isQuickCaptureOpen: !state.isQuickCaptureOpen })),
    openKeyboardShortcuts: () => set({ ...CLOSED, isKeyboardShortcutsOpen: true }),
    closeKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: false }),
    toggleKeyboardShortcuts: () =>
      set((state) => ({ ...CLOSED, isKeyboardShortcutsOpen: !state.isKeyboardShortcutsOpen })),
    setSidebarWidth: (width) => {
      set({ sidebarWidth: clampWidth(width) });
      persistSidebar();
    },
    toggleSidebar: () => {
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      persistSidebar();
    },
    addRecent: (path) => {
      if (get().recentPaths[0] === path) return;
      const recentPaths = [path, ...get().recentPaths.filter((item) => item !== path)].slice(0, RECENT_LIMIT);
      set({ recentPaths });
      writeJson(RECENT_KEY, recentPaths);
    },
  };
});
