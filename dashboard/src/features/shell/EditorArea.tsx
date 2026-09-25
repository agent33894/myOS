import { Suspense, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Command, FileSearch, PanelLeft, PanelRight, X } from 'lucide-react';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { NotFound } from '../../app/NotFound';
import { APP_ROUTES } from '../../app/routes';
import { invoke } from '../../data/ipc';
import { isLinux } from '../../lib/platform';
import { useSettings } from '../../store/settings';
import { focusGroup, openOverlay, pinTab, useUIStore, type GroupId, type Tab } from '../../store/ui';
import { readSplitRatio, writeSplitRatio } from '../../store/uiSession';
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

function Group({ group, leading, trailing, style }: { group: GroupId; leading?: ReactNode; trailing?: ReactNode; style?: CSSProperties }) {
  const tab = useUIStore((state) => state.tabs.find((entry) => entry.id === state.current[group]) ?? null);
  const focusMode = useUIStore((state) => state.focusMode);
  return (
    <section
      aria-label={group === 0 ? 'Editor' : 'Editor on the right'}
      className="flex min-w-0 flex-1 flex-col"
      style={style}
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

const RATIO_MIN = 0.3;
const RATIO_MAX = 0.7;
const clampRatio = (ratio: number) => Math.min(RATIO_MAX, Math.max(RATIO_MIN, ratio));

/** Between the two groups: drag or use the arrow keys to share the width; double-click to even it out. The ratio is remembered. */
function SplitDivider({ ratio, onChange }: { ratio: number; onChange: (ratio: number, keep: boolean) => void }) {
  const dragging = useRef<DOMRect | null>(null);
  const at = (event: PointerEvent) => {
    const box = dragging.current!;
    return clampRatio((event.clientX - box.left) / box.width);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the two sides"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={RATIO_MIN * 100}
      aria-valuemax={RATIO_MAX * 100}
      tabIndex={0}
      onPointerDown={(event) => {
        const area = event.currentTarget.parentElement;
        if (!area) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = area.getBoundingClientRect();
        document.documentElement.dataset.resizing = '';
      }}
      onPointerMove={(event) => {
        if (dragging.current) onChange(at(event), false);
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        const next = at(event);
        dragging.current = null;
        delete document.documentElement.dataset.resizing;
        onChange(next, true);
      }}
      onDoubleClick={() => onChange(0.5, true)}
      onKeyDown={(event: KeyboardEvent) => {
        const step = { ArrowLeft: -0.05, ArrowRight: 0.05 }[event.key];
        if (!step) return;
        event.preventDefault();
        onChange(clampRatio(ratio + step), true);
      }}
      className="group relative z-10 -mx-2 w-2 shrink-0 cursor-col-resize outline-none"
    >
      <span className="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-transparent transition-colors duration-fast group-hover:bg-border-strong group-focus-visible:bg-focus group-active:bg-accent" />
    </div>
  );
}

/** The middle of the window: one group of tabs, or two side by side. Drop a tab or file on the right edge to split. */
export function EditorArea() {
  const split = useUIStore((state) => state.current[1] !== null);
  const leftCollapsed = useSettings((state) => state.sidebar.left.collapsed);
  const rightCollapsed = useSettings((state) => state.sidebar.right.collapsed);
  const [splitHint, setSplitHint] = useState(false);
  const [ratio, setRatio] = useState(readSplitRatio);
  const resize = (next: number, keep: boolean) => {
    setRatio(next);
    if (keep) writeSplitRatio(next);
  };

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
      <Group group={0} leading={showFiles} trailing={split ? undefined : edge} style={split ? { flexGrow: ratio, flexBasis: 0 } : undefined} />
      {split ? <SplitDivider ratio={ratio} onChange={resize} /> : null}
      {split ? <Group group={1} trailing={edge} style={{ flexGrow: 1 - ratio, flexBasis: 0 }} /> : null}
      {splitHint ? (
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 top-12 grid w-1/3 place-items-center rounded-xl bg-accent-soft text-sm font-medium text-accent-text animate-fade-in">
          Open to the side
        </div>
      ) : null}
    </div>
  );
}
