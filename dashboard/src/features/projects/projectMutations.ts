import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Artifact } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { useUndoableArtifact } from '../../hooks/useUndoableArtifact';
import { localDateStamp } from '../today/todaySelectors';

/**
 * The raw store artifact for a project. ProjectWithStats carries derived
 * fields (ledger, health, linked artifacts) that must never be persisted.
 */
export function projectBaseArtifact(projectId: string): Artifact | undefined {
  return useArtifactsStore.getState().artifacts.find((a) => a.id === projectId);
}

/**
 * Shared project lifecycle change: status pill, sidebar menu, delete dialog.
 * Marking a project done stamps completedDate.
 */
export function useProjectStatus() {
  const { applyEdit } = useArtifactEdit();

  const setProjectStatus = useCallback(
    (projectId: string, status: string) => {
      const base = projectBaseArtifact(projectId);
      if (!base || String(base.status ?? 'active') === status) return;
      const changes: Partial<Artifact> = { status: status as Artifact['status'] };
      if (status === 'done') changes.completedDate = localDateStamp();
      void applyEdit(base, changes, `Mark project ${status}`);
    },
    [applyEdit],
  );

  return { setProjectStatus };
}

/** Persist a field-level artifact edit with undo, then update the store. */
export function useArtifactEdit() {
  const updateStoreArtifact = useArtifactsStore((state) => state.updateArtifact);
  const { undoableUpdate } = useUndoableArtifact();

  const applyEdit = useCallback(
    async (base: Artifact, changes: Partial<Artifact>, description: string) => {
      const next: Artifact = { ...base, ...changes, updated: localDateStamp() };
      try {
        const persisted = await undoableUpdate(base.filePath, base, next, description);
        updateStoreArtifact(persisted);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save change');
      }
    },
    [undoableUpdate, updateStoreArtifact],
  );

  return { applyEdit };
}
