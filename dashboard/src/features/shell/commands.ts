import { Columns2, Crosshair, FilePlus, FolderOpen, FolderPlus, Keyboard, Maximize2, Moon, PanelLeft, PanelRight, Settings, Sun, SunMoon, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CommandSource } from '../../app/commands';
import { go, openNote, paths } from '../../app/navigation';
import { createNote, freeName } from '../../data/gateway';
import { chooseWorkspace } from '../../data/workspace';
import { updateSettings, useSettings } from '../../store/settings';
import { closeTabById, openOverlay, toggleSplit, useUIStore } from '../../store/ui';
import { toggleFocusMode } from './focus/FocusMode';
import { expandTo, parentOf, reloadForFolder, selectedFolder, selectRow, showColumn, startDraft, toggleColumn } from './layout';
import { SHORTCUTS } from './shortcuts';

/** ⌘⌥N: name a new note in the file list, in the selected folder; with the files hidden, make "Untitled" beside the note on screen. */
export function newNoteHere(): void {
  const { sidebar } = useSettings.getState();
  const { focusMode } = useUIStore.getState();
  if (!sidebar.left.collapsed && !focusMode) {
    startDraft(selectedFolder(), 'note');
    return;
  }
  const active = useUIStore.getState().tabs.find((tab) => tab.id === useUIStore.getState().current[useUIStore.getState().focusedGroup]);
  void createNote(freeName(active?.path ? parentOf(active.path) : '')).then(
    (note) => openNote(note.path, { pin: true }),
    (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not make a note'),
  );
}

export function closeActiveTab(): void {
  const { current, focusedGroup } = useUIStore.getState();
  const id = current[focusedGroup];
  if (id) closeTabById(id);
}

/** Show the file on screen in the file list. */
function revealInSidebar(path: string) {
  showColumn('left');
  expandTo(path);
  selectRow(path);
  setTimeout(() => document.querySelector<HTMLElement>('[role="tree"]')?.focus(), 50);
}

const THEMES = [
  { id: 'light', label: 'Use the light theme', icon: Sun },
  { id: 'dark', label: 'Use the dark theme', icon: Moon },
  { id: 'system', label: 'Match the system theme', icon: SunMoon },
] as const;

/** App-level commands: places, columns, tabs, theme, folder, focus, and help. */
export const shellCommands: CommandSource = ({ activePath }) => {
  const theme = useSettings.getState().theme;
  const split = useUIStore.getState().current[1] !== null;
  return [
    { id: 'shell.settings', group: 'Go to', label: 'Settings', icon: Settings, shortcut: SHORTCUTS.settings, keywords: 'preferences options', run: () => go(paths.settings, { pin: true }) },
    { id: 'shell.new-note-here', group: 'Note', label: 'New note in this folder', icon: FilePlus, shortcut: SHORTCUTS.newNote, keywords: 'create file', run: () => setTimeout(newNoteHere, 0) },
    { id: 'shell.new-folder', group: 'Note', label: 'New folder', icon: FolderPlus, keywords: 'create directory', run: () => setTimeout(() => startDraft(selectedFolder(), 'folder'), 0) },
    ...(activePath
      ? [{ id: 'shell.reveal', group: 'Note' as const, label: 'Show in the file list', icon: Crosshair, keywords: 'reveal locate sidebar tree', run: () => revealInSidebar(activePath) }]
      : []),
    { id: 'shell.split', group: 'App', label: split ? 'Close the split' : 'Split to the right', icon: Columns2, shortcut: SHORTCUTS.split, keywords: 'side by side two', run: toggleSplit },
    { id: 'shell.close-tab', group: 'App', label: 'Close tab', icon: X, shortcut: SHORTCUTS.closeTab, run: closeActiveTab },
    { id: 'shell.left', group: 'App', label: 'Show or hide the files', icon: PanelLeft, shortcut: SHORTCUTS.left, keywords: 'sidebar column tree', run: () => toggleColumn('left') },
    { id: 'shell.right', group: 'App', label: 'Show or hide the panel', icon: PanelRight, shortcut: SHORTCUTS.right, keywords: 'outline backlinks properties changes history', run: () => toggleColumn('right') },
    { id: 'shell.focus', group: 'App', label: 'Focus mode', icon: Maximize2, shortcut: SHORTCUTS.focus, keywords: 'distraction zen', run: toggleFocusMode },
    ...THEMES.filter((option) => option.id !== theme).map((option) => ({
      id: `shell.theme-${option.id}`,
      group: 'App' as const,
      label: option.label,
      icon: option.icon,
      keywords: 'theme dark light appearance',
      run: () => void updateSettings({ theme: option.id }),
    })),
    {
      id: 'shell.open-folder',
      group: 'App',
      label: 'Open another folder…',
      icon: FolderOpen,
      keywords: 'workspace vault switch',
      run: () => void chooseWorkspace().then((folder) => folder && reloadForFolder()),
    },
    // After the command bar closes, so the sheet is not closed along with it.
    { id: 'shell.shortcuts', group: 'App', label: 'Keyboard shortcuts', icon: Keyboard, shortcut: SHORTCUTS.help, keywords: 'keys help', run: () => setTimeout(() => openOverlay('shortcuts'), 0) },
  ];
};
