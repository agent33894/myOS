import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectSwatchFor } from '@shared/design-system/tokens';
import type { ProjectWithStats } from '../../hooks/useProjects';
import type { Artifact } from '../../types/artifacts';
import { cn } from '../../lib/utils';
import { toArtifactNavigationUrl } from '../artifact-route/routeContract';
import { ProjectInspector } from './ProjectInspector';
import { ProjectItemPage } from './ProjectItemPage';
import { ProjectMaterialsSection } from './ProjectMaterialsSection';
import { ProjectOverview } from './ProjectOverview';
import { ProjectTasksSection } from './ProjectTasksSection';
import { ProjectWorkbenchBar } from './ProjectWorkbenchBar';
import { resolveWorkbenchItem } from './workbenchItem';

const RAIL_KEY = 'chronicle-project-rail-collapsed';
// Below this workbench width (quarter/third tiles) the rail and inspector
// become drawers over the page, one at a time, closed by default.
const NARROW_WORKBENCH_PX = 900;
const INSPECTOR_KEY = 'chronicle-project-inspector-collapsed';

interface ProjectHomeProps {
  project: ProjectWithStats;
  itemPath: string | null;
  onSelectItem: (filePath: string) => void;
  onCloseItem: () => void;
}

/**
 * The project as a workbench: a breadcrumb bar carries the hierarchy, the
 * collapsible index rail carries tasks and materials, the center is a page
 * (the project's own overview, or any owned artifact as a Living Page), and
 * the collapsible inspector carries every property. Opening an artifact
 * never leaves this surface. The overview's Brief stays unkeyed on purpose:
 * its controller reloads on artifact change without remounting the editor.
 */
export function ProjectHome({ project, itemPath, onSelectItem, onCloseItem }: ProjectHomeProps) {
  const navigate = useNavigate();
  const projectInk = projectSwatchFor(project.title, project.swatch).hex;
  const centerRef = useRef<HTMLDivElement>(null);
  const workbenchRef = useRef<HTMLElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [narrowPanel, setNarrowPanel] = useState<'rail' | 'inspector' | null>(null);

  useEffect(() => {
    const element = workbenchRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < NARROW_WORKBENCH_PX);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem(RAIL_KEY) === '1',
  );
  const [inspectorCollapsed, setInspectorCollapsed] = useState(
    () => localStorage.getItem(INSPECTOR_KEY) === '1',
  );
  useEffect(() => {
    localStorage.setItem(RAIL_KEY, railCollapsed ? '1' : '0');
  }, [railCollapsed]);
  useEffect(() => {
    localStorage.setItem(INSPECTOR_KEY, inspectorCollapsed ? '1' : '0');
  }, [inspectorCollapsed]);

  // Narrow tiles keep their own drawer state so the wide layout preference survives.
  const isRailHidden = isNarrow ? narrowPanel !== 'rail' : railCollapsed;
  const isInspectorHidden = isNarrow ? narrowPanel !== 'inspector' : inspectorCollapsed;
  const toggleRail = useCallback(() => {
    if (isNarrow) setNarrowPanel((panel) => (panel === 'rail' ? null : 'rail'));
    else setRailCollapsed((prev) => !prev);
  }, [isNarrow]);
  const toggleInspector = useCallback(() => {
    if (isNarrow) setNarrowPanel((panel) => (panel === 'inspector' ? null : 'inspector'));
    else setInspectorCollapsed((prev) => !prev);
  }, [isNarrow]);

  const item = useMemo(() => resolveWorkbenchItem(project, itemPath), [project, itemPath]);
  const selectedPath = item?.filePath ?? null;

  // Anything the project owns opens in place; anything outside it (a related
  // artifact from another corner of the vault) opens in the Library pane, or
  // in its own workbench when it is another project.
  const openArtifact = useCallback(
    (artifact: Artifact) => {
      setNarrowPanel(null);
      if (resolveWorkbenchItem(project, artifact.filePath)) {
        onSelectItem(artifact.filePath);
      } else {
        navigate(toArtifactNavigationUrl(artifact));
      }
    },
    [project, onSelectItem, navigate],
  );

  // Each page gets a fresh top: on project switch and on item switch.
  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0 });
  }, [project.id, item?.id]);

  // `[` and `]` toggle the panels — Docs-style rail, OmniFocus-style inspector.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === '[') toggleRail();
      if (event.key === ']') toggleInspector();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleRail, toggleInspector]);

  return (
    <article
      ref={workbenchRef}
      className={cn('chronicle-project-workbench', isNarrow && 'is-narrow')}
      style={{ '--project-ink': projectInk } as React.CSSProperties}
    >
      <ProjectWorkbenchBar
        project={project}
        item={item}
        railCollapsed={isRailHidden}
        inspectorCollapsed={isInspectorHidden}
        onToggleRail={toggleRail}
        onToggleInspector={toggleInspector}
        onCloseItem={onCloseItem}
      />
      <div className="chronicle-workbench-body">
        <nav
          className={cn(
            'chronicle-workbench-rail custom-scrollbar',
            isRailHidden && 'is-collapsed',
          )}
          aria-label="Project index"
          aria-hidden={isRailHidden}
        >
          <div className="chronicle-rail-inner">
            <button
              className={cn('chronicle-rail-overview', !item && 'is-selected')}
              onClick={onCloseItem}
            >
              <span className="chronicle-project-dot" aria-hidden="true" />
              Overview
            </button>
            <ProjectTasksSection
              key={project.id}
              project={project}
              onOpen={openArtifact}
              selectedPath={selectedPath}
            />
            <ProjectMaterialsSection
              project={project}
              onOpen={openArtifact}
              selectedPath={selectedPath}
            />
          </div>
        </nav>
        <div
          ref={centerRef}
          className="chronicle-workbench-center custom-scrollbar"
          onPointerDown={isNarrow && narrowPanel ? () => setNarrowPanel(null) : undefined}
        >
          {item ? (
            <ProjectItemPage artifact={item} onDeleted={onCloseItem} />
          ) : (
            <ProjectOverview project={project} onOpenItem={openArtifact} />
          )}
        </div>
        <aside
          className={cn(
            'chronicle-workbench-inspector custom-scrollbar',
            isInspectorHidden && 'is-collapsed',
          )}
          aria-label="Properties"
          aria-hidden={isInspectorHidden}
        >
          <div className="chronicle-inspector-inner">
            <ProjectInspector project={project} item={item} onOpenArtifact={openArtifact} />
          </div>
        </aside>
      </div>
    </article>
  );
}
