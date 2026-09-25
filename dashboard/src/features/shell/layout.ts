import { create } from 'zustand';
import type { ColumnPrefs } from '@shared/settings';
import { useDataStore } from '../../data/store';
import { updateSettings, useSettings } from '../../store/settings';
import { readExpanded, writeExpanded } from '../../store/uiSession';

export type Side = 'left' | 'right';

/** Fold or unfold a side column (⌘B, ⌘⌥B). */
export function toggleColumn(side: Side): void {
  const { sidebar } = useSettings.getState();
  void updateSettings({ sidebar: { ...sidebar, [side]: { ...sidebar[side], collapsed: !sidebar[side].collapsed } } });
}

export function showColumn(side: Side): void {
  const { sidebar } = useSettings.getState();
  if (sidebar[side].collapsed) void updateSettings({ sidebar: { ...sidebar, [side]: { ...sidebar[side], collapsed: false } } });
}

export function saveColumn(side: Side, prefs: Partial<ColumnPrefs>): void {
  const { sidebar } = useSettings.getState();
  void updateSettings({ sidebar: { ...sidebar, [side]: { ...sidebar[side], ...prefs } } });
}

/** A row being made in the file tree: a note or a folder inside `parent` ('' is the top). */
export interface Draft {
  parent: string;
  kind: 'note' | 'folder';
}

interface TreeState {
  /** The open folder's absolute path. */
  folder: string;
  expanded: Set<string>;
  /** The row the keyboard is on (a file or folder path). */
  selected: string | null;
  renaming: string | null;
  draft: Draft | null;
}

/** File tree state the shell and its commands share. Expanded folders are remembered per folder. */
export const useTreeStore = create<TreeState>(() => ({ folder: '', expanded: new Set(), selected: null, renaming: null, draft: null }));

export function loadTree(folder: string): void {
  useTreeStore.setState({ folder, expanded: new Set(readExpanded(folder)), selected: null, renaming: null, draft: null });
}

function setExpanded(expanded: Set<string>): void {
  useTreeStore.setState({ expanded });
  writeExpanded(useTreeStore.getState().folder, expanded);
}

export function toggleFolder(path: string, open?: boolean): void {
  const expanded = new Set(useTreeStore.getState().expanded);
  const next = open ?? !expanded.has(path);
  if (next === expanded.has(path)) return;
  if (next) expanded.add(path);
  else expanded.delete(path);
  setExpanded(expanded);
}

/** Open every folder above `path`, so its row can be seen. */
export function expandTo(path: string): void {
  const { expanded } = useTreeStore.getState();
  const parts = path.split('/').slice(0, -1);
  const parents = parts.map((_, index) => parts.slice(0, index + 1).join('/'));
  if (parents.every((parent) => expanded.has(parent))) return;
  setExpanded(new Set([...expanded, ...parents]));
}

export const selectRow = (selected: string | null) => useTreeStore.setState({ selected });

/** Start typing a new note or folder name inside `parent`. */
export function startDraft(parent: string, kind: Draft['kind']): void {
  if (parent) expandTo(`${parent}/x`);
  useTreeStore.setState({ draft: { parent, kind }, renaming: null });
  showColumn('left');
}

export const endDraft = () => useTreeStore.setState({ draft: null });
export const startRename = (path: string) => useTreeStore.setState({ renaming: path, draft: null, selected: path });
export const endRename = () => useTreeStore.setState({ renaming: null });

export const parentOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const joinPath = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

/** Where a new note or folder goes: the selected folder, or the selected file's folder. */
export function selectedFolder(): string {
  const { selected } = useTreeStore.getState();
  if (!selected) return '';
  return useDataStore.getState().folders.includes(selected) ? selected : parentOf(selected);
}

/** Another folder was opened: start the window over, on that folder's own tabs. */
export function reloadForFolder(): void {
  window.location.hash = '';
  window.location.reload();
}

/** Drag and drop payloads: a tab (its id) and a file tree row (`{ path, kind }`). */
export const TAB_TYPE = 'application/x-myos-tab';
export const FILE_TYPE = 'application/x-myos-path';
