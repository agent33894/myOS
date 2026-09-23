import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Feather, Search } from 'lucide-react';
import { Sidebar } from '../features/shell/Sidebar';
import { PaneDivider } from '../components/ui/PaneDivider';
import CommandPalette from '../components/layout/CommandPalette';
import QuickCapture from '../components/layout/QuickCapture';
import KeyboardShortcutsModal from '../components/layout/KeyboardShortcutsModal';
import { useArtifactsStore } from '../store/artifacts';
import { useFileWatcher } from '../hooks/useFileWatcher';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNotificationGenerator } from '../hooks/useNotificationGenerator';
import { useModalStates, useCommandPaletteActions, useQuickCaptureActions } from '../store/selectors';
import { useUIStore } from '../store/ui';
import { getRoute } from './routes';
import { primaryModifier } from '../utils/platform';

const SIDEBAR_WIDTH_KEY = 'chronicle-sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'chronicle-sidebar-collapsed';

const NARROW_WINDOW_QUERY = '(max-width: 900px)';

export default function AppShell() {
  const location = useLocation();
  const route = getRoute(location.pathname);
  const loadArtifacts = useArtifactsStore((state) => state.loadArtifacts);
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || 212);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1',
  );
  // Tiled windows (Omarchy halves, thirds, quarters) get the icon rail without
  // touching the saved preference for wide windows.
  const [isNarrowWindow, setIsNarrowWindow] = useState(() => window.matchMedia(NARROW_WINDOW_QUERY).matches);
  const isRail = sidebarCollapsed || isNarrowWindow;
  const { isCommandPaletteOpen, isQuickCaptureOpen, isKeyboardShortcutsOpen } = useModalStates();
  const { openCommandPalette } = useCommandPaletteActions();
  const { openQuickCapture } = useQuickCaptureActions();

  useEffect(() => { void loadArtifacts(); }, [loadArtifacts]);
  useEffect(() => {
    const media = window.matchMedia(NARROW_WINDOW_QUERY);
    const sync = () => setIsNarrowWindow(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  // Collapse the sidebar to the icon rail the narrow window already uses.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Escape always dismisses overlays, even when focus is outside the modal input.
  const anyOverlayOpen = isCommandPaletteOpen || isQuickCaptureOpen || isKeyboardShortcutsOpen;
  useEffect(() => {
    if (!anyOverlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // A popover/menu inside the overlay owns this Escape — it closes itself.
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-radix-popper-content-wrapper]')) return;
      const { closeCommandPalette, closeQuickCapture, closeKeyboardShortcuts } = useUIStore.getState();
      closeCommandPalette();
      closeQuickCapture();
      closeKeyboardShortcuts();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [anyOverlayOpen]);
  // `myos --capture` (e.g. from a Hyprland keybinding) opens Quick Capture here.
  useEffect(() => window.electronAPI.onOpenQuickCapture(() => useUIStore.getState().openQuickCapture()), []);
  useFileWatcher();
  useKeyboardShortcuts();
  useNotificationGenerator();

  return (
    <div
      className={isRail ? 'chronicle-app is-sidebar-collapsed' : 'chronicle-app'}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      {isCommandPaletteOpen ? <CommandPalette /> : null}
      {isQuickCaptureOpen ? <QuickCapture /> : null}
      {isKeyboardShortcutsOpen ? <KeyboardShortcutsModal /> : null}
      <Sidebar
        collapsed={isRail}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <PaneDivider label="Resize sidebar" value={sidebarWidth} min={184} max={300} onChange={setSidebarWidth} />
      <section className="chronicle-workspace">
        <header className="chronicle-toolbar window-drag-region">
          <strong>{route?.label ?? 'Not found'}</strong>
          <div className="chronicle-toolbar-actions no-drag">
            <button className="chronicle-search-button active:scale-[0.99]" onClick={openCommandPalette}><Search className="h-4 w-4" /> Search or command… <kbd>{primaryModifier}K</kbd></button>
            <button className="chronicle-capture-button active:scale-[0.96]" onClick={openQuickCapture} aria-label="Quick capture"><Feather className="h-4 w-4" /></button>
          </div>
        </header>
        <main id="main-content-area" className="chronicle-main">
          <Suspense fallback={<div className="chronicle-loading" data-testid="route-loading">Loading…</div>}><Outlet /></Suspense>
        </main>
      </section>
    </div>
  );
}
