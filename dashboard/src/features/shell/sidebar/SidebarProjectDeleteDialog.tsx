import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import type { ArtifactSummary } from '@shared/types';
import { remove as removeArtifact } from '../../../data/gateway';
import { useProjectStatus } from '../../projects/projectMutations';

interface SidebarProjectDeleteDialogProps {
  project: ArtifactSummary;
  isOpen: boolean;
  onClose: () => void;
}

/** Confirm project deletion, offering Archive as the gentler exit. Delete stays ⌘Z-restorable. */
export function SidebarProjectDeleteDialog({ project, isOpen, onClose }: SidebarProjectDeleteDialogProps) {
  const { setProjectStatus } = useProjectStatus();

  const archive = () => {
    setProjectStatus(project.id, 'archived');
    onClose();
  };

  const remove = async () => {
    try {
      await removeArtifact(project.filePath, `Delete project: ${project.title}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete project');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${project.title}?`}
      maxWidth="max-w-md"
      footer={
        <>
          <Button onClick={archive}>Archive instead</Button>
          <Button variant="destructive" onClick={() => void remove()}>
            Delete project
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        The project file is deleted; linked tasks and artifacts are kept and become unfiled.
      </p>
    </Modal>
  );
}
