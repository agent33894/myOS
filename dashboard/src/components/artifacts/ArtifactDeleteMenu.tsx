import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ArtifactSummary } from '@shared/types';
import { remove as removeArtifact } from '../../data/gateway';
import { undo } from '../../data/undo';
import Modal from '../ui/Modal';
import { Button } from '../ui/button';
import { primaryModifier } from '../../utils/platform';

interface ArtifactDeleteMenuProps {
  artifact: ArtifactSummary;
  disabled?: boolean;
  /** Runs before deleting, e.g. to save pending edits so undo restores them. */
  onDeleteStart?: () => Promise<void> | void;
  onDeleted?: () => void;
}

/** A quiet document action with an explicit, undoable destructive path. */
export function ArtifactDeleteMenu({
  artifact,
  disabled = false,
  onDeleteStart,
  onDeleted,
}: ArtifactDeleteMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async () => {
    setIsDeleting(true);
    try {
      await onDeleteStart?.();
      await removeArtifact(artifact.filePath);
      setConfirming(false);
      onDeleted?.();
      toast.success(`Deleted “${artifact.title}”`, {
        action: {
          label: 'Undo',
          onClick: () =>
            void undo().then(
              () => toast.success(`Restored “${artifact.title}”`),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'Could not restore the artifact'),
            ),
        },
      });
    } catch (error) {
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
