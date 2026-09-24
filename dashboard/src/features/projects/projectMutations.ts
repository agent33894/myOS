import { useCallback } from 'react';
import { toast } from 'sonner';
import { formatLocalDate } from '@shared/date';
import type { ArtifactPatch, ArtifactSummary } from '@shared/types';
import { patch } from '../../data/gateway';
import { useDataStore } from '../../data/store';

/**
 * The stored project. ProjectWithStats carries derived fields (ledger,
 * health, linked artifacts) that are never written.
 */
export function projectBaseArtifact(projectId: string): ArtifactSummary | undefined {
  return Object.values(useDataStore.getState().byPath).find((artifact) => artifact.id === projectId);
}

/** Persist a field-level edit with undo; failures surface as a toast. */
async function applyEdit(item: ArtifactSummary, changes: ArtifactPatch, description: string): Promise<void> {
  try {
    await patch(item.filePath, changes, description);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save change');
  }
}

/**
 * Shared project lifecycle change: status pill, sidebar menu, delete dialog.
 * Marking a project done stamps completedDate; leaving done clears it.
 */
export function useProjectStatus() {
  const setProjectStatus = useCallback((projectId: string, status: string) => {
    const base = projectBaseArtifact(projectId);
    if (!base || String(base.status) === status) return;
    const changes: ArtifactPatch = { status: status as ArtifactSummary['status'] };
    if (status === 'done') changes.completedDate = formatLocalDate();
    else if (String(base.status) === 'done') changes.completedDate = null;
    void applyEdit(base, changes, `Mark project ${status}`);
  }, []);

  return { setProjectStatus };
}
