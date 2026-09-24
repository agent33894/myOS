import { describe, expect, it } from 'vitest';
import { dayLabel, dueTone, quickDates, relativeTime } from './dates';

// Thursday, 2026-09-24, 15:00 local time.
const now = new Date(2026, 8, 24, 15);

describe('dayLabel', () => {
  it('speaks in days near today and dates further out', () => {
    expect(dayLabel('2026-09-24', now)).toBe('Today');
    expect(dayLabel('2026-09-25', now)).toBe('Tomorrow');
    expect(dayLabel('2026-09-23', now)).toBe('Yesterday');
    expect(dayLabel('2026-09-28', now)).toBe('Monday');
    expect(dayLabel('2026-10-01', now)).toBe('Oct 1');
    expect(dayLabel('2026-09-20', now)).toBe('Sep 20');
    expect(dayLabel('2027-01-05', now)).toBe('Jan 5, 2027');
  });
});

describe('dueTone', () => {
  it('marks past days overdue', () => {
    expect(dueTone('2026-09-23', now)).toBe('overdue');
    expect(dueTone('2026-09-24', now)).toBe('today');
    expect(dueTone('2026-09-30', now)).toBe('later');
  });
});

describe('relativeTime', () => {
  it('uses minutes and hours today, then day labels', () => {
    expect(relativeTime(new Date(2026, 8, 24, 14, 59, 40).toISOString(), now)).toBe('Just now');
    expect(relativeTime(new Date(2026, 8, 24, 14, 48).toISOString(), now)).toBe('12m ago');
    expect(relativeTime(new Date(2026, 8, 24, 13).toISOString(), now)).toBe('2h ago');
    expect(relativeTime(new Date(2026, 8, 23, 22).toISOString(), now)).toBe('Yesterday');
    expect(relativeTime('2026-09-02', now)).toBe('Sep 2');
  });
});

describe('quickDates', () => {
  it('puts next week on the coming Monday', () => {
    expect(quickDates(now)).toEqual({ today: '2026-09-24', tomorrow: '2026-09-25', nextWeek: '2026-09-28' });
  });
});
