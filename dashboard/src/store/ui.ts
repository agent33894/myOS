import { create } from 'zustand';
import type { PanelId } from '../app/panels';
import { useSettings } from './settings';

export type TabMode = 'rendered' | 'source';

/** An open note. Tabs are this session's; they are not saved. */
export interface Tab {
  path: string;
  mode: TabMode;
}

type Overlay = 'palette' | 'switcher' | 'capture' | 'shortcuts';

interface UIState {
  tabs: Tab[];
  /** The tab on screen, or null while Today, Tasks, a view, or Settings is shown. */
  activeTab: number | null;
  /** The tab shown beside the active one (⌘\), or null. */
  split: number | null;
  /** One overlay at a time: the command bar, file switcher, quick capture, or shortcuts sheet. */
  overlay: Overlay | null;
  /** Focus mode (⌘.): no side columns or chrome, just the text. */
  focusMode: boolean;
  rightPanel: PanelId;
}

export const useUIStore = create<UIState>(() => ({
  tabs: [],
  activeTab: null,
  split: null,
  overlay: null,
  focusMode: false,
  rightPanel: 'outline',
}));

/** Show `path` in its tab, opening one (in the default mode) when it isn't open. */
export function showTab(path: string): void {
  useUIStore.setState(({ tabs }) => {
    const index = tabs.findIndex((tab) => tab.path === path);
    if (index >= 0) return { activeTab: index };
    return { tabs: [...tabs, { path, mode: useSettings.getState().editorMode }], activeTab: tabs.length };
  });
}

/** @public */
export function closeTab(index: number): void {
  useUIStore.setState(({ tabs, activeTab, split }) => {
    const shift = (at: number | null) => (at === null || at === index ? null : at > index ? at - 1 : at);
    const next = tabs.filter((_, at) => at !== index);
    const active = activeTab === index ? (next.length ? Math.min(index, next.length - 1) : null) : shift(activeTab);
    return { tabs: next, activeTab: active, split: shift(split) };
  });
}

export const setActiveTab = (activeTab: number | null) => useUIStore.setState({ activeTab });

export const setTabMode = (index: number, mode: TabMode) =>
  useUIStore.setState(({ tabs }) => ({ tabs: tabs.map((tab, at) => (at === index ? { ...tab, mode } : tab)) }));

export const setSplit = (split: number | null) => useUIStore.setState({ split });

/** A file or folder moved: tabs showing it (or anything inside it) follow. */
export function followMove(from: string, to: string): void {
  const moved = (path: string) => (path === from ? to : path.startsWith(`${from}/`) ? to + path.slice(from.length) : path);
  useUIStore.setState(({ tabs }) => ({ tabs: tabs.map((tab) => ({ ...tab, path: moved(tab.path) })) }));
}

export const openOverlay = (overlay: Overlay) => useUIStore.setState({ overlay });
export const closeOverlay = () => useUIStore.setState({ overlay: null });
export const toggleOverlay = (overlay: Overlay) => useUIStore.setState((state) => ({ overlay: state.overlay === overlay ? null : overlay }));

export const setFocusMode = (focusMode: boolean) => useUIStore.setState({ focusMode });
export const setRightPanel = (rightPanel: PanelId) => useUIStore.setState({ rightPanel });

/** The path of the note on screen, or null. */
export const activePathOf = ({ tabs, activeTab }: Pick<UIState, 'tabs' | 'activeTab'>) => (activeTab === null ? null : tabs[activeTab]?.path ?? null);
export const useActivePath = () => useUIStore(activePathOf);
