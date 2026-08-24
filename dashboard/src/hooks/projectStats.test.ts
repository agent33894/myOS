import { describe, expect, it } from 'vitest';
import type { Artifact } from '../types/artifacts';
import { ArtifactType, TodoPriority, TodoStatus } from '../types/artifacts';
import {
  PROJECT_CLOSED_STATUSES,
  computeProjectStats,
  dateOnly,
  isLinkedToProject,
} from './projectStats';

const TODAY = '2026-08-10';

function artifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'a-1',
    title: 'Artifact',
    type: ArtifactType.TODO,
    tags: [],
    status: 'pending',
    related: [],
    content: '',
    created: '2026-08-01',
    updated: '2026-08-01',
    filePath: '/vault/work/todos/a-1.md',
    ...overrides,
  } as Artifact;
}

const project = {
  id: 'proj-1',
  title: 'Thames Purchase',
  related: ['memo-9'],
  status: 'active' as Artifact['status'],
  updated: '2026-08-05',
  created: '2026-06-01',
};

describe('dateOnly', () => {
  it('normalizes bare stamps and full ISO strings to date-only', () => {
    expect(dateOnly('2026-03-06')).toBe('2026-03-06');
    expect(dateOnly('2026-03-06T00:00:00+00:00')).toBe('2026-03-06');
    expect(dateOnly(undefined)).toBeNull();
    expect(dateOnly('soon')).toBeNull();
  });
});

describe('isLinkedToProject', () => {
  it('matches project: by title or id', () => {
    expect(isLinkedToProject(artifact({ project: 'Thames Purchase' }), project)).toBe(true);
    expect(isLinkedToProject(artifact({ project: 'proj-1' }), project)).toBe(true);
    expect(isLinkedToProject(artifact({ project: 'other' }), project)).toBe(false);
  });

  it('matches related: links in both directions', () => {
    expect(isLinkedToProject(artifact({ related: ['proj-1'] }), project)).toBe(true);
    expect(isLinkedToProject(artifact({ id: 'memo-9' }), project)).toBe(true);
    expect(isLinkedToProject(artifact({}), project)).toBe(false);
  });

  it('never links other projects', () => {
    expect(
      isLinkedToProject(artifact({ type: ArtifactType.PROJECT, related: ['proj-1'] }), project),
    ).toBe(false);
  });
});

describe('computeProjectStats', () => {
  it('sorts open todos overdue-first and compares ISO dues date-only', () => {
    const stats = computeProjectStats(
      project,
      [
        artifact({ id: 't-later', due: '2026-08-20' }),
        artifact({ id: 't-overdue', due: '2026-08-02T00:00:00+00:00' }),
        artifact({ id: 't-high', priority: TodoPriority.HIGH }),
      ],
      TODAY,
    );
    expect(stats.openTodos.map((t) => t.id)).toEqual(['t-overdue', 't-later', 't-high']);
    expect(stats.overdueCount).toBe(1);
    // Overdue dates are counted, not queued: nextDue is the earliest upcoming date.
    expect(stats.nextDue).toBe('2026-08-20');
    expect(stats.health).toBe('at-risk');
  });

  it('leaves nextDue unset when every open due date has passed', () => {
    const stats = computeProjectStats(project, [artifact({ id: 't-1', due: '2026-08-02' })], TODAY);
    expect(stats.nextDue).toBeUndefined();
    expect(stats.overdueCount).toBe(1);
  });

  it('ignores legacy project due entirely: preserved data feeds neither risk nor stats', () => {
    const calm = [artifact({ id: 't-1' })];
    // Projects have no deadline; a stored `due` is legacy frontmatter only.
    const legacyProject = { ...project, due: '2026-08-01' };
    const stats = computeProjectStats(legacyProject, calm, TODAY);
    expect(stats.health).toBe('active');
    expect('deadlineOverdue' in stats).toBe(false);
  });

  it('counts flagged open todos only', () => {
    const stats = computeProjectStats(
      project,
      [
        artifact({ id: 't-1', flagged: true }),
        artifact({ id: 't-2' }),
        artifact({ id: 't-3', flagged: true, status: TodoStatus.DONE }),
      ],
      TODAY,
    );
    expect(stats.flaggedCount).toBe(1);
  });

  it('drops cancelled todos from the ledger and computes progress', () => {
    const stats = computeProjectStats(
      project,
      [
        artifact({ id: 't-done', status: TodoStatus.DONE, completedDate: '2026-08-03' }),
        artifact({ id: 't-cancelled', status: TodoStatus.CANCELLED }),
        artifact({ id: 't-open' }),
      ],
      TODAY,
    );
    expect(stats.todoProgress).toEqual({ total: 2, done: 1, percentage: 50 });
    expect(stats.doneTodos.map((t) => t.id)).toEqual(['t-done']);
  });

  it('goes dormant only without risk and after 30 quiet days', () => {
    const stale = artifact({ id: 't-old', updated: '2026-06-01' });
    const quiet = { ...project, updated: '2026-06-01' };
    expect(computeProjectStats(quiet, [stale], TODAY).health).toBe('dormant');
    expect(
      computeProjectStats(quiet, [stale, artifact({ id: 't-hot', priority: TodoPriority.HIGH })], TODAY).health,
    ).toBe('at-risk');
    expect(computeProjectStats(project, [stale], TODAY).health).toBe('active');
  });

  it('groups non-todo materials by type and reports closed statuses per spec', () => {
    const stats = computeProjectStats(
      { ...project, status: 'archived' as Artifact['status'] },
      [
        artifact({ id: 'm-1', type: ArtifactType.MEMO }),
        artifact({ id: 'd-1', type: ArtifactType.DECISION }),
        artifact({ id: 'm-2', type: ArtifactType.MEMO, updated: '2026-08-04' }),
      ],
      TODAY,
    );
    expect(stats.materialsByType.map((g) => g.type)).toEqual([
      ArtifactType.DECISION,
      ArtifactType.MEMO,
    ]);
    expect(stats.materialsByType[1].items.map((a) => a.id)).toEqual(['m-2', 'm-1']);
    expect(stats.isClosed).toBe(true);
    expect(stats.todoProgress).toBeUndefined();
    expect(PROJECT_CLOSED_STATUSES.has('superseded')).toBe(false);
  });

  it('reports idle days from the newest activity stamp', () => {
    expect(computeProjectStats(project, [], TODAY).idleDays).toBe(5);
    expect(computeProjectStats(project, [artifact({ updated: '2026-08-09' })], TODAY).idleDays).toBe(1);
    const undated = { ...project, updated: undefined as unknown as string };
    expect(computeProjectStats(undated, [], TODAY).idleDays).toBeUndefined();
  });
});
