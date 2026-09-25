import { Suspense, useState, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Command, FileSearch, PanelLeft, PanelRight, X } from 'lucide-react';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { NotFound } from '../../app/NotFound';
import { APP_ROUTES } from '../../app/routes';
import { invoke } from '../../data/ipc';
import { isLinux } from '../../lib/platform';
import { useSettings } from '../../store/settings';
import { focusGroup, openOverlay, pinTab, useUIStore, type GroupId, type Tab } from '../../store/ui';
import { Button, IconButton, Kbd, LoadingState, cn } from '../../ui';
import { FocusExit } from './focus/FocusMode';
import { toggleColumn } from './layout';
import { SHORTCUTS } from './shortcuts';
import { ShownTab } from './shownTab';
import { acceptDrop, isTabOrFileDrag, TabBar } from './TabBar';

/** Nothing open in the window: say how to open something. */
function NothingOpen() {
  return (
    <div className="grid h-full place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-md text-text-secondary">Nothing is open.</p>
        <div className="flex flex-col gap-2">
          <Button variant="ghost" leadingIcon={FileSearch} onClick={() => openOverlay('switcher')} className="justify-between gap-6">
            Open a file
            <Kbd shortcut={SHORTCUTS.switcher} />
          </Button>
          <Button variant="ghost" leadingIcon={Command} onClick={() => openOverlay('palette')} className="justify-between gap-6">
            Run a command
            <Kbd shortcut={SHORTCUTS.palette} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One tab's screen, routed from its own URL so two groups can show two things. */
function TabScreen({ tab }: { tab: Tab }) {
  return (
    <ShownTab.Provider value={tab}>
      {/* A screen that fails shows its error in place; the rest of the window keeps working. */}
      <ErrorBoundary resetKey={tab.url}>
        <Suspense fallback={<LoadingState variant="spinner" className="h-full items-center" />}>
          <Routes location={tab.url}>
            {APP_ROUTES.map(({ path, component: Screen }) => (
              <Route key={path} path={path} element={<Screen />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </ShownTab.Provider>
  );
}

function Group({ group, leading, trailing }: { group: GroupId; leading?: ReactNode; trailing?: ReactNode }) {
  const tab = useUIStore((state) => state.tabs.find((entry) => entry.id === state.current[group]) ?? null);
  const focusMode = useUIStore((state) => state.focusMode);
  return (
    <section
      aria-label={group === 0 ? 'Editor' : 'Editor on the right'}
      className="flex min-w-0 flex-1 flex-col"
      onPointerDownCapture={() => focusGroup(group)}
      onFocusCapture={() => focusGroup(group)}
      // Typing in a preview tab keeps it.
      onInputCapture={() => tab?.preview && pinTab(tab.id)}
    >
      {focusMode ? <div className="window-drag-region flex h-11 shrink-0 items-center px-2">{trailing ? <FocusExit /> : null}</div> : <TabBar group={group} leading={leading} trailing={trailing} />}
      <div className="relative min-h-0 flex-1">{tab ? <TabScreen key={tab.id} tab={tab} /> : <NothingOpen />}</div>
    </section>
  );
}

/** The middle of the window: one group of tabs, or two side by side. Drop a tab or file on the right edge to split. */
export function EditorArea() {
  const split = useUIStore((state) => state.current[1] !== null);
  const leftCollapsed = useSettings((state) => state.sidebar.left.collapsed);
  const rightCollapsed = useSettings((state) => state.sidebar.right.collapsed);
  const [splitHint, setSplitHint] = useState(false);

  const showFiles = leftCollapsed ? (
    <IconButton icon={PanelLeft} label="Show the files" shortcut={SHORTCUTS.left} size="sm" className="no-drag" onClick={() => toggleColumn('left')} />
  ) : null;
  const edge = (
    <>
      <IconButton
        icon={PanelRight}
        label={rightCollapsed ? 'Show the panel' : 'Hide the panel'}
        shortcut={SHORTCUTS.right}
        size="sm"
        className={cn('no-drag', !rightCollapsed && 'text-text')}
        onClick={() => toggleColumn('right')}
      />
      {isLinux && rightCollapsed ? <IconButton icon={X} label="Close window" size="sm" className="no-drag" onClick={() => void invoke('window:close')} /> : null}
    </>
  );

  return (
    <div
      className="relative flex h-full min-w-0 gap-2"
      onDragOver={(event) => {
        if (split || !isTabOrFileDrag(event)) return;
        const box = event.currentTarget.getBoundingClientRect();
        const near = event.clientX > box.left + box.width * 0.65 && event.clientY > box.top + 48;
        setSplitHint(near);
        if (near) event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSplitHint(false);
      }}
      onDrop={(event) => {
        if (!splitHint) return;
        setSplitHint(false);
        if (acceptDrop(event, 1, null)) event.preventDefault();
      }}
    >
      <Group group={0} leading={showFiles} trailing={split ? undefined : edge} />
      {split ? <Group group={1} trailing={edge} /> : null}
      {splitHint ? (
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 top-12 grid w-1/3 place-items-center rounded-xl bg-accent-soft text-sm font-medium text-accent-text animate-fade-in">
          Open to the side
        </div>
      ) : null}
    </div>
  );
}
