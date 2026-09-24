import type { ArtifactSummary } from '@shared/types';
import { cn } from '../../lib/utils';
import { setArtifactDragData } from '../../lib/artifactDnd';
import { localDateStamp } from './todaySelectors';
import { ChronicleCheckmark } from './ChronicleCheckmark';
import { useProjectLabel } from '../../hooks/useProjectLabel';

interface InPlayListProps {
  tasks: ArtifactSummary[];
  selectedId: string | null;
  /** id -> completion timestamp for rows mid-completion (checkmark + stamp). */
  completing: Map<string, string>;
  /** Rows persisted as done but still rendered while they animate out. */
  departingIds: Set<string>;
  onSelect: (artifact: ArtifactSummary) => void;
  onComplete: (artifact: ArtifactSummary) => void;
  onDefer: (artifact: ArtifactSummary) => void;
  heading?: string;
  headingId?: string;
  emptyText?: string | null;
}

export function InPlayList({
  tasks,
  selectedId,
  completing,
  departingIds,
  onSelect,
  onComplete,
  onDefer,
  heading = 'In Play',
  headingId = 'in-play-heading',
  emptyText = 'Nothing in play.',
}: InPlayListProps) {
  const projectLabel = useProjectLabel();
  if (tasks.length === 0 && emptyText === null) return null;
  return (
    <section aria-labelledby={headingId}>
      <div className="chronicle-list-heading">
        <span id={headingId}>{heading}</span>
        <span key={tasks.length} className="chronicle-count">{tasks.length}</span>
      </div>
      {tasks.length === 0 && emptyText ? <p className="chronicle-empty-row">{emptyText}</p> : null}
      {tasks.map((task) => {
        const isCompleting = completing.has(task.id);
        const isDeparting = departingIds.has(task.id);
        return (
          <div
            key={task.id}
            data-nav-id={task.id}
            draggable
            onDragStart={(event) => setArtifactDragData(event, task)}
            className={cn(
              'chronicle-task-row',
              selectedId === task.id && 'is-selected',
              isCompleting && 'is-completing',
              isDeparting && 'is-departing',
            )}
          >
            <button
              className="chronicle-completion"
              onClick={() => onComplete(task)}
              aria-label={`Complete ${task.title}`}
              disabled={isCompleting}
            >
              <span>
                <ChronicleCheckmark />
              </span>
            </button>
            <button className="chronicle-row-body active:scale-[0.98]" onClick={() => onSelect(task)}>
              <span className="chronicle-row-title">{task.title}</span>
              <span className="chronicle-row-meta">
                {task.due ? formatDue(task.due) : 'Next'} · {projectLabel(task.project) || task.tags?.[0] || 'myOS'}
              </span>
            </button>
            {isCompleting ? <time className="chronicle-completion-time">{completing.get(task.id)}</time> : null}
            <div className="chronicle-row-affordances">
              <button onClick={() => onDefer(task)} aria-label={`Defer ${task.title} until tomorrow`}>
                Defer
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function formatDue(due: string) {
  const today = localDateStamp();
  if (due === today) return 'Today';
  if (due < today) return 'Due';
  return new Date(`${due}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}
