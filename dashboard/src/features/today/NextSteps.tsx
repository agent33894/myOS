import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toProjectUrl } from '../../app/navigation';
import { Button, ListRow, SectionHeader } from '../../ui';
import { makeTaskFromNext, useNextSteps } from '../projects/nextStep';
import { attempt, toastWithUndo } from '../tasks/actions';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor } from '../tasks/projectRefs';

/**
 * Each active project's next step that is not a task yet. "Make task" adds it
 * to the project and to today's plan; the row then leaves this list.
 */
export function NextSteps() {
  const navigate = useNavigate();
  const steps = useNextSteps();
  if (steps.length === 0) return null;

  return (
    <section aria-label="Next steps">
      <SectionHeader title="Next steps" count={steps.length} className="px-2" />
      <div role="list" className="flex flex-col">
        {steps.map((project) => (
          <div role="listitem" key={project.filePath}>
            <ListRow
              onActivate={() => navigate(toProjectUrl(project.id))}
              leading={
                <span className="grid size-6 place-items-center">
                  <ProjectDot color={projectColor(project)} />
                </span>
              }
              meta={<span className="hidden sm:inline">{project.title}</span>}
              trailing={
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon={Plus}
                  onClick={(event) => {
                    event.stopPropagation();
                    attempt(makeTaskFromNext(project, { plan: true }).then(() => toastWithUndo('Made a task · in today’s plan')));
                  }}
                >
                  Make task
                </Button>
              }
              className="min-h-10 gap-2 px-2"
            >
              {project.next}
            </ListRow>
          </div>
        ))}
      </div>
    </section>
  );
}
