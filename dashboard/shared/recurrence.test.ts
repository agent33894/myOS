import { describe, expect, it } from 'vitest';
import { firstOccurrence, nextOccurrence, parseRule, ruleText, type RepeatRule } from './recurrence';

const rule = (text: string) => {
  const parsed = parseRule(text);
  if (!parsed) throw new Error(`Unparsed: ${text}`);
  return parsed;
};

const walk = (repeat: RepeatRule, from: string, steps: number) => {
  const dates: string[] = [];
  for (let date = from; dates.length < steps; ) dates.push((date = nextOccurrence(repeat, date)));
  return dates;
};

describe('repeat rules', () => {
  it.each([
    ['every day', 'every day'],
    ['Every Weekday', 'every weekday'],
    ['every week', 'every week'],
    ['every 2 weeks', 'every 2 weeks'],
    ['every tuesday', 'every week on Tuesday'],
    ['every week on Tuesday', 'every week on Tuesday'],
    ['every thurs and mon', 'every week on Monday, Thursday'],
    ['every month on the 15th', 'every month on the 15th'],
    ['every 3 months on the 1st', 'every 3 months on the 1st'],
    ['monthly', 'every month'],
  ])('reads "%s"', (text, written) => {
    expect(ruleText(rule(text))).toBe(written);
    expect(rule(ruleText(rule(text)))).toEqual(rule(text));
  });

  it.each(['every', 'every blue moon', 'every 0 days', 'every month on 32', 'sometimes'])('rejects "%s"', (text) => {
    expect(parseRule(text)).toBeNull();
  });
});

describe('next occurrence', () => {
  it('clamps to the end of short months and returns to the chosen day', () => {
    expect(walk(rule('every month on 31'), '2026-01-31', 3)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(nextOccurrence(rule('every month'), '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence(rule('every month on 15'), '2026-09-10')).toBe('2026-09-15');
    expect(nextOccurrence(rule('every year'), '2028-02-29')).toBe('2029-02-28');
  });

  it('skips weekends and walks weekday lists', () => {
    // 2026-09-25 is a Friday.
    expect(nextOccurrence(rule('every weekday'), '2026-09-25')).toBe('2026-09-28');
    expect(walk(rule('every mon, thu'), '2026-09-23', 3)).toEqual(['2026-09-24', '2026-09-28', '2026-10-01']);
    expect(walk(rule('every 2 weeks'), '2026-09-23', 2)).toEqual(['2026-10-07', '2026-10-21']);
    expect(nextOccurrence(rule('every 3 days'), '2026-12-30')).toBe('2027-01-02');
  });

  it('starts a new repeating task on the first matching day, today included', () => {
    expect(firstOccurrence(rule('every tue'), '2026-09-23')).toBe('2026-09-29');
    expect(firstOccurrence(rule('every wed'), '2026-09-23')).toBe('2026-09-23');
    expect(firstOccurrence(rule('every month on 1'), '2026-09-23')).toBe('2026-10-01');
    expect(firstOccurrence(rule('every week'), '2026-09-23')).toBe('2026-09-23');
  });
});
