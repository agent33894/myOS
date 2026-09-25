import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Sunrise } from 'lucide-react';
import { toTodayUrl } from '../../app/navigation';
import type { Command } from '../palette/usePaletteCommands';

/**
 * Palette commands for tasks and planning. "Tasks" itself is already in Go to
 * with the other sidebar sections.
 */
export function usePlanningCommands(): Command[] {
  const navigate = useNavigate();
  return useMemo(
    () => [
      {
        id: 'plan-my-day',
        group: 'Actions' as const,
        label: 'Plan my day',
        icon: Sunrise,
        keywords: 'morning today schedule plan',
        run: () => navigate(toTodayUrl('plan')),
      },
      {
        id: 'replan-carried-over',
        group: 'Actions' as const,
        label: 'Re-plan carried over',
        icon: CalendarClock,
        keywords: 'overdue reschedule move late',
        run: () => navigate(toTodayUrl('replan')),
      },
    ],
    [navigate],
  );
}
