import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { APP_ROUTES } from '../../../app/routes';
import { useArtifactsStore } from '../../../store/artifacts';
import { cn } from '../../../lib/utils';
import { selectSidebarProjects } from './sidebarProjectsModel';
import { SidebarProjectRow } from './SidebarProjectRow';
import { SidebarProjectsCreate } from './SidebarProjectsCreate';

const projectsRoute = APP_ROUTES.find((route) => route.id === 'projects');

export function SidebarProjects() {
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const { pinned, overflow } = useMemo(() => selectSidebarProjects(artifacts), [artifacts]);
  const [overflowOpen, setOverflowOpen] = useState(false);

  return (
    <>
      <div className="chronicle-section-header-row">
        <NavLink
          to="/projects"
          onMouseEnter={projectsRoute?.preload}
          onFocus={projectsRoute?.preload}
          className={({ isActive }) =>
            cn('chronicle-section-label chronicle-section-link', isActive && 'is-active')
          }
        >
          Projects
        </NavLink>
        <span className="chronicle-section-fill" aria-hidden="true" />
        <SidebarProjectsCreate />
      </div>
      <nav aria-label="Projects" className="chronicle-nav-group">
        {pinned.map((project) => (
          <SidebarProjectRow
            key={project.id}
            project={project}
            pinnedRows={pinned}
            preload={projectsRoute?.preload}
          />
        ))}
        {overflowOpen &&
          overflow.map((project) => (
            <SidebarProjectRow
              key={project.id}
              project={project}
              pinnedRows={pinned}
              preload={projectsRoute?.preload}
            />
          ))}
        {overflow.length > 0 && (
          <button
            type="button"
            className="chronicle-sidebar-more"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((open) => !open)}
          >
            {overflowOpen ? 'Less' : `${overflow.length} more…`}
          </button>
        )}
      </nav>
    </>
  );
}
