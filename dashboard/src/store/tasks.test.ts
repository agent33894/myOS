import { beforeEach, describe, expect, it } from 'vitest';
import type { Artifact } from '../types/artifacts';
import { ArtifactStatus, ArtifactType, Domain, TodoStatus } from '../types/artifacts';
import { useArtifactsStore } from './artifacts';
import { useTasksStore } from './tasks';
import { TaskGroupBy, TaskPerspective, TaskSortBy } from '../types/tasks';

function buildArtifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'artifact-id',
    title: 'Untitled',
    type: ArtifactType.MEMO,
    domain: Domain.WORK,
    tags: [],
    status: 'active',
    related: [],
    content: '',
    created: '2026-04-27',
    updated: '2026-04-27T00:00:00.000Z',
    filePath: 'work/memos/untitled.md',
    ...overrides,
  } as Artifact;
}

function resetArtifactsStore(): void {
  useArtifactsStore.getState().setArtifacts([]);
}

function resetTasksStore(): void {
  useTasksStore.setState({
    currentPerspective: TaskPerspective.INBOX,
    groupBy: TaskGroupBy.NONE,
    sortBy: TaskSortBy.DUE_DATE,
    filters: {},
    selectedTaskId: null,
    inboxTasks: [],
    inboxEntries: [],
    todayTasks: [],
    forecastItems: [],
    projectTasks: [],
    allTasks: [],
    stats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      flagged: 0,
      deferred: 0,
      withSubtasks: 0,
      completionRate: 0,
    },
  });
}

describe('tasks store inbox queue', () => {
  beforeEach(() => {
    resetArtifactsStore();
    resetTasksStore();
  });

  it('includes both root todos and inbox artifacts in the Inbox perspective', () => {
    useArtifactsStore.getState().setArtifacts([
      buildArtifact({
        id: 'todo-1',
        title: 'Root task',
        type: ArtifactType.TODO,
        status: TodoStatus.PENDING,
        filePath: 'work/todos/root-task.md',
        updated: '2026-04-27T08:00:00.000Z',
      }),
      buildArtifact({
        id: 'inbox-1',
        title: 'Inbox capture',
        type: ArtifactType.INBOX,
        status: ArtifactStatus.ACTIVE,
        domain: undefined,
        filePath: 'inbox/inbox-capture.md',
        updated: '2026-04-27T09:00:00.000Z',
      }),
    ]);

    useTasksStore.getState().refreshTasks();

    const state = useTasksStore.getState();
    expect(state.inboxEntries).toHaveLength(2);
    expect(
      state.inboxEntries.map((entry) =>
        entry.kind === 'task' ? entry.task.id : entry.artifact.id
      ).sort()
    ).toEqual(['inbox-1', 'todo-1']);
    expect(state.todayTasks.map((task) => task.id)).toEqual(['todo-1']);
    expect(state.projectTasks).toHaveLength(0);
  });

  it('filters archived and completed inbox artifacts out of the queue', () => {
    useArtifactsStore.getState().setArtifacts([
      buildArtifact({
        id: 'inbox-active',
        title: 'Active capture',
        type: ArtifactType.INBOX,
        status: ArtifactStatus.ACTIVE,
        domain: undefined,
        filePath: 'inbox/active.md',
      }),
      buildArtifact({
        id: 'inbox-archived',
        title: 'Archived capture',
        type: ArtifactType.INBOX,
        status: ArtifactStatus.ARCHIVED,
        domain: undefined,
        filePath: 'inbox/archived.md',
      }),
      buildArtifact({
        id: 'inbox-done',
        title: 'Done capture',
        type: ArtifactType.INBOX,
        status: ArtifactStatus.DONE,
        domain: undefined,
        filePath: 'inbox/done.md',
      }),
    ]);

    useTasksStore.getState().refreshTasks();

    const state = useTasksStore.getState();
    expect(state.inboxEntries).toHaveLength(1);
    expect(state.inboxEntries[0]).toMatchObject({
      kind: 'artifact',
      artifact: { id: 'inbox-active' },
    });
  });
});
