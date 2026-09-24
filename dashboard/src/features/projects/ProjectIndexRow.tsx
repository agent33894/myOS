import { projectSwatchFor } from '@shared/design-system/tokens';
import type { ProjectWithStats } from '../../data/projects';
import { cn } from '../../lib/utils';
import { shortDate } from './format';

export type ProjectIndexGroup = 'active' | 'dormant' | 'closed';

/** The section heading already names the group — rows only garnish what differs. */
function stateLabel(project: ProjectWithStats, group: ProjectIndexGroup): string | null {
  if (group === 'closed') {
    return String(project.status ?? 'archived').replace(/^./, (c) => c.toUpperCase());
  }
  if (group === 'active' && project.health === 'at-risk') return 'At-risk';
  return null;
}

interface ProjectIndexRowProps {
  project: ProjectWithStats;
  group: ProjectIndexGroup;
  isHighlighted: boolean;
  onOpen: (projectId: string) => void;
}

/** One roster line on the index: project dot, title, state, and the ledger. */
export function ProjectIndexRow({ project, group, isHighlighted, onOpen }: ProjectIndexRowProps) {
  const ink = projectSwatchFor(project.title, project.swatch).hex;
  const progress = project.todoProgress;
  const label = stateLabel(project, group);
  // Closed projects date from when they closed; open ones from their last touch.
  const completed = group === 'closed' ? shortDate(project.completedDate) : null;
  const activity = completed
    ? `Completed ${completed}`
    : shortDate(project.lastActivity)
      ? `Last activity ${shortDate(project.lastActivity)}`
      : null;

  return (
    <div
      data-nav-id={project.id}
      className={cn(
        'chronicle-task-row chronicle-project-row',
        isHighlighted && 'is-selected',
        group === 'dormant' && 'is-dormant',
        group === 'closed' && 'is-closed',
      )}
      style={{ '--project-ink': ink } as React.CSSProperties}
    >
      <span className="chronicle-capture-glyph" aria-hidden="true">
        <span className="chronicle-project-mark" />
      </span>
      <button className="chronicle-row-body active:scale-[0.98]" onClick={() => onOpen(project.id)}>
        <span className="chronicle-row-title">{project.title}</span>
        {label || activity ? (
          <span className="chronicle-row-meta">
            {label ? (
              <span className={label === 'At-risk' ? 'is-risk' : undefined}>{label}</span>
            ) : null}
            {label && activity ? ' · ' : null}
            {activity}
          </span>
        ) : null}
      </button>
      <span className="chronicle-index-progress" aria-hidden="true">
        {progress ? (
          <>
            <span className="chronicle-progress">
              <span className="chronicle-progress-fill" style={{ width: `${progress.percentage}%` }} />
            </span>
            <span className="chronicle-project-stat">
              {progress.done}/{progress.total}
            </span>
          </>
        ) : (
          <span className="chronicle-project-stat">No tasks</span>
        )}
      </span>
    </div>
  );
}
