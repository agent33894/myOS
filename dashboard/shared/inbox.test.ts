import { describe, expect, it } from 'vitest';
import { parseCapture, suggest } from './inbox';

// Wednesday, 2026-09-23, local time.
const now = new Date(2026, 8, 23, 10);

describe('parseCapture', () => {
  const launchPlan = { id: 'launch-plan-x1', title: 'Launch plan' };

  it('leaves an @name that matches no project in the title', () => {
    expect(parseCapture('Ask @sam about tiles', [launchPlan], now)).toMatchObject({
      title: 'Ask @sam about tiles',
      unknownRef: 'sam',
      kind: 'capture',
    });
  });

  it('pulls dates, tags, project, flag, and priority out of the title', () => {
    expect(parseCapture('Call Ana tomorrow #calls @launch ! !high', [launchPlan], now)).toMatchObject({
      title: 'Call Ana',
      due: '2026-09-24',
      tags: ['calls'],
      project: launchPlan,
      flagged: true,
      priority: 'high',
      kind: 'task',
    });
  });

  it.each([
    ['Pay rent fri', '2026-09-25'],
    ['Standup wednesday', '2026-09-30'],
    ['Review next week', '2026-09-28'],
    ['Renew passport in 2 weeks', '2026-10-07'],
    ['Renew passport in 3 days', '2026-09-26'],
    ['Water plants today', '2026-09-23'],
    ['Sunday roast #food', '2026-09-27'],
  ])('reads the date in "%s"', (text, due) => {
    expect(parseCapture(text, [], now).due).toBe(due);
  });

  it.each(['Buy sun cream', "Read today's news", 'Sat with Joe about the plan'])('keeps "%s" undated', (text) => {
    expect(parseCapture(text, [], now)).toMatchObject({ title: text, due: undefined, kind: 'capture' });
  });

  it.each([
    ['Soccer practice pickup every tuesday', { title: 'Soccer practice pickup', repeatRule: 'every tue', due: '2026-09-29', kind: 'task' }],
    ['Sam dentist on friday', { title: 'Sam dentist', due: '2026-09-25', kind: 'task' }],
    ['Sam dentist fri at 4', { title: 'Sam dentist at 4', due: '2026-09-25' }],
    ['Dentist for Sam fri @fam', { title: 'Dentist for Sam @fam', due: '2026-09-25', unknownRef: 'fam' }],
    ['Pay water bill !high', { title: 'Pay water bill', priority: 'high', due: undefined, kind: 'task' }],
    ['Call the bank by thu', { title: 'Call the bank', due: '2026-09-24' }],
    ['Standup every weekday ~15m', { title: 'Standup', repeatRule: 'every weekday', due: '2026-09-23', estimatedMinutes: 15 }],
    ['Rent every month on 1st', { title: 'Rent', repeatRule: 'every month on 1', due: '2026-10-01' }],
    ['Gym every mon, thu ~1.5h', { title: 'Gym', repeatRule: 'every mon, thu', due: '2026-09-24', estimatedMinutes: 90 }],
  ])('understands "%s"', (text, expected) => {
    expect(parseCapture(text, [], now)).toMatchObject(expected);
  });

  it('finds the @ or # token being typed', () => {
    expect(suggest('Call Ana @lau tomorrow', 12)).toEqual({ trigger: '@', query: 'la', start: 9, end: 13 });
    expect(suggest('#', 1)).toEqual({ trigger: '#', query: '', start: 0, end: 1 });
    expect(suggest('mail ana@example.com', 20)).toBeNull();
  });

  it('keeps plain thoughts as Inbox captures with the rest as the body', () => {
    expect(parseCapture('Mail from ana@example.com about the sundae bar\nsecond line', [], now)).toEqual({
      title: 'Mail from ana@example.com about the sundae bar',
      body: 'second line',
      flagged: false,
      tags: [],
      due: undefined,
      repeatRule: undefined,
      estimatedMinutes: undefined,
      priority: undefined,
      project: undefined,
      unknownRef: undefined,
      kind: 'capture',
    });
  });
});
