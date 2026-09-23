import { useMemo, useState } from 'react';
import type { ProjectWithStats } from '../../hooks/useProjects';
import { useListNavigation } from '../../hooks/useListNavigation';
import type { ProjectGroups, ProjectSort } from './projectGroups';
import { ProjectCreateRow } from './ProjectCreateRow';
import { ProjectIndexRow, type ProjectIndexGroup } from './ProjectIndexRow';
import { ProjectSortMenu } from './ProjectSortMenu';

interface ProjectIndexProps {
  groups: ProjectGroups;
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
  showClosed: boolean;
  onToggleClosed: () => void;
  onOpen: (projectId: string) => void;
  createFocusToken?: number;
}

/**
 * The full-page roster shown at /projects with no selection. j/k walk a local
 * highlight, Enter or click opens that project's home.
 */
export function ProjectIndex({
  groups,
  sort,
  onSortChange,
  showClosed,
  onToggleClosed,
  onOpen,
  createFocusToken,
}: ProjectIndexProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const navigable = useMemo(
    () => [...groups.active, ...groups.dormant, ...(showClosed ? groups.closed : [])],
    [groups, showClosed],
  );

  useListNavigation({
    items: navigable,
    selectedId: highlightedId,
    getId: (project) => project.id,
    onSelect: (project) => setHighlightedId(project.id),
    onActivate: (project) => onOpen(project.id),
    onEscape: () => setHighlightedId(null),
  });

  const renderRows = (projects: ProjectWithStats[], group: ProjectIndexGroup) =>
    projects.map((project) => (
      <ProjectIndexRow
        key={project.id}
        project={project}
        group={group}
        isHighlighted={highlightedId === project.id}
        onOpen={onOpen}
      />
    ));

  const total = groups.active.length + groups.dormant.length + groups.closed.length;
  const masthead = [
    `${groups.active.length} active`,
    groups.dormant.length ? `${groups.dormant.length} dormant` : null,
    groups.closed.length ? `${groups.closed.length} closed` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="chronicle-project-index custom-scrollbar">
      <header className="chronicle-index-masthead">
        <h1>Projects</h1>
        <p className="chronicle-detail-meta">{total === 0 ? 'Nothing on the books' : masthead}</p>
      </header>
      <section aria-labelledby="projects-heading">
        <div className="chronicle-list-heading chronicle-list-heading-row">
          <span id="projects-heading">Active · {groups.active.length}</span>
          <ProjectSortMenu sort={sort} onSortChange={onSortChange} />
        </div>
        {groups.active.length === 0 ? <p className="chronicle-empty-row">No active projects.</p> : null}
        {renderRows(groups.active, 'active')}
        <ProjectCreateRow onCreated={onOpen} focusToken={createFocusToken} />
      </section>
      {groups.dormant.length > 0 ? (
        <section aria-labelledby="dormant-heading">
          <div className="chronicle-list-heading">
            <span id="dormant-heading">Dormant · {groups.dormant.length}</span>
          </div>
          {renderRows(groups.dormant, 'dormant')}
        </section>
      ) : null}
      {groups.closed.length > 0 ? (
        <section aria-labelledby="closed-heading">
          <div className="chronicle-list-heading chronicle-list-heading-row">
            <span id="closed-heading">Closed · {groups.closed.length}</span>
            <button
              className="chronicle-heading-action"
              aria-expanded={showClosed}
              aria-controls="closed-projects"
              onClick={onToggleClosed}
            >
              {showClosed ? 'Hide' : 'Show'}
            </button>
          </div>
          {showClosed ? <div id="closed-projects">{renderRows(groups.closed, 'closed')}</div> : null}
        </section>
      ) : null}
    </div>
  );
}
