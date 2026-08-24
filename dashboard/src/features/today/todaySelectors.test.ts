import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../types/artifacts';
import { ArtifactStatus, ArtifactType, TodoStatus } from '../../../shared/types/enums';
import { localDateStamp, selectInPlay, selectRecord } from './todaySelectors';

function artifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'artifact',
    title: 'Artifact',
    type: ArtifactType.TODO,
    tags: [],
    status: ArtifactStatus.ACTIVE,
    related: [],
    content: '',
    created: '2026-08-03T12:00:00-05:00',
    updated: '2026-08-03T12:00:00-05:00',
    filePath: '/scratch/artifact.md',
    ...overrides,
  };
}

describe('Today chronology selectors', () => {
  it('uses the local calendar day for completed tasks and session records', () => {
    const now = new Date(2026, 7, 3, 23, 30);
    const today = localDateStamp(now);
    const records = selectRecord(
      [
        artifact({
          id: 'done',
          title: 'Done today',
          status: TodoStatus.DONE,
          completedDate: today,
        }),
        artifact({
          id: 'old',
          title: 'Done yesterday',
          status: TodoStatus.DONE,
          completedDate: '2026-08-02',
        }),
        artifact({
          id: 'session',
          title: 'Evening session',
          type: ArtifactType.DEVELOPMENT,
          tags: ['daily-log', 'session'],
          updated: new Date(2026, 7, 3, 22, 0).toISOString(),
        }),
        artifact({
          id: 'prior-session',
          title: 'Prior session',
          type: ArtifactType.DEVELOPMENT,
          tags: ['daily-log', 'session'],
          updated: new Date(2026, 7, 2, 23, 59).toISOString(),
        }),
      ],
      now,
    );

    expect(records.map((item) => item.id)).toEqual(['session', 'done', 'prior-session', 'old']);
  });

  it('orders overdue and due tasks before undated in-progress or flagged work', () => {
    const now = new Date(2026, 7, 3, 9, 0);
    const tasks = selectInPlay(
      [
        artifact({ id: 'flagged', title: 'Zulu', flagged: true }),
        artifact({ id: 'today', title: 'Today', due: '2026-08-03' }),
        artifact({ id: 'overdue', title: 'Overdue', due: '2026-08-01' }),
        artifact({
          id: 'progress',
          title: 'Alpha',
          status: TodoStatus.IN_PROGRESS,
        }),
        artifact({ id: 'later', title: 'Later', due: '2026-08-07' }),
      ],
      now,
    );

    expect(tasks.map((item) => item.id)).toEqual(['overdue', 'today', 'progress', 'flagged']);
  });
});
