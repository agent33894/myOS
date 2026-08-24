import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ArtifactStatus,
  ArtifactType,
  Domain,
  type Artifact,
} from '../types/artifacts';

const { pushUndoMock, loadContentMock } = vi.hoisted(() => ({
  pushUndoMock: vi.fn(),
  loadContentMock: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});

vi.mock('@/gateways/artifactsGateway', () => ({
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
}));

vi.mock('../store/undoRedo', () => ({
  useUndoRedoStore: {
    getState: () => ({ pushUndo: pushUndoMock }),
  },
}));

vi.mock('../store/artifacts', () => ({
  useArtifactsStore: {
    getState: () => ({ loadContent: loadContentMock }),
  },
}));

import {
  createArtifact,
  updateArtifact,
  deleteArtifact,
} from '@/gateways/artifactsGateway';
import { useUndoableArtifact } from './useUndoableArtifact';

function buildArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'artifact-1',
    title: 'Artifact 1',
    type: ArtifactType.MEMO,
    domain: Domain.WORK,
    tags: ['notes'],
    status: ArtifactStatus.ACTIVE,
    related: [],
    content: 'content',
    created: '2026-02-01',
    updated: '2026-02-01T10:00:00.000Z',
    filePath: 'work/memos/artifact-1.md',
    ...overrides,
  };
}

describe('useUndoableArtifact bulk transaction behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates the full body before deleting so undo can restore it', async () => {
    const artifact = buildArtifact({ content: undefined });
    loadContentMock.mockResolvedValueOnce('Full body from disk');
    vi.mocked(deleteArtifact).mockResolvedValueOnce(undefined);

    const { undoableDelete } = useUndoableArtifact();
    await undoableDelete(artifact);

    expect(loadContentMock).toHaveBeenCalledWith(artifact.id);
    expect(deleteArtifact).toHaveBeenCalledWith(artifact.filePath);
    expect(pushUndoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'delete',
        artifact: expect.objectContaining({ content: 'Full body from disk' }),
      }),
    );
  });

  it('does not delete when the undo snapshot cannot be loaded', async () => {
    const artifact = buildArtifact({ content: undefined });
    loadContentMock.mockRejectedValueOnce(new Error('read failed'));

    const { undoableDelete } = useUndoableArtifact();
    await expect(undoableDelete(artifact)).rejects.toThrow('read failed');

    expect(deleteArtifact).not.toHaveBeenCalled();
    expect(pushUndoMock).not.toHaveBeenCalled();
  });

  it('rolls back applied bulk updates when an item fails and does not push undo', async () => {
    const previousA = buildArtifact({ id: 'a', filePath: 'work/memos/a.md', title: 'A', content: 'A0' });
    const previousB = buildArtifact({ id: 'b', filePath: 'work/memos/b.md', title: 'B', content: 'B0' });
    const nextA = { ...previousA, content: 'A1' };
    const nextB = { ...previousB, content: 'B1' };
    const persistedA = { ...nextA, updated: '2026-02-28T10:00:00.000Z' };

    const updateArtifactMock = vi.mocked(updateArtifact);
    updateArtifactMock
      .mockResolvedValueOnce(persistedA)
      .mockRejectedValueOnce(new Error('second update failed'))
      .mockResolvedValueOnce(previousA);

    const { undoableBulkUpdate } = useUndoableArtifact();

    await expect(
      undoableBulkUpdate([
        { filePath: previousA.filePath, previousArtifact: previousA, newArtifact: nextA },
        { filePath: previousB.filePath, previousArtifact: previousB, newArtifact: nextB },
      ])
    ).rejects.toThrow('Bulk update failed: second update failed');

    expect(updateArtifactMock).toHaveBeenNthCalledWith(1, previousA.filePath, nextA);
    expect(updateArtifactMock).toHaveBeenNthCalledWith(2, previousB.filePath, nextB);
    expect(updateArtifactMock).toHaveBeenNthCalledWith(3, persistedA.filePath, previousA);
    expect(pushUndoMock).not.toHaveBeenCalled();
  });

  it('rolls back applied bulk deletes when an item fails and does not push undo', async () => {
    const artifactA = buildArtifact({ id: 'a', filePath: 'work/memos/a.md', title: 'A' });
    const artifactB = buildArtifact({ id: 'b', filePath: 'work/memos/b.md', title: 'B' });

    const deleteArtifactMock = vi.mocked(deleteArtifact);
    const createArtifactMock = vi.mocked(createArtifact);

    deleteArtifactMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('second delete failed'));
    createArtifactMock.mockResolvedValueOnce(artifactA);

    const { undoableBulkDelete } = useUndoableArtifact();

    await expect(undoableBulkDelete([artifactA, artifactB])).rejects.toThrow(
      'Bulk delete failed: second delete failed'
    );

    expect(deleteArtifactMock).toHaveBeenNthCalledWith(1, artifactA.filePath);
    expect(deleteArtifactMock).toHaveBeenNthCalledWith(2, artifactB.filePath);
    expect(createArtifactMock).toHaveBeenCalledTimes(1);
    expect(pushUndoMock).not.toHaveBeenCalled();
  });

  it('pushes a single undo entry only after full bulk update success', async () => {
    const previousA = buildArtifact({ id: 'a', filePath: 'work/memos/a.md', title: 'A', content: 'A0' });
    const previousB = buildArtifact({ id: 'b', filePath: 'work/memos/b.md', title: 'B', content: 'B0' });
    const persistedA = { ...previousA, content: 'A1', updated: '2026-02-28T10:00:00.000Z' };
    const persistedB = { ...previousB, content: 'B1', updated: '2026-02-28T10:01:00.000Z' };

    const updateArtifactMock = vi.mocked(updateArtifact);
    updateArtifactMock
      .mockResolvedValueOnce(persistedA)
      .mockResolvedValueOnce(persistedB);

    const { undoableBulkUpdate } = useUndoableArtifact();

    const result = await undoableBulkUpdate([
      { filePath: previousA.filePath, previousArtifact: previousA, newArtifact: { ...previousA, content: 'A1' } },
      { filePath: previousB.filePath, previousArtifact: previousB, newArtifact: { ...previousB, content: 'B1' } },
    ]);

    expect(result).toEqual([persistedA, persistedB]);
    expect(pushUndoMock).toHaveBeenCalledTimes(1);
  });
});
