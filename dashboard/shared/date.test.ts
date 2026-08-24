import { describe, expect, it } from 'vitest';
import { formatLocalDate } from './date';

describe('formatLocalDate', () => {
  it('formats local calendar components with zero padding', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
