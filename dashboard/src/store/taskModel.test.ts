import { describe, expect, it } from 'vitest';
import { ArtifactType, Domain, TodoPriority, TodoStatus } from '../types/artifacts';
import { TaskSortBy, type Task, type TaskWithContext } from '../types/tasks';
import {
  addTaskContext,
  buildTaskContextIndex,
  computeTaskStats,
  filterTasks,
  getCompletionUpdates,
  parseNaturalLanguage,
  sortTasks,
} from './taskModel';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Task',
    type: ArtifactType.TODO,
    domain: Domain.WORK,
    tags: [],
    status: TodoStatus.PENDING,
    related: [],
    content: '',
    created: '2026-08-12',
    updated: '2026-08-12',
    filePath: 'work/todos/task.md',
    ...overrides,
  };
}

function contextual(overrides: Partial<TaskWithContext> = {}): TaskWithContext {
  return {
    ...task(overrides),
    isOverdue: false,
    isDueToday: false,
    isDueTomorrow: false,
    isDueThisWeek: false,
    isDeferred: false,
    isAvailable: true,
    children: [],
    childrenComplete: 0,
    childrenTotal: 0,
    ...overrides,
  };
}

describe('task transitions and projections', () => {
  it.each([
    [TodoStatus.PENDING, TodoStatus.DONE, '2026-08-12'],
    [TodoStatus.DONE, TodoStatus.PENDING, undefined],
  ])('toggles %s completion with its date contract', (status, expectedStatus, expectedDate) => {
    expect(getCompletionUpdates(task({ status }), '2026-08-12')).toEqual({
      status: expectedStatus,
      completedDate: expectedDate,
    });
  });

  it('builds sequential availability, child progress, and project paths', () => {
    const tasks = [
      task({ id: 'project', title: 'Project', type: ArtifactType.PROJECT, sequential: true }),
      task({ id: 'first', parentId: 'project', status: TodoStatus.PENDING, created: '2026-08-10' }),
      task({ id: 'second', parentId: 'project', created: '2026-08-11' }),
    ];
    const index = buildTaskContextIndex(tasks, new Date('2026-08-12T12:00:00'));
    expect(addTaskContext(tasks[2], index)).toMatchObject({
      isAvailable: false,
      projectPath: ['Project'],
    });
    expect(addTaskContext(tasks[0], index)).toMatchObject({ childrenTotal: 2, childrenComplete: 0 });
  });

  it.each([
    [TaskSortBy.DUE_DATE, ['early', 'late', 'none']],
    [TaskSortBy.PRIORITY, ['late', 'early', 'none']],
    [TaskSortBy.FLAGGED, ['none', 'early', 'late']],
    [TaskSortBy.TITLE, ['none', 'early', 'late']],
  ])('sorts deterministically by %s', (sortBy, expected) => {
    const tasks = [
      contextual({ id: 'late', title: 'Zulu', due: '2026-08-20', priority: TodoPriority.HIGH }),
      contextual({ id: 'early', title: 'Bravo', due: '2026-08-13', priority: TodoPriority.MEDIUM }),
      contextual({ id: 'none', title: 'Alpha', flagged: true }),
    ];
    expect(sortTasks(tasks, sortBy).map(({ id }) => id)).toEqual(expected);
  });

  it('applies completion, priority, flag, project, and parent filters together', () => {
    const tasks = [
      contextual({ id: 'match', priority: TodoPriority.HIGH, flagged: true, parentId: 'project' }),
      contextual({ id: 'done', status: TodoStatus.DONE, priority: TodoPriority.HIGH, flagged: true, parentId: 'project' }),
      contextual({ id: 'wrong-project', priority: TodoPriority.HIGH, flagged: true, parentId: 'other' }),
    ];
    expect(filterTasks(tasks, {
      priority: [TodoPriority.HIGH],
      flagged: true,
      projectId: 'project',
      hasParent: true,
    }, false).map(({ id }) => id)).toEqual(['match']);
  });

  it('computes statistics in one deterministic pass', () => {
    const tasks = [
      contextual({ id: 'pending', isOverdue: true, flagged: true, childrenTotal: 1 }),
      contextual({ id: 'done', status: TodoStatus.DONE, isDueThisWeek: true }),
    ];
    expect(computeTaskStats(tasks)).toMatchObject({
      total: 2,
      pending: 1,
      completed: 1,
      overdue: 1,
      flagged: 1,
      withSubtasks: 1,
      completionRate: 50,
    });
  });

  it('parses task syntax relative to an injected date', () => {
    expect(parseNaturalLanguage(
      'Ship phase 4 tomorrow #myos !high',
      new Date('2026-08-12T12:00:00'),
    )).toEqual({
      title: 'Ship phase 4',
      due: '2026-08-13',
      priority: 'high',
      tags: ['myos'],
      flagged: false,
    });
  });
});
