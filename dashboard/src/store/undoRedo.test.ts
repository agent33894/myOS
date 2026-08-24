import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArtifactStatus,
  ArtifactType,
  Domain,
  type Artifact,
} from '../types/artifacts';

vi.mock('@/gateways/artifactsGateway', () => ({
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
}));

import {
  createArtifact,
  deleteArtifact,
} from '@/gateways/artifactsGateway';
import { useArtifactsStore } from './artifacts';
import { useUndoRedoStore, type UndoableOperation } from './undoRedo';

function buildArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'artifact-1',
    title: 'Artifact 1',
    type: ArtifactType.MEMO,
    domain: Domain.WORK,
    tags: [],
    status: ArtifactStatus.ACTIVE,
    related: [],
    content: 'body',
    created: '2026-02-01',
    updated: '2026-02-01T10:00:00.000Z',
    filePath: 'work/memos/artifact-1.md',
    ...overrides,
  };
}

function setUndoStack(operation: UndoableOperation): void {
  useUndoRedoStore.setState({
    undoStack: [operation],
    redoStack: [],
    isUndoing: false,
    isRedoing: false,
  });
}

function setRedoStack(operation: UndoableOperation): void {
  useUndoRedoStore.setState({
    undoStack: [],
    redoStack: [operation],
    isUndoing: false,
    isRedoing: false,
  });
}

describe('undoRedo bulk transactional behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useArtifactsStore.setState({
      artifacts: [],
      contentCache: new Map(),
      isLoading: false,
      error: null,
    });
    useUndoRedoStore.setState({
      undoStack: [],
      redoStack: [],
      isUndoing: false,
      isRedoing: false,
    });
  });

  it('undoes bulk delete atomically with rollback on failure', async () => {
    const artifactA = buildArtifact({ id: 'a', filePath: 'work/memos/a.md' });
    const artifactB = buildArtifact({ id: 'b', filePath: 'work/memos/b.md' });

    setUndoStack({
      id: 'undo-delete-1',
      type: 'delete',
      timestamp: Date.now(),
      description: 'Undo bulk delete',
      artifact: artifactA,
      bulkArtifacts: [artifactA, artifactB],
    });

    const createArtifactMock = vi.mocked(createArtifact);
    const deleteArtifactMock = vi.mocked(deleteArtifact);

    createArtifactMock
      .mockResolvedValueOnce(artifactA)
      .mockRejectedValueOnce(new Error('recreate B failed'));
    deleteArtifactMock.mockResolvedValueOnce(undefined);

    const result = await useUndoRedoStore.getState().undo();

    expect(result).toBe(false);
    expect(createArtifactMock).toHaveBeenCalledTimes(2);
    expect(deleteArtifactMock).toHaveBeenCalledTimes(1);
    expect(deleteArtifactMock).toHaveBeenCalledWith(artifactA.filePath);
    expect(useArtifactsStore.getState().artifacts).toEqual([]);
    expect(useUndoRedoStore.getState().undoStack).toHaveLength(1);
    expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
  });

  it('redoes bulk create atomically with rollback on failure', async () => {
    const artifactA = buildArtifact({ id: 'a', filePath: 'work/memos/a.md' });
    const artifactB = buildArtifact({ id: 'b', filePath: 'work/memos/b.md' });

    setRedoStack({
      id: 'redo-create-1',
      type: 'create',
      timestamp: Date.now(),
      description: 'Redo bulk create',
      artifact: artifactA,
      bulkArtifacts: [artifactA, artifactB],
    });

    const createArtifactMock = vi.mocked(createArtifact);
    const deleteArtifactMock = vi.mocked(deleteArtifact);

    createArtifactMock
      .mockResolvedValueOnce(artifactA)
      .mockRejectedValueOnce(new Error('create B failed'));
    deleteArtifactMock.mockResolvedValueOnce(undefined);

    const result = await useUndoRedoStore.getState().redo();

    expect(result).toBe(false);
    expect(createArtifactMock).toHaveBeenCalledTimes(2);
    expect(deleteArtifactMock).toHaveBeenCalledTimes(1);
    expect(deleteArtifactMock).toHaveBeenCalledWith(artifactA.filePath);
    expect(useArtifactsStore.getState().artifacts).toEqual([]);
    expect(useUndoRedoStore.getState().redoStack).toHaveLength(1);
    expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);
  });
});
