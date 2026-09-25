import { dayOf, formatLocalDate, parseLocalDate, shiftDate } from '@shared/date';

/** A project with no activity for this many days is "quiet" in the weekly review. */
export const QUIET_DAYS = 21;

/** The Monday (YYYY-MM-DD) of the week that holds `stamp`. Weeks run Monday to Sunday. */
export function weekStartOf(stamp: string = formatLocalDate()): string {
  const weekday = parseLocalDate(stamp).getDay();
  return shiftDate(stamp, -((weekday + 6) % 7));
}

interface NudgeState {
  today: string;
  /** 0 Sunday – 6 Saturday. */
  reviewDay: number;
  lastReview: string | null;
  /** The week start of a week the user dismissed the item for. */
  dismissedWeek: string | null;
  enabled: boolean;
}

/**
 * The sidebar's Weekly review item shows only on the chosen day, only when no
 * review was finished this week, and never after it was dismissed this week.
 */
export function showsWeeklyNudge({ today, reviewDay, lastReview, dismissedWeek, enabled }: NudgeState): boolean {
  if (!enabled || parseLocalDate(today).getDay() !== reviewDay) return false;
  const week = weekStartOf(today);
  return (lastReview ?? '') < week && dismissedWeek !== week;
}

/** Open projects with no activity (the project or anything in it) in the last `QUIET_DAYS` days. */
export function isQuiet(project: { lastActivity?: string; updated: string }, today: string): boolean {
  const last = dayOf(project.lastActivity) ?? dayOf(project.updated) ?? today;
  return last < shiftDate(today, -QUIET_DAYS);
}
