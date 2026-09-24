import { describe, expect, it } from 'vitest';
import type { ArtifactSummary } from '@shared/types';
import { ArtifactType, TodoStatus } from '@shared/types';
import { deriveActivity } from './projectActivity';

function artifact(overrides: Partial<ArtifactSummary>): ArtifactSummary {
  return {
    id: 'a-1',
    title: 'ArtifactSummary',
    type: ArtifactType.TODO,
    tags: [],
    status: 'pending',
    related: [],
    content: '',
    created: '2026-08-01',
    updated: '2026-08-01',
    filePath: '/vault/work/todos/a-1.md',
    ...overrides,
  } as ArtifactSummary;
}

const doneTask = (id: string, title: string, completedDate?: string, updated = '2026-08-01') =>
  artifact({ id, title, status: TodoStatus.DONE, completedDate, updated });

describe('deriveActivity', () => {
  it('merges tasks, materials, and creation newest-first', () => {
    const entries = deriveActivity({
      created: '2026-04-30',
      doneTodos: [doneTask('t-1', 'Audit', '2026-05-01')],
      materials: [
        artifact({ id: 'm-1', type: ArtifactType.MEMO, title: 'Plan', created: '2026-04-30', updated: '2026-05-02' }),
      ],
    });
    expect(entries.map((e) => [e.date, e.garnish])).toEqual([
      ['2026-05-02', 'Memo · edited'],
      ['2026-05-01', 'Task · completed'],
      ['2026-04-30', 'Project · created'],
    ]);
  });

  it('labels a material filed when its last touch is its creation day', () => {
    const [entry] = deriveActivity({
      doneTodos: [],
      materials: [
        artifact({ id: 'm-1', type: ArtifactType.DECISION, created: '2026-05-01', updated: '2026-05-01' }),
      ],
    });
    expect(entry.garnish).toBe('Decision · filed');
  });

  it('breaks same-day ties by kind then title, and falls back to updated for undated completions', () => {
    const entries = deriveActivity({
      created: '2026-05-01',
      doneTodos: [doneTask('t-1', 'Zeta task', undefined, '2026-05-01')],
      materials: [
        artifact({ id: 'm-b', type: ArtifactType.MEMO, title: 'Beta memo', created: '2026-05-01', updated: '2026-05-01' }),
        artifact({ id: 'm-a', type: ArtifactType.MEMO, title: 'Alpha memo', created: '2026-05-01', updated: '2026-05-01' }),
      ],
    });
    expect(entries.map((e) => e.title)).toEqual([
      'Zeta task',
      'Alpha memo',
      'Beta memo',
      'Filed to the vault',
    ]);
  });

  it('caps the ledger and keeps the newest entries', () => {
    const materials = Array.from({ length: 10 }, (_, i) =>
      artifact({
        id: `m-${i}`,
        type: ArtifactType.MEMO,
        title: `Memo ${i}`,
        created: '2026-07-01',
        updated: `2026-07-${String(i + 10).padStart(2, '0')}`,
      }),
    );
    const entries = deriveActivity({ created: '2026-06-01', doneTodos: [], materials }, 4);
    expect(entries).toHaveLength(4);
    expect(entries[0].date).toBe('2026-07-19');
    expect(entries.some((e) => e.garnish === 'Project · created')).toBe(false);
  });

  it('drops undated events entirely', () => {
    const entries = deriveActivity({
      doneTodos: [doneTask('t-1', 'Ghost', undefined, 'not a date')],
      materials: [],
    });
    expect(entries).toEqual([]);
  });
});
