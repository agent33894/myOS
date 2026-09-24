import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { projectSwatchFor } from '@shared/design-system/tokens';
import type { ArtifactSummary } from '@shared/types';
import { cn } from '../../../lib/utils';
import { useProjectRename } from '../../projects/projectRename';
import { useSidebarRowDnd } from './sidebarRowDnd';
import { SidebarProjectMenu } from './SidebarProjectMenu';
import { SidebarProjectDeleteDialog } from './SidebarProjectDeleteDialog';

interface SidebarProjectRowProps {
  project: ArtifactSummary;
  /** Current pinned rows, for reorder targets and appending to the pin order. */
  pinnedRows: ArtifactSummary[];
  preload?: () => void;
}

export function SidebarProjectRow({ project, pinnedRows, preload }: SidebarProjectRowProps) {
  const location = useLocation();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Enter commits then blur fires — this guard keeps rename single-shot.
  const renameDoneRef = useRef(false);
  const { rename } = useProjectRename();
  const { isDragging, isDropTarget, canReorder, handlers } = useSidebarRowDnd(project, pinnedRows);

  const isActive =
    location.pathname === '/projects' &&
    new URLSearchParams(location.search).get('project') === project.id;

  const dot = (
    <span
      className="chronicle-project-dot"
      style={{ background: projectSwatchFor(project.title, project.swatch).hex }}
    />
  );

  const finishRename = (value: string | null) => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    setRenaming(false);
    if (value !== null) void rename(project, value);
  };

  return (
    <>
      <SidebarProjectMenu
        project={project}
        pinnedRows={pinnedRows}
        onRename={() => {
          renameDoneRef.current = false;
          setRenaming(true);
        }}
        onDelete={() => setDeleting(true)}
      >
        {renaming ? (
          <div className="chronicle-nav-row">
            {dot}
            <input
              className="chronicle-sidebar-rename"
              defaultValue={project.title}
              autoFocus
              aria-label={`Rename ${project.title}`}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') finishRename(event.currentTarget.value);
                if (event.key === 'Escape') finishRename(null);
              }}
              onBlur={(event) => finishRename(event.currentTarget.value)}
            />
          </div>
        ) : (
          <NavLink
            to={`/projects?project=${encodeURIComponent(project.id)}`}
            aria-label={project.title}
            onMouseEnter={preload}
            onFocus={preload}
            draggable={canReorder}
            {...handlers}
            className={cn(
              'chronicle-nav-row',
              isActive && 'is-active',
              isDragging && 'is-dragging',
              isDropTarget && 'is-drop-target',
            )}
          >
            {dot}
            <span className="truncate">{project.title}</span>
          </NavLink>
        )}
      </SidebarProjectMenu>
      <SidebarProjectDeleteDialog
        project={project}
        isOpen={deleting}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
