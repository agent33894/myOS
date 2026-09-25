import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { openNote, paths } from '../../app/navigation';
import { useGitSync } from '../../data/git';
import { subscribe } from '../../data/ipc';
import { useFileSync } from '../../data/store';
import { useUndoShortcuts } from '../../data/undo';
import { useSettings } from '../../store/settings';
import { activeTabOf, openOverlay, openUrl, useUIStore } from '../../store/ui';
import { keepTabSession } from '../../store/uiSession';
import { QuickCapture } from '../capture/QuickCapture';
import { CommandPalette } from '../palette/CommandPalette';
import { FileSwitcher } from '../switcher/FileSwitcher';
import { EditorArea } from './EditorArea';
import { useFocusMode } from './focus/FocusMode';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { loadTree, saveColumn, type Side } from './layout';
import { ResizeHandle } from './ResizeHandle';
import { RightPanel } from './RightPanel';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useGlobalShortcuts } from './useGlobalShortcuts';

/**
 * The hash router's location is the focused tab's URL. A new location (a
 * link, back and forward) opens in a tab; a tab brought forward moves the
 * location to it.
 */
function useLocationFollowsTabs(): void {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const url = pathname + search;
  const activeUrl = useUIStore((state) => activeTabOf(state)?.url ?? null);

  useEffect(() => {
    if (url === '/') navigate(activeTabOf(useUIStore.getState())?.url ?? paths.today, { replace: true });
    else openUrl(url);
  }, [url]);

  useEffect(() => {
    if (activeUrl && activeUrl !== url) navigate(activeUrl, { replace: true });
  }, [activeUrl]);
}

/** A side column's width: live while dragging its edge, saved on release. */
function useColumn(side: Side) {
  const prefs = useSettings((state) => state.sidebar[side]);
  const [dragging, setDragging] = useState<number | null>(null);
  return {
    open: !prefs.collapsed,
    width: dragging ?? prefs.width,
    onResize: setDragging,
    onCommit: (width: number, fold: boolean) => {
      setDragging(null);
      saveColumn(side, fold ? { collapsed: true } : { width });
    },
  };
}

/** The window: files on the left, tabs and the note in the middle, a panel on the right, the status bar below. */
export function Shell({ folder }: { folder: string }) {
  const focusMode = useUIStore((state) => state.focusMode);
  const left = useColumn('left');
  const right = useColumn('right');

  // Before anything reads the location: this folder's tabs and file list state.
  useLayoutEffect(() => {
    loadTree(folder);
    return keepTabSession(folder);
  }, [folder]);
  useLocationFollowsTabs();
  useFileSync();
  useGitSync();
  useUndoShortcuts();
  useGlobalShortcuts();
  useFocusMode();
  // `myos-next --capture` and `myos-next open <path>` arrive here.
  useEffect(() => subscribe('app:capture', () => openOverlay('capture')), []);
  useEffect(() => subscribe('app:open-file', ({ path }) => openNote(path, { pin: true })), []);

  return (
    <div className="flex h-full w-full flex-col bg-canvas text-text">
      <div className="flex min-h-0 flex-1">
        {left.open && !focusMode ? (
          <>
            <Sidebar width={left.width} />
            <ResizeHandle side="left" width={left.width} onResize={left.onResize} onCommit={left.onCommit} />
          </>
        ) : null}
        <main id="main-content-area" className="min-w-0 flex-1">
          <EditorArea />
        </main>
        {right.open && !focusMode ? (
          <>
            <ResizeHandle side="right" width={right.width} onResize={right.onResize} onCommit={right.onCommit} />
            <RightPanel width={right.width} />
          </>
        ) : null}
      </div>
      {focusMode ? <div className="h-6 shrink-0" /> : <StatusBar />}
      <CommandPalette />
      <FileSwitcher />
      <QuickCapture />
      <KeyboardShortcutsDialog />
    </div>
  );
}
