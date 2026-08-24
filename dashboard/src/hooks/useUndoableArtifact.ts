import { useCallback } from 'react';
import { useUndoRedoStore } from '../store/undoRedo';
import { useArtifactsStore } from '../store/artifacts';
import { createArtifact, updateArtifact, deleteArtifact } from '@/gateways/artifactsGateway';
import type { Artifact } from '../types/artifacts';
import type { ArtifactDraft } from '@/gateways/artifactsGateway';

function artifactToDraft(artifact: Artifact): ArtifactDraft {
  return {
    id: artifact.id,
    title: artifact.title,
    type: artifact.type,
    domain: artifact.domain,
    tags: artifact.tags,
    status: artifact.status,
    related: artifact.related,
    content: artifact.content,
    project: artifact.project,
    priority: artifact.priority,
    due: artifact.due,
    parentId: artifact.parentId,
    deferDate: artifact.deferDate,
    estimatedMinutes: artifact.estimatedMinutes,
    sequential: artifact.sequential,
    flagged: artifact.flagged,
    completedDate: artifact.completedDate,
    repeatRule: artifact.repeatRule,
    localPath: artifact.localPath,
    repoUrl: artifact.repoUrl,
    isExternalProject: artifact.isExternalProject,
    analysisData: artifact.analysisData,
    sources: artifact.sources,
  };
}

function buildBulkMutationError(
  operation: string,
  cause: unknown,
  rollbackErrors: unknown[]
): Error {
  const rootMessage = cause instanceof Error ? cause.message : String(cause);
  if (rollbackErrors.length === 0) {
    return new Error(`${operation} failed: ${rootMessage}`);
  }

  const rollbackMessage = rollbackErrors
    .map((error, index) => `rollback-${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
    .join('; ');
  return new Error(
    `${operation} failed: ${rootMessage}. Rollback encountered ${rollbackErrors.length} error(s): ${rollbackMessage}`
  );
}

/**
 * Deletion undo must carry the body, not just the metadata returned by the
 * index. Hydrate every snapshot before the first destructive write so a read
 * failure leaves the artifact untouched.
 */
async function hydrateArtifactForDelete(artifact: Artifact): Promise<Artifact> {
  if (typeof artifact.content === 'string') return artifact;
  const content = await useArtifactsStore.getState().loadContent(artifact.id);
  return { ...artifact, content };
}

/**
 * Hook providing undoable versions of artifact operations.
 *
 * This hook wraps artifact CRUD operations and automatically pushes
 * the appropriate undo operations to the undo stack.
 *
 * The implementation is state-agnostic - it calls the artifacts gateway
 * and relies on the file watcher to update the UI state. This keeps undo
 * operations independent from the current Zustand store shape.
 */
export function useUndoableArtifact() {
  /**
   * Create an artifact with undo support.
   * To undo a create, we delete the artifact.
   * Note: The artifact should have filePath already set before calling this.
   */
  const undoableCreate = useCallback(
    async (artifact: Artifact, description?: string) => {
      // Create the artifact via gateway
      const createdArtifact = await createArtifact(artifact);

      // Push undo operation (delete) - use getState() for safe access
      useUndoRedoStore.getState().pushUndo({
        type: 'create',
        description:
          description || `Create ${createdArtifact.type}: ${createdArtifact.title}`,
        artifact: createdArtifact,
      });
      return createdArtifact;
    },
    []
  );

  /**
   * Update an artifact with undo support.
   * To undo an update, we restore the previous state.
   */
  const undoableUpdate = useCallback(
    async (
      filePath: string,
      previousArtifact: Artifact,
      newArtifact: Artifact,
      description?: string
    ) => {
      // Update the artifact via gateway
      const updatedArtifact = await updateArtifact(filePath, newArtifact);

      // Push undo operation (restore previous) - use getState() for safe access
      useUndoRedoStore.getState().pushUndo({
        type: 'update',
        description:
          description || `Update ${previousArtifact.type}: ${previousArtifact.title}`,
        artifact: previousArtifact,
        newArtifact: updatedArtifact,
      });
      return updatedArtifact;
    },
    []
  );

  /**
   * Delete an artifact with undo support.
   * To undo a delete, we recreate the artifact.
   */
  const undoableDelete = useCallback(
    async (artifact: Artifact, description?: string) => {
      const snapshot = await hydrateArtifactForDelete(artifact);

      // Delete the artifact via gateway
      await deleteArtifact(artifact.filePath);

      // Push undo operation (recreate) - use getState() for safe access
      useUndoRedoStore.getState().pushUndo({
        type: 'delete',
        description: description || `Delete ${artifact.type}: ${artifact.title}`,
        artifact: snapshot,
      });
    },
    []
  );

  /**
   * Bulk update artifacts with undo support.
   * All updates are grouped as a single undo operation.
   */
  const undoableBulkUpdate = useCallback(
    async (
      updates: Array<{
        filePath: string;
        previousArtifact: Artifact;
        newArtifact: Artifact;
      }>,
      description?: string
    ) => {
      if (updates.length === 0) {
        return [];
      }

      const appliedUpdates: Array<{
        filePath: string;
        previousArtifact: Artifact;
        updatedArtifact: Artifact;
      }> = [];

      // Apply all updates via gateway
      try {
        for (const { filePath, previousArtifact, newArtifact } of updates) {
          const updatedArtifact = await updateArtifact(filePath, newArtifact);
          appliedUpdates.push({
            filePath,
            previousArtifact,
            updatedArtifact,
          });
        }
      } catch (error) {
        const rollbackErrors: unknown[] = [];
        for (const applied of [...appliedUpdates].reverse()) {
          try {
            await updateArtifact(applied.updatedArtifact.filePath, applied.previousArtifact);
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }

        throw buildBulkMutationError('Bulk update', error, rollbackErrors);
      }

      // Push single undo operation for all updates - use getState() for safe access
      useUndoRedoStore.getState().pushUndo({
        type: 'update',
        description: description || `Update ${updates.length} items`,
        artifact: updates[0].previousArtifact, // Primary artifact for reference
        newArtifact: appliedUpdates[0].updatedArtifact,
        bulkArtifacts: updates.map((u) => u.previousArtifact),
        bulkNewArtifacts: appliedUpdates.map((u) => u.updatedArtifact),
      });
      return appliedUpdates.map((u) => u.updatedArtifact);
    },
    []
  );

  /**
   * Bulk delete artifacts with undo support.
   * All deletes are grouped as a single undo operation.
   */
  const undoableBulkDelete = useCallback(
    async (artifacts: Artifact[], description?: string) => {
      if (artifacts.length === 0) {
        return;
      }

      const snapshots = await Promise.all(artifacts.map(hydrateArtifactForDelete));
      const deletedArtifacts: Artifact[] = [];

      // Delete all artifacts via gateway
      try {
        for (const artifact of snapshots) {
          await deleteArtifact(artifact.filePath);
          deletedArtifacts.push(artifact);
        }
      } catch (error) {
        const rollbackErrors: unknown[] = [];
        for (const artifact of [...deletedArtifacts].reverse()) {
          try {
            await createArtifact(artifactToDraft(artifact));
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }

        throw buildBulkMutationError('Bulk delete', error, rollbackErrors);
      }

      // Push single undo operation for all deletes - use getState() for safe access
      useUndoRedoStore.getState().pushUndo({
        type: 'delete',
        description: description || `Delete ${artifacts.length} items`,
        artifact: deletedArtifacts[0], // Primary artifact for reference
        bulkArtifacts: deletedArtifacts,
      });
    },
    []
  );

  return {
    undoableCreate,
    undoableUpdate,
    undoableDelete,
    undoableBulkUpdate,
    undoableBulkDelete,
  };
}
