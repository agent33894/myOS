import { create } from 'zustand';
import type { Artifact } from '../types/artifacts';
import { useArtifactsStore } from './artifacts';
import { createArtifact, updateArtifact, deleteArtifact } from '@/gateways/artifactsGateway';
import type { ArtifactDraft } from '@/gateways/artifactsGateway';

/**
 * Convert an Artifact to an ArtifactDraft for recreation via the gateway.
 * This preserves all artifact fields except computed ones like filePath, created, updated.
 */
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

const MAX_UNDO_STACK_SIZE = 50;
const DEBOUNCE_WINDOW_MS = 1000;

export type UndoableOperationType = 'create' | 'update' | 'delete';

export interface UndoableOperation {
  id: string;
  type: UndoableOperationType;
  timestamp: number;
  description: string;
  // For create: artifact to delete on undo
  // For delete: artifact to recreate on undo
  // For update: previous artifact state
  artifact: Artifact;
  // For update: the new state (for redo after undo)
  newArtifact?: Artifact;
  // For bulk operations
  bulkArtifacts?: Artifact[];
  bulkNewArtifacts?: Artifact[];
}

interface UndoRedoState {
  undoStack: UndoableOperation[];
  redoStack: UndoableOperation[];
  isUndoing: boolean;
  isRedoing: boolean;

  // Actions
  pushUndo: (op: Omit<UndoableOperation, 'id' | 'timestamp'>) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  clearHistoryForArtifact: (filePath: string) => void;
  getLastOperation: () => UndoableOperation | null;
}

// Generate unique ID for operations
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface BatchStep {
  apply: () => Promise<void>;
  rollback: () => Promise<void>;
}

async function executeBatchSteps(label: string, steps: BatchStep[]): Promise<void> {
  const appliedSteps: BatchStep[] = [];
  try {
    for (const step of steps) {
      await step.apply();
      appliedSteps.push(step);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const step of [...appliedSteps].reverse()) {
      try {
        await step.rollback();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    if (rollbackErrors.length === 0) {
      throw new Error(`${label} failed: ${message}`);
    }

    const rollbackMessage = rollbackErrors
      .map((rollbackError, index) => `rollback-${index + 1}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
      .join('; ');

    throw new Error(
      `${label} failed: ${message}. Rollback encountered ${rollbackErrors.length} error(s): ${rollbackMessage}`
    );
  }
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isUndoing: false,
  isRedoing: false,

  pushUndo: (op) => {
    const state = get();
    const now = Date.now();

    // Check for debouncing: if last operation was an update to the same artifact within DEBOUNCE_WINDOW_MS
    const lastOp = state.undoStack[state.undoStack.length - 1];
    if (
      lastOp &&
      lastOp.type === 'update' &&
      op.type === 'update' &&
      lastOp.artifact.filePath === op.artifact.filePath &&
      now - lastOp.timestamp < DEBOUNCE_WINDOW_MS
    ) {
      // Update the last operation's newArtifact instead of creating a new entry
      const updatedStack = [...state.undoStack];
      updatedStack[updatedStack.length - 1] = {
        ...lastOp,
        newArtifact: op.newArtifact,
        timestamp: now,
      };
      set({ undoStack: updatedStack });
      return;
    }

    const newOp: UndoableOperation = {
      ...op,
      id: generateId(),
      timestamp: now,
    };

    set((state) => {
      const newStack = [...state.undoStack, newOp];
      // Trim stack if it exceeds max size
      if (newStack.length > MAX_UNDO_STACK_SIZE) {
        newStack.shift();
      }
      return {
        undoStack: newStack,
        redoStack: [], // Clear redo stack on new operation
      };
    });
  },

  undo: async () => {
    const state = get();
    if (state.undoStack.length === 0 || state.isUndoing) {
      return false;
    }

    const operation = state.undoStack[state.undoStack.length - 1];
    set({ isUndoing: true });

    try {
      // Execute the reverse operation via IPC and update store
      const artifactsStore = useArtifactsStore.getState();

      switch (operation.type) {
        case 'create':
          // Undo create = delete the artifact
          if (operation.bulkArtifacts) {
            await executeBatchSteps(
              'Undo create (bulk delete)',
              operation.bulkArtifacts.map((artifact) => ({
                apply: async () => {
                  await deleteArtifact(artifact.filePath);
                  artifactsStore.removeArtifact(artifact.filePath);
                },
                rollback: async () => {
                  const recreated = await createArtifact(artifactToDraft(artifact));
                  artifactsStore.addArtifact(recreated);
                },
              }))
            );
          } else {
            await deleteArtifact(operation.artifact.filePath);
            artifactsStore.removeArtifact(operation.artifact.filePath);
          }
          break;

        case 'delete':
          // Undo delete = recreate the artifact
          if (operation.bulkArtifacts) {
            await executeBatchSteps(
              'Undo delete (bulk recreate)',
              operation.bulkArtifacts.map((artifact) => {
                let createdArtifact: Artifact | null = null;
                return {
                  apply: async () => {
                    createdArtifact = await createArtifact(artifactToDraft(artifact));
                    artifactsStore.addArtifact(createdArtifact);
                  },
                  rollback: async () => {
                    const filePath = createdArtifact?.filePath ?? artifact.filePath;
                    await deleteArtifact(filePath);
                    artifactsStore.removeArtifact(filePath);
                  },
                };
              })
            );
          } else {
            const draft = artifactToDraft(operation.artifact);
            const created = await createArtifact(draft);
            artifactsStore.addArtifact(created);
          }
          break;

        case 'update':
          // Undo update = restore previous state
          if (operation.bulkArtifacts && operation.bulkNewArtifacts) {
            await executeBatchSteps(
              'Undo update (bulk restore)',
              operation.bulkArtifacts.map((previousArtifact, index) => {
                const nextArtifact = operation.bulkNewArtifacts?.[index];
                return {
                  apply: async () => {
                    const restored = await updateArtifact(previousArtifact.filePath, previousArtifact);
                    artifactsStore.updateArtifact(restored);
                  },
                  rollback: async () => {
                    if (!nextArtifact) return;
                    const reapplied = await updateArtifact(nextArtifact.filePath, nextArtifact);
                    artifactsStore.updateArtifact(reapplied);
                  },
                };
              })
            );
          } else {
            const restoredArtifact = await updateArtifact(
              operation.artifact.filePath,
              operation.artifact
            );
            artifactsStore.updateArtifact(restoredArtifact);
          }
          break;
      }

      // Move operation to redo stack
      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, operation],
        isUndoing: false,
      }));

      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      set({ isUndoing: false });
      return false;
    }
  },

  redo: async () => {
    const state = get();
    if (state.redoStack.length === 0 || state.isRedoing) {
      return false;
    }

    const operation = state.redoStack[state.redoStack.length - 1];
    set({ isRedoing: true });

    try {
      // Execute the forward operation via IPC and update store
      const artifactsStore = useArtifactsStore.getState();

      switch (operation.type) {
        case 'create':
          // Redo create = recreate the artifact
          if (operation.bulkArtifacts) {
            await executeBatchSteps(
              'Redo create (bulk recreate)',
              operation.bulkArtifacts.map((artifact) => {
                let createdArtifact: Artifact | null = null;
                return {
                  apply: async () => {
                    createdArtifact = await createArtifact(artifactToDraft(artifact));
                    artifactsStore.addArtifact(createdArtifact);
                  },
                  rollback: async () => {
                    const filePath = createdArtifact?.filePath ?? artifact.filePath;
                    await deleteArtifact(filePath);
                    artifactsStore.removeArtifact(filePath);
                  },
                };
              })
            );
          } else {
            const draft = artifactToDraft(operation.artifact);
            const created = await createArtifact(draft);
            artifactsStore.addArtifact(created);
          }
          break;

        case 'delete':
          // Redo delete = delete the artifact again
          if (operation.bulkArtifacts) {
            await executeBatchSteps(
              'Redo delete (bulk delete)',
              operation.bulkArtifacts.map((artifact) => ({
                apply: async () => {
                  await deleteArtifact(artifact.filePath);
                  artifactsStore.removeArtifact(artifact.filePath);
                },
                rollback: async () => {
                  const recreated = await createArtifact(artifactToDraft(artifact));
                  artifactsStore.addArtifact(recreated);
                },
              }))
            );
          } else {
            await deleteArtifact(operation.artifact.filePath);
            artifactsStore.removeArtifact(operation.artifact.filePath);
          }
          break;

        case 'update':
          // Redo update = apply the new state
          if (operation.bulkArtifacts && operation.bulkNewArtifacts) {
            await executeBatchSteps(
              'Redo update (bulk apply)',
              operation.bulkNewArtifacts.map((nextArtifact, index) => {
                const previousArtifact = operation.bulkArtifacts?.[index];
                return {
                  apply: async () => {
                    const updated = await updateArtifact(nextArtifact.filePath, nextArtifact);
                    artifactsStore.updateArtifact(updated);
                  },
                  rollback: async () => {
                    if (!previousArtifact) return;
                    const restored = await updateArtifact(previousArtifact.filePath, previousArtifact);
                    artifactsStore.updateArtifact(restored);
                  },
                };
              })
            );
          } else if (operation.newArtifact) {
            const updatedArtifact = await updateArtifact(
              operation.newArtifact.filePath,
              operation.newArtifact
            );
            artifactsStore.updateArtifact(updatedArtifact);
          }
          break;
      }

      // Move operation back to undo stack
      set((state) => ({
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, operation],
        isRedoing: false,
      }));

      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      set({ isRedoing: false });
      return false;
    }
  },

  canUndo: () => {
    const state = get();
    return state.undoStack.length > 0 && !state.isUndoing;
  },

  canRedo: () => {
    const state = get();
    return state.redoStack.length > 0 && !state.isRedoing;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
    });
  },

  clearHistoryForArtifact: (filePath: string) => {
    set((state) => ({
      undoStack: state.undoStack.filter(
        (op) =>
          op.artifact.filePath !== filePath &&
          !op.bulkArtifacts?.some((a) => a.filePath === filePath)
      ),
      redoStack: state.redoStack.filter(
        (op) =>
          op.artifact.filePath !== filePath &&
          !op.bulkArtifacts?.some((a) => a.filePath === filePath)
      ),
    }));
  },

  getLastOperation: () => {
    const state = get();
    return state.undoStack[state.undoStack.length - 1] || null;
  },
}));
