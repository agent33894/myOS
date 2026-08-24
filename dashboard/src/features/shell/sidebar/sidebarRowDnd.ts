import { useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import type { Artifact } from '../../../types/artifacts';
import { ArtifactType } from '../../../types/artifacts';
import { useArtifactsStore } from '../../../store/artifacts';
import { useUndoableArtifact } from '../../../hooks/useUndoableArtifact';
import { dragHasArtifact, readArtifactDragData } from '../../../lib/artifactDnd';
import { useArtifactEdit } from '../../projects/projectMutations';
import { localDateStamp } from '../../today/todaySelectors';
import { reorderWrites } from './sidebarProjectsModel';

/** Pinned-row reorder drags carry the source project id under this private mime. */
const PROJECT_REORDER_MIME = 'application/x-myos-project-reorder';

/**
 * Row drag behavior: pinned rows drag to reorder among themselves; every row
 * accepts artifact drops (Library/Unfiled/Today rows) to file the artifact
 * under this project by rename-stable id. The reorder mime never lights the
 * artifact drop-target treatment.
 */
export function useSidebarRowDnd(project: Artifact, pinnedRows: Artifact[]) {
  const { applyEdit } = useArtifactEdit();
  const { undoableBulkUpdate } = useUndoableArtifact();
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const canReorder = project.pinned === true;

  const applyReorder = async (fromId: string) => {
    const writes = reorderWrites(pinnedRows, fromId, project.id);
    if (writes.length === 0) return;
    const stamp = localDateStamp();
    const { artifacts, updateArtifact } = useArtifactsStore.getState();
    const updates = writes.flatMap(({ id, order }) => {
      const base = artifacts.find((artifact) => artifact.id === id);
      if (!base) return [];
      return [{ filePath: base.filePath, previousArtifact: base, newArtifact: { ...base, order, updated: stamp } }];
    });
    try {
      const persisted = await undoableBulkUpdate(updates, 'Reorder pinned projects');
      persisted.forEach(updateArtifact);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reorder projects');
    }
  };

  const fileArtifact = (event: DragEvent) => {
    const payload = readArtifactDragData(event);
    if (!payload) return;
    const base = useArtifactsStore.getState().artifacts.find((a) => a.id === payload.id);
    if (!base || base.id === project.id || base.project === project.id) return;
    // Projects don't nest — a `project:` link on a project artifact is junk data.
    if (base.type === ArtifactType.PROJECT) return;
    void applyEdit(base, { project: project.id }, `File under ${project.title}`);
  };

  const handlers = {
    onDragStart: (event: DragEvent) => {
      if (!canReorder) return;
      event.dataTransfer.setData(PROJECT_REORDER_MIME, project.id);
      event.dataTransfer.effectAllowed = 'move';
      setIsDragging(true);
    },
    onDragEnd: () => setIsDragging(false),
    onDragOver: (event: DragEvent) => {
      if (dragHasArtifact(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'link';
        setIsDropTarget(true);
        return;
      }
      if (canReorder && event.dataTransfer.types.includes(PROJECT_REORDER_MIME)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setIsDropTarget(false);
      }
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setIsDropTarget(false);
      if (dragHasArtifact(event)) {
        fileArtifact(event);
        return;
      }
      const fromId = event.dataTransfer.getData(PROJECT_REORDER_MIME);
      if (fromId && canReorder) void applyReorder(fromId);
    },
  };

  return { isDragging, isDropTarget, canReorder, handlers };
}
