import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { notePathOf, openNote } from '../../app/navigation';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { useGitSync } from '../../data/git';
import { subscribe } from '../../data/ipc';
import { useFileSync } from '../../data/store';
import { useUndoShortcuts } from '../../data/undo';
import { useSettings } from '../../store/settings';
import { openOverlay, setActiveTab, useUIStore } from '../../store/ui';
import { LoadingState } from '../../ui';
import { QuickCapture } from '../capture/QuickCapture';
import { CommandPalette } from '../palette/CommandPalette';
import { FileSwitcher } from '../switcher/FileSwitcher';
import { FocusExit, useFocusMode } from './focus/FocusMode';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { RightPanel } from './RightPanel';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import { WindowStrip } from './WindowStrip';

/** The window: files on the left, the screen or note in the middle, a panel on the right, the status bar below. */
export function Shell() {
  const { pathname, search } = useLocation();
  const focusMode = useUIStore((state) => state.focusMode);
  const leftCollapsed = useSettings((state) => state.sidebar.left.collapsed);
  const rightCollapsed = useSettings((state) => state.sidebar.right.collapsed);

  useFileSync();
  useGitSync();
  useUndoShortcuts();
  useGlobalShortcuts();
  useFocusMode();
  // `myos-next --capture` and `myos-next open <path>` arrive here.
  useEffect(() => subscribe('app:capture', () => openOverlay('capture')), []);
  useEffect(() => subscribe('app:open-file', ({ path }) => openNote(path)), []);
  // Only the note route shows a tab; every other screen leaves the tabs as they are.
  useEffect(() => {
    if (!notePathOf(pathname, search)) setActiveTab(null);
  }, [pathname, search]);

  return (
    <div className="flex h-full w-full bg-canvas text-text">
      {focusMode || leftCollapsed ? null : <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <WindowStrip closable={!focusMode}>{focusMode ? <FocusExit /> : null}</WindowStrip>
        <main id="main-content-area" className="relative min-h-0 flex-1 overflow-hidden">
          {/* A screen that fails shows its error in place; the sidebar keeps working. */}
          <ErrorBoundary resetKey={pathname + search}>
            <Suspense fallback={<LoadingState variant="spinner" className="h-full items-center" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        {focusMode ? null : <StatusBar />}
      </div>
      {focusMode || rightCollapsed ? null : <RightPanel />}
      <CommandPalette />
      <FileSwitcher />
      <QuickCapture />
      <KeyboardShortcutsDialog />
    </div>
  );
}
