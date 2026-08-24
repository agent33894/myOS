import type { Artifact } from '../../types/artifacts';
import { cn } from '../../lib/utils';
import { setArtifactDragData } from '../../lib/artifactDnd';
import type { LibrarySort } from './libraryIndex';

const MAX_ROW_TAGS = 3;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Status ink for the mono meta column, per the Chronicle status→variant map. */
function statusClass(status: Artifact['status']): string {
  if (status === 'done') return 'ed-text-success';
  if (status === 'cancelled') return 'ed-text-error';
  if (status === 'active' || status === 'in-progress') return 'accent-text';
  return '';
}

interface LibraryIndexRowProps {
  artifact: Artifact;
  /** Body-match excerpt from full-text search, when the title itself didn't hit. */
  context?: string;
  dateField: LibrarySort;
  isHighlighted: boolean;
  projectInk?: string;
  onOpen: (artifact: Artifact) => void;
}

/** One boxless index row: serif title, tag chips, project dot, mono meta. */
export function LibraryIndexRow({
  artifact,
  context,
  dateField,
  isHighlighted,
  projectInk,
  onOpen,
}: LibraryIndexRowProps) {
  const rawDate = artifact[dateField];
  const displayDate = new Date(DATE_ONLY_PATTERN.test(rawDate) ? `${rawDate}T12:00:00` : rawDate)
    .toLocaleDateString([], { month: 'short', day: 'numeric' });
  const dateLabel = dateField === 'created' ? 'Created' : 'Updated';
  const showStatus = artifact.status !== 'archived';

  return (
    <button
      type="button"
      data-nav-id={artifact.id}
      draggable
      onDragStart={(event) => setArtifactDragData(event, artifact)}
      onClick={() => onOpen(artifact)}
      className={cn('chronicle-index-row', isHighlighted && 'is-selected')}
    >
      <span className="chronicle-index-row-title">{artifact.title}</span>
      <span className="chronicle-index-row-tags" aria-hidden={artifact.tags.length === 0}>
        {artifact.tags.slice(0, MAX_ROW_TAGS).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </span>
      <span className="chronicle-index-row-project">
        {artifact.project ? (
          <>
            <span className="chronicle-project-dot" style={{ background: projectInk }} aria-hidden="true" />
            <span className="truncate">{artifact.project}</span>
          </>
        ) : null}
      </span>
      <span className="chronicle-index-row-meta">
        {dateLabel} {displayDate}
        {showStatus ? (
          <>
            {' · '}
            <span className={statusClass(artifact.status)}>{artifact.status}</span>
          </>
        ) : null}
      </span>
      {context ? <span className="chronicle-index-row-context">{context}</span> : null}
    </button>
  );
}
