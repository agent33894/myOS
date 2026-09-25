import { FolderOpen, Keyboard, Maximize2, PanelLeft, PanelRight, Settings, SunMoon } from 'lucide-react';
import { toast } from 'sonner';
import type { CommandSource } from '../../app/commands';
import { go, paths } from '../../app/navigation';
import { chooseWorkspace } from '../../data/workspace';
import { updateSettings, useSettings } from '../../store/settings';
import { openOverlay } from '../../store/ui';
import { toggleFocusMode } from './focus/FocusMode';
import { SHORTCUTS } from './shortcuts';

const NEXT_THEME = { system: 'light', light: 'dark', dark: 'system' } as const;
const THEME_NAMES = { system: 'Match system', light: 'Light', dark: 'Dark' } as const;

function cycleTheme() {
  const next = NEXT_THEME[useSettings.getState().theme];
  void updateSettings({ theme: next });
  toast(`Theme: ${THEME_NAMES[next]}`);
}

function toggleColumn(side: 'left' | 'right') {
  const { sidebar } = useSettings.getState();
  void updateSettings({ sidebar: { ...sidebar, [side]: { ...sidebar[side], collapsed: !sidebar[side].collapsed } } });
}

/** App-level commands: settings, theme, folder, focus, and help. */
export const shellCommands: CommandSource = () => [
  { id: 'shell.settings', group: 'Go to', label: 'Settings', icon: Settings, shortcut: SHORTCUTS.settings, keywords: 'preferences options', run: () => go(paths.settings) },
  {
    id: 'shell.open-folder',
    group: 'App',
    label: 'Open another folder…',
    icon: FolderOpen,
    keywords: 'workspace vault switch',
    run: () => void chooseWorkspace().then((folder) => folder && window.location.reload()),
  },
  { id: 'shell.left', group: 'App', label: 'Show or hide the files', icon: PanelLeft, keywords: 'sidebar column', run: () => toggleColumn('left') },
  { id: 'shell.right', group: 'App', label: 'Show or hide the panel', icon: PanelRight, keywords: 'outline backlinks properties changes history', run: () => toggleColumn('right') },
  { id: 'shell.theme', group: 'App', label: 'Change theme', icon: SunMoon, keywords: 'dark light appearance', run: cycleTheme },
  { id: 'shell.focus', group: 'App', label: 'Focus mode', icon: Maximize2, shortcut: SHORTCUTS.focus, keywords: 'distraction zen', run: toggleFocusMode },
  // After the command bar closes, so the sheet is not closed along with it.
  { id: 'shell.shortcuts', group: 'App', label: 'Keyboard shortcuts', icon: Keyboard, shortcut: SHORTCUTS.help, keywords: 'keys help', run: () => setTimeout(() => openOverlay('shortcuts'), 0) },
];
