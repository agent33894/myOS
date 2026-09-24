import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectWithStats } from '../../data/projects';
import type { ArtifactSummary } from '@shared/types';
import { toggleComplete } from '../../data/gateway';
import { cn } from '../../lib/utils';
import { shortDate } from './format';
import { ProjectQuickAdd } from './ProjectQuickAdd';
import { ProjectTaskRow } from './ProjectTaskRow';

interface ProjectTasksSectionProps {
  project: ProjectWithStats;
  /** Opening a task keeps it inside the workbench — the caller owns selection. */
  onOpen: (task: ArtifactSummary) => void;
  selectedPath?: string | null;
}

/** Open tasks with undoable completion, the quick-add row, and the done record. */
export function ProjectTasksSection({ project, onOpen, selectedPath }: ProjectTasksSectionProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  // Collapsed by default so materials and the brief stay above the fold.
  const [showDone, setShowDone] = useState(false);

  const { openTodos, doneTodos, todoProgress } = project;
  const doneVisible = showDone;

  const complete = async (task: ArtifactSummary) => {
    setCompletingId(task.id);
    try {
      await toggleComplete(task);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete task');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <section className="chronicle-project-tasks" aria-label="Project tasks">
      {openTodos.length > 0 ? (
        <div className="chronicle-section-label">Open · {openTodos.length}</div>
      ) : todoProgress ? (
        <p className="chronicle-project-alldone">All {todoProgress.total} tasks done.</p>
      ) : (
        <div className="chronicle-section-label">Tasks</div>
      )}

      {openTodos.map((task) => (
        <ProjectTaskRow
          key={task.id}
          task={task}
          isCompleting={completingId === task.id}
          isSelected={selectedPath === task.filePath}
          onComplete={(t) => void complete(t)}
          onOpen={onOpen}
        />
      ))}

      <ProjectQuickAdd project={project} />

      {doneTodos.length > 0 ? (
        <>
          <div className="chronicle-project-donebar">
            <span className="chronicle-section-label">Done · {doneTodos.length}</span>
            <button
              className="chronicle-heading-action active:scale-[0.98]"
              onClick={() => setShowDone(!doneVisible)}
            >
              {doneVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          {doneVisible
            ? doneTodos.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'chronicle-task-row is-done-record',
                    selectedPath === task.filePath && 'is-selected',
                  )}
                >
                  <span className="chronicle-capture-glyph" aria-hidden="true">
                    <Check className="h-3 w-3" />
                  </span>
                  <button
                    className="chronicle-row-body active:scale-[0.98]"
                    onClick={() => onOpen(task)}
                  >
                    <span className="chronicle-row-title">{task.title}</span>
                    <span className="chronicle-row-meta">
                      {shortDate(task.completedDate) ?? shortDate(task.updated) ?? 'Done'}
                    </span>
                  </button>
                </div>
              ))
            : null}
        </>
      ) : null}
    </section>
  );
}
