import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarCheck, CalendarRange, Moon } from 'lucide-react';
import { paths, toWeekUrl } from '../../app/navigation';
import type { Command } from '../palette/usePaletteCommands';
import { startRitual } from './store';

// Run after the palette has closed, so its focus handling doesn't close the ritual's dialog too.
const later = (run: () => void) => () => setTimeout(run, 0);

/** Palette commands for rituals and reflection. */
export function useRitualCommands(): Command[] {
  const navigate = useNavigate();
  return useMemo(
    () => [
      {
        id: 'close-day',
        group: 'Actions',
        label: 'Close the day',
        icon: Moon,
        keywords: 'evening wrap up end shutdown',
        run: later(() => startRitual('close-day')),
      },
      {
        id: 'weekly-review',
        group: 'Actions',
        label: 'Weekly review',
        icon: CalendarCheck,
        keywords: 'fresh start week reset plan',
        run: later(() => startRitual('weekly-review')),
      },
      {
        id: 'open-journal',
        group: 'Go to',
        label: 'Open journal',
        icon: BookOpen,
        keywords: 'today diary write reflect',
        run: () => navigate(paths.journal),
      },
      {
        id: 'what-moved',
        group: 'Go to',
        label: 'What moved',
        icon: CalendarRange,
        keywords: 'week review progress done finished look back',
        run: () => navigate(toWeekUrl()),
      },
    ],
    [navigate],
  );
}
