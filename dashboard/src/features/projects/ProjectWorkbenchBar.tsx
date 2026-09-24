import { useNavigate } from 'react-router-dom';
import { PanelLeft, PanelRight } from 'lucide-react';
import type { ProjectWithStats } from '../../data/projects';
import type { ArtifactSummary } from '@shared/types';

interface ProjectWorkbenchBarProps {
  project: ProjectWithStats;
  item: ArtifactSummary | null;
  railCollapsed: boolean;
  inspectorCollapsed: boolean;
  onToggleRail: () => void;
  onToggleInspector: () => void;
  onCloseItem: () => void;
}

/**
 * The workbench header is the breadcrumb: Projects › project › item. The
 * hierarchy carries the navigation, so there is no masthead band — vitals
 * compress to a mono garnish on the right, between the two panel toggles.
 */
export function ProjectWorkbenchBar({
  project,
  item,
  railCollapsed,
  inspectorCollapsed,
  onToggleRail,
  onToggleInspector,
  onCloseItem,
}: ProjectWorkbenchBarProps) {
  const navigate = useNavigate();
  const progress = project.todoProgress;

  const projectCrumb = (
    <>
      <span className="chronicle-project-dot" aria-hidden="true" />
      <span className="chronicle-crumb-text">{project.title}</span>
    </>
  );

  return (
    <header className="chronicle-workbench-bar">
      <button
        className="chronicle-panel-toggle"
        aria-pressed={!railCollapsed}
        aria-label={railCollapsed ? 'Show project index' : 'Hide project index'}
        title="Project index — ["
        onClick={onToggleRail}
      >
        <PanelLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <nav className="chronicle-workbench-crumbs" aria-label="Breadcrumb">
        <button
          className="chronicle-crumb active:scale-[0.98]"
          onClick={() => navigate('/projects')}
        >
          Projects
        </button>
        <span className="chronicle-crumb-sep" aria-hidden="true">
          ›
        </span>
        {item ? (
          <button className="chronicle-crumb active:scale-[0.98]" onClick={onCloseItem}>
            {projectCrumb}
          </button>
        ) : (
          <span className="chronicle-crumb is-here">{projectCrumb}</span>
        )}
        {item ? (
          <>
            <span className="chronicle-crumb-sep" aria-hidden="true">
              ›
            </span>
            <span className="chronicle-crumb is-here">
              <span className="chronicle-crumb-text">{item.title}</span>
            </span>
          </>
        ) : null}
      </nav>
      <div className="chronicle-workbench-stats" aria-label="Project vitals">
        {progress ? (
          <span>
            {progress.done} / {progress.total} tasks
          </span>
        ) : null}
        {project.overdueCount > 0 ? (
          <span className="is-risk">{project.overdueCount} overdue</span>
        ) : null}
      </div>
      <button
        className="chronicle-panel-toggle"
        aria-pressed={!inspectorCollapsed}
        aria-label={inspectorCollapsed ? 'Show inspector' : 'Hide inspector'}
        title="Inspector — ]"
        onClick={onToggleInspector}
      >
        <PanelRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </header>
  );
}
