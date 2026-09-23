import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Artifact } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { useTasksStore } from '../../store/tasks';
import { useUndoRedoStore } from '../../store/undoRedo';
import { useUndoableArtifact } from '../../hooks/useUndoableArtifact';
import Modal from '../ui/Modal';
import { Button } from '../ui/button';
import { primaryModifier } from '../../utils/platform';

interface ArtifactDeleteMenuProps {
  artifact: Artifact;
  disabled?: boolean;
  onDeleteStart?: () => void;
  onDeleteFailure?: () => void;
  onDeleted?: () => void;
}

/** A quiet document action with an explicit, undoable destructive path. */
export function ArtifactDeleteMenu({
  artifact,
  disabled = false,
  onDeleteStart,
  onDeleteFailure,
  onDeleted,
}: ArtifactDeleteMenuProps) {
  const removeArtifact = useArtifactsStore((state) => state.removeArtifact);
  const { undoableDelete } = useUndoableArtifact();
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async () => {
    onDeleteStart?.();
    setIsDeleting(true);
    try {
      await undoableDelete(artifact, `Delete ${artifact.type}: ${artifact.title}`);
      removeArtifact(artifact.filePath);
      useTasksStore.getState().refreshTasks();
      setConfirming(false);
      onDeleted?.();
      toast.success(`Deleted “${artifact.title}”`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void useUndoRedoStore.getState().undo().then((success) => {
              if (!success) {
                toast.error('Could not restore the artifact');
                return;
              }
              useTasksStore.getState().refreshTasks();
              toast.success(`Restored “${artifact.title}”`);
            });
          },
        },
      });
    } catch (error) {
      onDeleteFailure?.();
      toast.error(error instanceof Error ? error.message : 'Could not delete artifact');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="chronicle-detail-more"
        aria-label={`Delete ${artifact.title}`}
        title="Delete artifact"
        disabled={disabled || isDeleting}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <Modal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete “${artifact.title}”?`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void remove()}
              disabled={disabled || isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete artifact'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This removes the file from your workspace. You can restore it immediately with Undo or {primaryModifier}Z.
        </p>
      </Modal>
    </>
  );
}
