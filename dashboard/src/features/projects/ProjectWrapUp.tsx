import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ArtifactStatus } from '@shared/types';
import type { ProjectWithStats } from '../../data/projects';
import { Button, Icon } from '../../ui';
import { useProjectStatus } from './projectMutations';

/** True when an active project has finished work and nothing left open, here or in its notes. */
const isReadyToWrapUp = (project: ProjectWithStats) =>
  project.status === ArtifactStatus.ACTIVE &&
  project.openTodos.length === 0 &&
  project.checks.length === 0 &&
  project.doneTodos.length > 0;

/**
 * Endings are features: when every task is done, offer to mark the project done.
 * It is only an offer; "Not yet" hides it until the page is opened again.
 */
export function ProjectWrapUp({ project }: { project: ProjectWithStats }) {
  const { setProjectStatus } = useProjectStatus();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !isReadyToWrapUp(project)) return null;
  const count = project.doneTodos.length;

  return (
    <div role="status" className="mt-8 flex flex-wrap items-center gap-3 rounded-lg bg-success-soft px-4 py-3 animate-slide-up">
      <Icon icon={CheckCircle2} className="text-success" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-text">Every task here is done.</p>
        <p className="text-sm text-text-secondary">
          {count === 1 ? '1 task finished.' : `${count} tasks finished.`} Mark the project done when it’s wrapped up.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not yet
        </Button>
        <Button size="sm" variant="primary" onClick={() => setProjectStatus(project.id, ArtifactStatus.DONE)}>
          Mark project done
        </Button>
      </div>
    </div>
  );
}
