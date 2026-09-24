import { describe, expect, it } from 'vitest';
import { parseCapture } from './inbox';
import { selectToday } from './today';
import { ArtifactType, TodoStatus } from './types';

// Wednesday, 2026-09-23, local time.
const now = new Date(2026, 8, 23, 10);

const task = (title: string, fields: Partial<Parameters<typeof selectToday>[0][number]> = {}) => ({
  title,
  type: ArtifactType.TODO,
  status: TodoStatus.PENDING,
  ...fields,
});

describe('selectToday', () => {
  it('buckets open tasks and hides deferred ones until their date', () => {
    const buckets = selectToday(
      [
        task('late', { due: '2026-09-20' }),
        task('due today', { due: '2026-09-23' }),
        task('flagged', { flagged: true }),
        task('started', { status: TodoStatus.IN_PROGRESS }),
        task('soon', { due: '2026-09-30' }),
        task('far', { due: '2026-10-30' }),
        task('finished', { status: TodoStatus.DONE, completedDate: '2026-09-23' }),
        task('finished before', { status: TodoStatus.DONE, completedDate: '2026-09-22' }),
        task('deferred flag', { flagged: true, deferDate: '2026-09-24' }),
        task('deferred overdue', { due: '2026-09-01', deferDate: '2026-09-25' }),
        task('defer ended', { flagged: true, deferDate: '2026-09-23' }),
        task('dropped', { status: TodoStatus.CANCELLED, due: '2026-09-23' }),
        { ...task('a capture', { flagged: true }), type: ArtifactType.INBOX },
      ],
      now,
    );
    const titles = (list: Array<{ title: string }>) => list.map((item) => item.title);
    expect(titles(buckets.overdue)).toEqual(['late']);
    expect(titles(buckets.today)).toEqual(['due today', 'defer ended', 'flagged', 'started']);
    expect(titles(buckets.upcoming)).toEqual(['soon']);
    expect(titles(buckets.doneToday)).toEqual(['finished']);
  });
});

describe('parseCapture', () => {
  it('pulls dates, tags, project, flag, and priority out of the title', () => {
    expect(parseCapture('Call Ana tomorrow #calls @launch-plan ! !high', now)).toMatchObject({
      title: 'Call Ana',
      due: '2026-09-24',
      tags: ['calls'],
      projectRef: 'launch-plan',
      flagged: true,
      priority: 'high',
      kind: 'task',
    });
  });

  it.each([
    ['Pay rent fri', '2026-09-25'],
    ['Standup wednesday', '2026-09-30'],
    ['Review next week', '2026-09-30'],
    ['Renew passport in 3 days', '2026-09-26'],
    ['Water plants today', '2026-09-23'],
    ['Sunday roast #food', '2026-09-27'],
  ])('reads the date in "%s"', (text, due) => {
    expect(parseCapture(text, now).due).toBe(due);
  });

  it.each(['Buy sun cream', "Read today's news", 'Sat with Joe about the plan'])('keeps "%s" undated', (text) => {
    expect(parseCapture(text, now)).toMatchObject({ title: text, due: undefined, kind: 'capture' });
  });

  it('keeps plain thoughts as Inbox captures with the rest as the body', () => {
    expect(parseCapture('Mail from ana@example.com about the sundae bar\nsecond line', now)).toEqual({
      title: 'Mail from ana@example.com about the sundae bar',
      body: 'second line',
      flagged: false,
      tags: [],
      due: undefined,
      priority: undefined,
      projectRef: undefined,
      kind: 'capture',
    });
  });
});
