import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../types/artifacts';
import { ArtifactType, TodoStatus } from '../../types/artifacts';
import { resolveWorkbenchItem } from './workbenchItem';

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

describe('resolveWorkbenchItem', () => {
  const open = artifact({ id: 't-1', filePath: '/vault/work/todos/t-1.md' });
  const done = artifact({
    id: 't-2',
    filePath: '/vault/work/todos/t-2.md',
    status: TodoStatus.DONE,
  });
  const memo = artifact({
    id: 'm-1',
    type: ArtifactType.MEMO,
    filePath: '/vault/work/memos/m-1.md',
  });
  const lists = { openTodos: [open], doneTodos: [done], materials: [memo] };

  it('resolves an open task by file path', () => {
    expect(resolveWorkbenchItem(lists, '/vault/work/todos/t-1.md')).toBe(open);
  });

  it('resolves done tasks and materials too', () => {
    expect(resolveWorkbenchItem(lists, '/vault/work/todos/t-2.md')).toBe(done);
    expect(resolveWorkbenchItem(lists, '/vault/work/memos/m-1.md')).toBe(memo);
  });

  it('returns null for a path outside the project', () => {
    expect(resolveWorkbenchItem(lists, '/vault/work/todos/elsewhere.md')).toBeNull();
  });

  it('returns null with no item param', () => {
    expect(resolveWorkbenchItem(lists, null)).toBeNull();
    expect(resolveWorkbenchItem(lists, undefined)).toBeNull();
    expect(resolveWorkbenchItem(lists, '')).toBeNull();
  });
});
