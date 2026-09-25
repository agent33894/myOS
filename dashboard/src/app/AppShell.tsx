import { Suspense, useEffect, useSyncExternalStore } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import QuickCapture from '../features/capture/QuickCapture';
import { useArtifactSync } from '../data/store';
import { subscribe } from '../data/ipc';
import { useUndoShortcuts } from '../data/undo';
import { CommandPalette } from '../features/palette/CommandPalette';
import { FocusExit, KnowledgeLayer } from '../features/knowledge/KnowledgeLayer';
import { RitualHost } from '../features/rituals/slots';
import { KeyboardShortcutsDialog } from '../features/shell/KeyboardShortcutsDialog';
import { useNavigationMemory } from '../features/shell/navigationMemory';
import { Sidebar } from '../features/shell/sidebar/Sidebar';
import { useGlobalShortcuts } from '../features/shell/useGlobalShortcuts';
import { WindowStrip } from '../features/shell/WindowStrip';
import { useUIStore } from '../store/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingState } from '../ui';
import { useDueReminder } from './useDueReminder';

// Tiled windows (Omarchy halves, thirds, quarters) get the icon rail without
// touching the saved preference for wide windows.
const NARROW = '(max-width: 900px)';
const subscribeNarrow = (listener: () => void) => {
  const media = window.matchMedia(NARROW);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};

export default function AppShell() {
  const { pathname } = useLocation();
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches);
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const isQuickCaptureOpen = useUIStore((state) => state.isQuickCaptureOpen);
  // Focus mode (features/knowledge): no sidebar or window chrome, only a quiet way out.
  const focusMode = useUIStore((state) => state.focusMode);

  // `myos --capture` (e.g. from a Hyprland keybinding) opens Quick Capture here.
  useEffect(() => subscribe('capture:open', () => useUIStore.getState().openQuickCapture()), []);
  useArtifactSync();
  useUndoShortcuts();
  useGlobalShortcuts();
  useNavigationMemory();
  useDueReminder();

  return (
    <div className="flex h-full w-full bg-canvas text-text">
      {focusMode ? null : <Sidebar rail={collapsed || narrow} narrow={narrow} />}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <WindowStrip closable={!focusMode}>{focusMode ? <FocusExit /> : null}</WindowStrip>
        <main id="main-content-area" className="relative min-h-0 flex-1 overflow-hidden">
          {/* A page that fails shows its error in place; the sidebar keeps working. */}
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<LoadingState variant="spinner" className="h-full items-center" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcutsDialog />
      <KnowledgeLayer />
      <RitualHost />
      {isQuickCaptureOpen ? <QuickCapture /> : null}
    </div>
  );
}
