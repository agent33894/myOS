import { describe, expect, it } from 'vitest';
import { isQuiet, showsWeeklyNudge, weekStartOf } from './weekly';

// 2026-09-25 is a Friday; its week starts Monday 2026-09-21.
const friday = { today: '2026-09-25', reviewDay: 5, lastReview: null, dismissedWeek: null, enabled: true };

describe('weekly review nudge', () => {
  it('weeks start on Monday, Sunday included in the week before', () => {
    expect(weekStartOf('2026-09-25')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-21')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-27')).toBe('2026-09-21');
  });

  it('shows only on the chosen day, and only until reviewed or dismissed this week', () => {
    expect(showsWeeklyNudge(friday)).toBe(true);
    expect(showsWeeklyNudge({ ...friday, today: '2026-09-24' })).toBe(false);
    expect(showsWeeklyNudge({ ...friday, lastReview: '2026-09-22' })).toBe(false);
    expect(showsWeeklyNudge({ ...friday, lastReview: '2026-09-18' })).toBe(true);
    expect(showsWeeklyNudge({ ...friday, dismissedWeek: '2026-09-21' })).toBe(false);
    expect(showsWeeklyNudge({ ...friday, enabled: false })).toBe(false);
  });

  it('a project is quiet after 21 days without activity', () => {
    expect(isQuiet({ lastActivity: '2026-09-03', updated: '2026-09-03' }, '2026-09-25')).toBe(true);
    expect(isQuiet({ lastActivity: '2026-09-04', updated: '2026-09-04' }, '2026-09-25')).toBe(false);
  });
});
