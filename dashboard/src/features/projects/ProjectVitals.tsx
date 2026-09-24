import type { ProjectWithStats } from '../../data/projects';
import { shortDate } from './format';

/**
 * The console line closing the masthead: a 2px rule inked in to the
 * completion fraction, then mono vitals. Risk carries through text tone,
 * never through the bar; dormancy reads as a warning, not an error.
 */
export function ProjectVitals({ project }: { project: ProjectWithStats }) {
  const progress = project.todoProgress;
  const isDormant = project.health === 'dormant' && !project.isClosed;

  return (
    <section className="chronicle-project-vitals" aria-label="Project vitals">
      {progress ? (
        <>
          <div
            className="chronicle-progress"
            role="progressbar"
            aria-valuenow={progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tasks completed"
          >
            <div className="chronicle-progress-fill" style={{ width: `${progress.percentage}%` }} />
          </div>
          <span className="chronicle-project-stat">
            {progress.done} / {progress.total} done
          </span>
        </>
      ) : (
        <span className="chronicle-project-stat">No tasks yet</span>
      )}
      {project.materials.length > 0 ? (
        <span className="chronicle-project-stat">
          {project.materials.length} material{project.materials.length === 1 ? '' : 's'}
        </span>
      ) : null}
      {project.overdueCount > 0 ? (
        <span className="chronicle-project-stat is-risk">{project.overdueCount} overdue</span>
      ) : null}
      {project.nextDue ? (
        <span className="chronicle-project-stat">Next due {shortDate(project.nextDue)}</span>
      ) : null}
      {project.flaggedCount > 0 ? (
        <span className="chronicle-project-stat">{project.flaggedCount} flagged</span>
      ) : null}
      {isDormant ? (
        <span className="chronicle-project-stat is-warn">
          Dormant{project.idleDays !== undefined ? ` · idle ${project.idleDays}d` : ''}
        </span>
      ) : null}
    </section>
  );
}
