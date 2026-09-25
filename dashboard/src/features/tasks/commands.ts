import { ListChecks, PenLine, SunMedium } from 'lucide-react';
import type { CommandSource } from '../../app/commands';
import { go, paths } from '../../app/navigation';
import { openOverlay } from '../../store/ui';

/** Commands for Today, Tasks, and capture. */
export const taskCommands: CommandSource = () => [
  { id: 'tasks.today', group: 'Go to', label: 'Today', icon: SunMedium, keywords: 'daily note agenda', run: () => go(paths.today) },
  { id: 'tasks.tasks', group: 'Go to', label: 'Tasks', icon: ListChecks, keywords: 'todo open due', run: () => go(paths.tasks) },
  // After the command bar closes, so capture is not closed along with it.
  { id: 'tasks.capture', group: 'Tasks', label: 'Capture', icon: PenLine, shortcut: 'mod+n', keywords: 'add quick new task', run: () => setTimeout(() => openOverlay('capture'), 0) },
];
