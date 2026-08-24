import { projectSwatchFor } from '@shared/design-system/tokens';
import type { ProjectWithStats } from '../../hooks/useProjects';
import { cn } from '../../lib/utils';
import { shortDate } from './format';

export type ProjectIndexGroup = 'active' | 'dormant' | 'archived';

/** The section heading already names the group — rows only garnish what differs. */
function stateLabel(project: ProjectWithStats, group: ProjectIndexGroup): string | null {
  if (group === 'archived') {
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

/** One roster line on the index: cover chip, title, state, and the ledger. */
export function ProjectIndexRow({ project, group, isHighlighted, onOpen }: ProjectIndexRowProps) {
  const ink = projectSwatchFor(project.title, project.swatch).hex;
  const progress = project.todoProgress;
  const activity = shortDate(project.lastActivity);
  const label = stateLabel(project, group);
  const meta = [
    label,
    activity ? `Last activity ${activity}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      data-nav-id={project.id}
      className={cn(
        'chronicle-task-row chronicle-project-row',
        isHighlighted && 'is-selected',
        group === 'dormant' && 'is-dormant',
      )}
    >
      <span className="chronicle-capture-glyph" aria-hidden="true">
        <span
          className={cn('chronicle-project-cover', isHighlighted && 'is-focused')}
          style={{ '--project-ink': ink } as React.CSSProperties}
        />
      </span>
      <button className="chronicle-row-body active:scale-[0.98]" onClick={() => onOpen(project.id)}>
        <span className="chronicle-row-title">{project.title}</span>
        {meta ? (
          <span className="chronicle-row-meta">
            {label ? (
              <span className={label === 'At-risk' ? 'is-risk' : undefined}>{label}</span>
            ) : null}
            {label && activity ? ' · ' : null}
            {activity ? `Last activity ${activity}` : null}
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
