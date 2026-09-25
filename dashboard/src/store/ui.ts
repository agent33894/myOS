import { create } from 'zustand';
import type { PanelId } from '../app/panels';
import { notePathOf, paths, toNoteUrl } from '../app/navigation';
import { useSettings } from './settings';

export type TabMode = 'rendered' | 'source';

/** The editor area has one group of tabs, or two side by side (⌘\). 0 is the left one. */
export type GroupId = 0 | 1;

/** One open tab: a note, or Today, Tasks, a view, or Settings. */
export interface Tab {
  /** Stable for the tab's life; the tab bar and drag and drop use it. */
  id: string;
  /** The app URL the tab shows (see app/navigation.ts). */
  url: string;
  /** The note path for a note tab; null for Today, Tasks, views, and Settings. */
  path: string | null;
  mode: TabMode;
  group: GroupId;
  /**
   * A preview tab is replaced by the next thing opened in its group. Typing in
   * it, double-clicking it, or opening it deliberately (⌘P) keeps it.
   */
  preview: boolean;
}

type Overlay = 'palette' | 'switcher' | 'capture' | 'shortcuts';

interface UIState {
  /** Every tab, in display order; each group shows the ones with its `group`. */
  tabs: Tab[];
  /** The tab on screen in each group, by id. */
  current: [string | null, string | null];
  /** The group the keyboard works in; its tab is the app's location. */
  focusedGroup: GroupId;
  /** Index in `tabs` of the focused group's tab on screen, or null. Derived. */
  activeTab: number | null;
  /** Index in `tabs` of the tab shown in the other group (the split), or null. Derived. */
  split: number | null;
  /** One overlay at a time: the command bar, file switcher, quick capture, or shortcuts sheet. */
  overlay: Overlay | null;
  /** Focus mode (⌘.): no side columns or chrome, just the text. */
  focusMode: boolean;
  rightPanel: PanelId;
}

type Layout = Pick<UIState, 'tabs' | 'current' | 'focusedGroup'>;

function derive({ tabs, current, focusedGroup }: Layout): Pick<UIState, 'activeTab' | 'split'> {
  const at = (id: string | null) => (id === null ? null : tabs.findIndex((tab) => tab.id === id));
  const active = at(current[focusedGroup]);
  const other = at(current[focusedGroup === 0 ? 1 : 0]);
  return { activeTab: active === -1 ? null : active, split: other === -1 ? null : other };
}

export const useUIStore = create<UIState>(() => ({
  tabs: [],
  current: [null, null],
  focusedGroup: 0,
  activeTab: null,
  split: null,
  overlay: null,
  focusMode: false,
  rightPanel: 'outline',
}));

/** Change the tabs; keeps groups tidy (the left group is never empty while the right has tabs) and the derived indexes current. */
function setLayout(change: (state: UIState) => Partial<Layout> | null): void {
  useUIStore.setState((state) => {
    const patch = change(state);
    if (!patch) return state;
    let next: Layout = { tabs: patch.tabs ?? state.tabs, current: patch.current ?? state.current, focusedGroup: patch.focusedGroup ?? state.focusedGroup };
    const inGroup = (group: GroupId) => next.tabs.filter((tab) => tab.group === group);
    // The right group emptied: the split ends. The left one emptied: the right one takes its place.
    if (inGroup(1).length && !inGroup(0).length) {
      next = { tabs: next.tabs.map((tab) => ({ ...tab, group: 0 })), current: [next.current[1], null], focusedGroup: 0 };
    }
    const current = next.current.map((id, group) => {
      const tabs = inGroup(group as GroupId);
      return tabs.some((tab) => tab.id === id) ? id : (tabs[tabs.length - 1]?.id ?? null);
    }) as [string | null, string | null];
    const focusedGroup = current[1] === null ? 0 : next.focusedGroup;
    next = { ...next, current, focusedGroup };
    return { ...next, ...derive(next) };
  });
}

let counter = 0;
const newId = () => `tab-${Date.now().toString(36)}-${(counter += 1)}`;

/** Two URLs that show the same thing share a key: a note by its path, Tasks whatever its query. */
export function tabKey(url: string): string {
  const [pathname, search = ''] = url.split('?');
  if (pathname === paths.note) return `note:${new URLSearchParams(search).get('path') ?? ''}`;
  return pathname;
}

const pathOfUrl = (url: string) => {
  const [pathname, search = ''] = url.split('?');
  return notePathOf(pathname, search ? `?${search}` : '');
};

export interface OpenOptions {
  /** The group to open in; the focused one by default. */
  group?: GroupId;
  /** Keep the tab (no preview). */
  pin?: boolean;
}

/**
 * Show `url` in a group: its tab when it is already open there, else in place
 * of the group's preview tab, else in a new tab after the current one.
 * Everything that opens something (links, the sidebar, ⌘P, the router) comes here.
 */
export function openUrl(url: string, { group, pin = false }: OpenOptions = {}): void {
  setLayout(({ tabs, current, focusedGroup }) => {
    const target = group ?? focusedGroup;
    const key = tabKey(url);
    const focus = (id: string) => {
      const next: [string | null, string | null] = [...current];
      next[target] = id;
      return next;
    };
    const existing = tabs.find((tab) => tab.group === target && tabKey(tab.url) === key);
    if (existing) {
      if (existing.url === url && current[target] === existing.id && focusedGroup === target && (!pin || !existing.preview)) return null;
      return {
        tabs: tabs.map((tab) => (tab === existing ? { ...tab, url, preview: tab.preview && !pin } : tab)),
        current: focus(existing.id),
        focusedGroup: target,
      };
    }
    const path = pathOfUrl(url);
    const tab: Tab = { id: newId(), url, path, mode: useSettings.getState().editorMode, group: target, preview: !pin };
    const shown = tabs.findIndex((entry) => entry.id === current[target]);
    let next: Tab[];
    if (shown >= 0 && tabs[shown].preview) {
      next = tabs.map((entry, index) => (index === shown ? tab : entry));
    } else {
      const lastInGroup = tabs.reduce((last, entry, index) => (entry.group === target ? index : last), -1);
      const at = (shown >= 0 ? shown : lastInGroup) + 1;
      next = at > 0 ? [...tabs.slice(0, at), tab, ...tabs.slice(at)] : [...tabs, tab];
    }
    return { tabs: next, current: focus(tab.id), focusedGroup: target };
  });
}

/** @public Show a note in its tab (opening one when it isn't open). */
export const showTab = (path: string) => openUrl(toNoteUrl(path));

/** Bring a tab forward in its group and give that group the keyboard. */
export function activateTab(id: string): void {
  setLayout(({ tabs, current }) => {
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab) return null;
    const next: [string | null, string | null] = [...current];
    next[tab.group] = id;
    return { current: next, focusedGroup: tab.group };
  });
}

/** @public Show the tab at `index` (the old index-based form of `activateTab`). */
export function setActiveTab(index: number | null): void {
  const tab = index === null ? undefined : useUIStore.getState().tabs[index];
  if (tab) activateTab(tab.id);
}

/** Keep a preview tab. */
export function pinTab(id: string): void {
  setLayout(({ tabs }) => (tabs.some((tab) => tab.id === id && tab.preview) ? { tabs: tabs.map((tab) => (tab.id === id ? { ...tab, preview: false } : tab)) } : null));
}

export function closeTabById(id: string): void {
  setLayout(({ tabs, current }) => {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return null;
    const closing = tabs[index];
    const next = tabs.filter((tab) => tab.id !== id);
    const nextCurrent: [string | null, string | null] = [...current];
    if (current[closing.group] === id) {
      // The neighbor to the right in the same group, else the one to the left.
      const after = next.slice(index).find((tab) => tab.group === closing.group);
      const before = next.slice(0, index).reverse().find((tab) => tab.group === closing.group);
      nextCurrent[closing.group] = (after ?? before)?.id ?? null;
    }
    return { tabs: next, current: nextCurrent };
  });
}

/** @public Close the tab at `index`. */
export function closeTab(index: number): void {
  const tab = useUIStore.getState().tabs[index];
  if (tab) closeTabById(tab.id);
}

/** Close every tab showing `path`, or a file inside the folder `path`. */
export function closeTabsUnder(path: string): void {
  for (const tab of useUIStore.getState().tabs) {
    if (tab.path === path || tab.path?.startsWith(`${path}/`)) closeTabById(tab.id);
  }
}

export const setTabMode = (index: number, mode: TabMode) =>
  setLayout(({ tabs }) => ({ tabs: tabs.map((tab, at) => (at === index ? { ...tab, mode, preview: false } : tab)) }));

/**
 * Move a tab to a place in a group: before the tab `beforeId`, or at the end.
 * Moving it to the other group opens or joins the split.
 */
export function moveTab(id: string, group: GroupId, beforeId: string | null): void {
  setLayout(({ tabs, current }) => {
    const moving = tabs.find((tab) => tab.id === id);
    if (!moving || moving.id === beforeId) return null;
    // The same note already open in the target group: keep that one.
    const twin = moving.group !== group ? tabs.find((tab) => tab.group === group && tabKey(tab.url) === tabKey(moving.url)) : undefined;
    let rest = tabs.filter((tab) => tab.id !== id && tab !== twin);
    const nextCurrent: [string | null, string | null] = [...current];
    if (moving.group !== group && current[moving.group] === id) {
      const index = tabs.indexOf(moving);
      const after = tabs.slice(index + 1).find((tab) => tab.group === moving.group);
      const before = tabs.slice(0, index).reverse().find((tab) => tab.group === moving.group);
      nextCurrent[moving.group] = (after ?? before)?.id ?? null;
    }
    const moved = { ...moving, group, preview: false };
    const at = beforeId ? rest.findIndex((tab) => tab.id === beforeId) : -1;
    if (at >= 0) rest = [...rest.slice(0, at), moved, ...rest.slice(at)];
    else {
      const last = rest.reduce((found, tab, index) => (tab.group === group ? index : found), -1);
      rest = last >= 0 ? [...rest.slice(0, last + 1), moved, ...rest.slice(last + 1)] : [...rest, moved];
    }
    nextCurrent[group] = id;
    return { tabs: rest, current: nextCurrent, focusedGroup: group };
  });
}

/** ⌘\: show the current tab in a second group on the right; with a split already open, fold it back into one group. */
export function toggleSplit(): void {
  const { tabs, current, focusedGroup } = useUIStore.getState();
  if (current[1] !== null) {
    setLayout(({ tabs: all }) => {
      const keys = new Set(all.filter((tab) => tab.group === 0).map((tab) => tabKey(tab.url)));
      return { tabs: all.filter((tab) => tab.group === 0 || !keys.has(tabKey(tab.url))).map((tab) => ({ ...tab, group: 0 })), focusedGroup: 0 };
    });
    return;
  }
  const shown = tabs.find((tab) => tab.id === current[focusedGroup]);
  if (shown) openUrl(shown.url, { group: 1, pin: true });
}

/** @public The old form: null folds the split, an index shows that tab on the right. */
export function setSplit(split: number | null): void {
  const { tabs, current } = useUIStore.getState();
  if (split === null) {
    if (current[1] !== null) toggleSplit();
    return;
  }
  const tab = tabs[split];
  if (tab) openUrl(tab.url, { group: 1, pin: true });
}

export function focusGroup(group: GroupId): void {
  setLayout(({ current, focusedGroup }) => (group === focusedGroup || current[group] === null ? null : { focusedGroup: group }));
}

/** A file or folder moved: tabs showing it (or anything inside it) follow. */
export function followMove(from: string, to: string): void {
  const moved = (path: string) => (path === from ? to : path.startsWith(`${from}/`) ? to + path.slice(from.length) : path);
  setLayout(({ tabs }) => ({
    tabs: tabs.map((tab) => {
      if (!tab.path) return tab;
      const path = moved(tab.path);
      return path === tab.path ? tab : { ...tab, path, url: toNoteUrl(path) };
    }),
  }));
}

/** Put back tabs saved from an earlier session (see uiSession.ts). */
export function restoreTabs(saved: { tabs: Omit<Tab, 'id' | 'path' | 'preview'>[]; current: [number | null, number | null]; focusedGroup: GroupId }): void {
  const tabs = saved.tabs.map((tab) => ({ ...tab, id: newId(), path: pathOfUrl(tab.url), preview: false }));
  const idAt = (index: number | null) => (index === null ? null : (tabs[index]?.id ?? null));
  setLayout(() => ({ tabs, current: [idAt(saved.current[0]), idAt(saved.current[1])], focusedGroup: saved.focusedGroup }));
}

export const openOverlay = (overlay: Overlay) => useUIStore.setState({ overlay });
export const closeOverlay = () => useUIStore.setState({ overlay: null });
export const toggleOverlay = (overlay: Overlay) => useUIStore.setState((state) => ({ overlay: state.overlay === overlay ? null : overlay }));

export const setFocusMode = (focusMode: boolean) => useUIStore.setState({ focusMode });
export const setRightPanel = (rightPanel: PanelId) => useUIStore.setState({ rightPanel });

/** The focused group's tab on screen. */
export const activeTabOf = ({ tabs, current, focusedGroup }: Pick<UIState, 'tabs' | 'current' | 'focusedGroup'>) =>
  tabs.find((tab) => tab.id === current[focusedGroup]) ?? null;

/** The path of the note on screen in the focused group, or null. */
export const activePathOf = (state: Pick<UIState, 'tabs' | 'current' | 'focusedGroup'>) => activeTabOf(state)?.path ?? null;
export const useActivePath = () => useUIStore(activePathOf);
