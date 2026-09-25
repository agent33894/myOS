import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, FilePlus, FolderPlus, Keyboard, ListChecks, Palette, SunMoon } from 'lucide-react';
import { toInboxSortUrl, toSettingsUrl } from '../../app/navigation';
import { sections, settingsRoute } from '../../app/routes';
import { useSettingsStore } from '../../store/settings';
import type { ThemeMode } from '../../store/settingsPersistence';
import { useUIStore } from '../../store/ui';
import { sectionUrl } from '../shell/navigationMemory';
import { SHORTCUTS } from '../shell/shortcuts';
import { useFileCommands } from '../files/commands';
import { useKnowledgeCommands } from '../knowledge/commands';
import { usePlanningCommands } from '../planning/commands';
import { useRitualCommands } from '../rituals/commands';
import { useCreate } from '../shell/useCreate';

export interface Command {
  id: string;
  group: 'Go to' | 'Actions';
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Other words that should find this command. */
  keywords?: string;
  /** Listed only when the query matches it, never in the resting list (tags: `#tag`). */
  searchOnly?: boolean;
  run: () => void;
}

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_NAMES: Record<ThemeMode, string> = { system: 'Match system', light: 'Light', dark: 'Dark' };

function cycleTheme() {
  const { themeMode, setThemeMode } = useSettingsStore.getState();
  const next = NEXT_THEME[themeMode];
  setThemeMode(next);
  toast(`Theme: ${THEME_NAMES[next]}`);
}

export function usePaletteCommands(): Command[] {
  const navigate = useNavigate();
  const { newNote, newTask, newProject } = useCreate();
  const planning = usePlanningCommands();
  const rituals = useRitualCommands();
  const knowledge = useKnowledgeCommands();
  const files = useFileCommands();
  const extra = useMemo(() => [...planning, ...rituals, ...knowledge, ...files], [planning, rituals, knowledge, files]);

  return useMemo(() => {
    const goTo: Command[] = [
      ...sections.map((section) => ({
        id: `go-${section.id}`,
        group: 'Go to' as const,
        label: section.label,
        icon: section.icon,
        shortcut: section.shortcut,
        run: () => navigate(sectionUrl(section)),
      })),
      {
        id: 'go-settings',
        group: 'Go to',
        label: 'Settings',
        icon: settingsRoute.icon,
        shortcut: SHORTCUTS.settings,
        keywords: 'preferences options',
        run: () => navigate(toSettingsUrl()),
      },
    ];
    const actions: Command[] = [
      { id: 'new-note', label: 'New note', icon: FilePlus, shortcut: SHORTCUTS.newNote, keywords: 'page write', run: newNote },
      { id: 'new-task', label: 'New task', icon: CheckCircle2, shortcut: SHORTCUTS.capture, keywords: 'capture todo', run: newTask },
      { id: 'new-project', label: 'New project', icon: FolderPlus, run: newProject },
      { id: 'sort-inbox', label: 'Sort inbox', icon: ListChecks, keywords: 'process triage', run: () => navigate(toInboxSortUrl()) },
      { id: 'toggle-theme', label: 'Toggle theme', icon: SunMoon, keywords: 'dark light appearance mode', run: cycleTheme },
      {
        id: 'change-accent',
        label: 'Change accent…',
        icon: Palette,
        keywords: 'color colour appearance',
        run: () => navigate(toSettingsUrl('appearance')),
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: Keyboard,
        shortcut: SHORTCUTS.help,
        keywords: 'keys help',
        // After the palette closes, so the sheet is not closed along with it.
        run: () => setTimeout(() => useUIStore.getState().openKeyboardShortcuts(), 0),
      },
    ].map((action) => ({ ...action, group: 'Actions' as const }));
    return [...goTo, ...actions, ...extra];
  }, [navigate, newNote, newTask, newProject, extra]);
}
