import type { ArtifactSummary } from '@shared/types';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui';
import { archiveProject, deleteProject } from './projectActions';

interface DeleteProjectDialogProps {
  project: ArtifactSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Deleting is undoable, but archiving is usually what people mean, so it is offered first. */
export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete “{project.title}”?</DialogTitle>
          <DialogDescription>
            The project page is deleted. Its tasks and notes stay where they are.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => void archiveProject(project).then(close)}>Archive instead</Button>
          <Button variant="danger" onClick={() => void deleteProject(project).then((done) => done && close())}>
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
