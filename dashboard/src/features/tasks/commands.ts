import { BookmarkPlus, CalendarDays, CalendarPlus, ListChecks, PenLine, Search, SunMedium } from 'lucide-react';
import { formatLocalDate, shiftDate } from '@shared/date';
import type { CommandSource } from '../../app/commands';
import { go, openNote, paths, toTasksUrl, toViewUrl } from '../../app/navigation';
import { dailyPath } from '../../data/gateway';
import { useSettings } from '../../store/settings';
import { openOverlay } from '../../store/ui';

const openDaily = (offset = 0) => void dailyPath(shiftDate(formatLocalDate(), offset)).then((path) => openNote(path, { create: true }));

// Run after the command bar closes, so what opens is not closed along with it.
const later = (run: () => void) => () => window.setTimeout(run, 0);

/** Commands for Today, Tasks, saved views, and capture. */
export const taskCommands: CommandSource = () => [
  { id: 'tasks.today', group: 'Go to', label: 'Today', icon: SunMedium, keywords: 'daily agenda due', run: () => go(paths.today) },
  { id: 'tasks.tasks', group: 'Go to', label: 'Tasks', icon: ListChecks, keywords: 'todo open due query', run: () => go(paths.tasks) },
  ...useSettings.getState().pinnedViews.map((view) => ({
    id: `tasks.view.${view.id}`,
    group: 'Go to' as const,
    label: view.name,
    icon: Search,
    keywords: `view saved ${view.query}`,
    run: () => go(toViewUrl(view.id)),
  })),
  { id: 'tasks.capture', group: 'Tasks', label: 'Capture', icon: PenLine, shortcut: 'mod+n', keywords: 'add quick new task inbox', run: later(() => openOverlay('capture')) },
  { id: 'tasks.daily', group: 'Tasks', label: 'Open today’s daily note', icon: CalendarDays, keywords: 'journal daily note', run: () => openDaily() },
  { id: 'tasks.daily-tomorrow', group: 'Tasks', label: 'Open tomorrow’s daily note', icon: CalendarPlus, keywords: 'journal daily note plan', run: () => openDaily(1) },
  { id: 'tasks.late', group: 'Tasks', label: 'Show late tasks', icon: ListChecks, keywords: 'overdue', run: () => go(toTasksUrl('overdue group:file')) },
  { id: 'tasks.week', group: 'Tasks', label: 'Show tasks due this week', icon: ListChecks, keywords: 'upcoming due soon', run: () => go(toTasksUrl('open due<=today+7 group:date')) },
  { id: 'tasks.new-view', group: 'Tasks', label: 'New view', icon: BookmarkPlus, keywords: 'saved search query pin', run: () => go(toTasksUrl('open')) },
];
