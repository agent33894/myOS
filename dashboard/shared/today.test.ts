import { describe, expect, it } from 'vitest';
import type { CheckEntry } from './checklist';
import { selectTasks } from './tasks';
import { selectToday, type TaskItem } from './today';
import { ArtifactType, TodoStatus } from './types';

// Wednesday, 2026-09-23, local time.
const now = new Date(2026, 8, 23, 10);

const task = (title: string, fields: Partial<TaskItem> = {}): TaskItem => ({
  title,
  type: ArtifactType.TODO,
  status: TodoStatus.PENDING,
  ...fields,
});

const check = (text: string, due?: string, done = false): CheckEntry => ({ kind: 'check', path: 'n.md', line: 1, text, due, done, noteTitle: 'Note' });

const labels = (list: Array<TaskItem | CheckEntry>) => list.map((item) => ('kind' in item ? item.text : item.title));

describe('selectToday', () => {
  it('buckets open tasks and dated checklist lines, and hides deferred and Someday tasks', () => {
    const buckets = selectToday(
      [
        task('late', { due: '2026-09-20' }),
        task('planned yesterday', { planned: '2026-09-22' }),
        task('due today', { due: '2026-09-23' }),
        task('planned second', { planned: '2026-09-23', order: 2 }),
        task('planned first', { planned: '2026-09-23', order: 1 }),
        task('flagged', { flagged: true }),
        task('started', { status: TodoStatus.IN_PROGRESS }),
        task('soon', { due: '2026-09-30' }),
        task('far', { due: '2026-10-30' }),
        task('parked', { status: TodoStatus.SOMEDAY, due: '2026-09-23' }),
        task('finished', { status: TodoStatus.DONE, completedDate: '2026-09-23' }),
        task('finished before', { status: TodoStatus.DONE, completedDate: '2026-09-22' }),
        task('repeats', { due: '2026-09-30', repeatRule: 'every wed', completions: ['2026-09-23'] } as Partial<TaskItem>),
        task('deferred flag', { flagged: true, deferDate: '2026-09-24' }),
        task('deferred overdue', { due: '2026-09-01', deferDate: '2026-09-25' }),
        task('defer ended', { flagged: true, deferDate: '2026-09-23' }),
        task('dropped', { status: TodoStatus.CANCELLED, due: '2026-09-23' }),
        { ...task('a capture', { flagged: true }), type: ArtifactType.INBOX },
      ],
      now,
      [check('line late', '2026-09-21'), check('line today', '2026-09-23'), check('line done', '2026-09-23', true), check('line undated')],
    );
    expect(labels(buckets.carriedOver)).toEqual(['late', 'line late', 'planned yesterday']);
    expect(labels(buckets.today)).toEqual(['planned first', 'planned second', 'due today', 'line today', 'defer ended', 'flagged', 'started']);
    expect(labels(buckets.upcoming)).toEqual(['repeats', 'soon']);
    expect(labels(buckets.doneToday)).toEqual(['finished', 'repeats']);
  });
});

describe('selectTasks', () => {
  it('gives every open task Today does not show a section', () => {
    const sections = selectTasks(
      [
        task('no date'),
        task('ordered', { order: 1 }),
        task('this week', { due: '2026-09-25' }),
        task('later', { due: '2026-10-20' }),
        task('deferred', { due: '2026-09-25', deferDate: '2026-09-24' }),
        task('parked', { status: TodoStatus.SOMEDAY }),
        task('finished', { status: TodoStatus.DONE }),
      ],
      now,
    );
    expect(labels(sections.anytime)).toEqual(['ordered', 'no date']);
    expect(labels(sections.upcoming)).toEqual(['deferred', 'later']);
    expect(labels(sections.someday)).toEqual(['parked']);
  });
});
