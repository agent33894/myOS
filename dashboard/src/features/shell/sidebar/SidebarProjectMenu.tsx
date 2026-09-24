import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { statusesFor } from '@shared/spec';
import { projectSwatches } from '@shared/design-system/tokens';
import type { ArtifactSummary } from '@shared/types';
import { ArtifactType } from '@shared/types';
import { cn } from '../../../lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { useArtifactEdit, useProjectStatus } from '../../projects/projectMutations';
import { nextPinOrder } from './sidebarProjectsModel';

const STATUSES = statusesFor(ArtifactType.PROJECT);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface SidebarProjectMenuProps {
  project: ArtifactSummary;
  /** Current sidebar pinned rows — used to append at the end of the pin order. */
  pinnedRows: ArtifactSummary[];
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
}

/**
 * Right-click project actions. Action handlers intentionally use onClick:
 * Radix drives pointer and keyboard activation through the item's click path,
 * while its custom onSelect event can be lost in the packaged Electron portal.
 * Rename and Delete defer via setTimeout so their UI mounts after the menu
 * closes and returns focus instead of having Radix steal focus back.
 */
export function SidebarProjectMenu({ project, pinnedRows, onRename, onDelete, children }: SidebarProjectMenuProps) {
  const navigate = useNavigate();
  const { applyEdit } = useArtifactEdit();
  const { setProjectStatus } = useProjectStatus();
  const isPinned = project.pinned === true;

  const togglePin = () => {
    if (isPinned) {
      // undefined intentionally removes both keys from frontmatter.
      void applyEdit(project, { pinned: undefined, order: undefined }, `Unpin ${project.title}`);
    } else {
      const actuallyPinned = pinnedRows.filter((row) => row.pinned === true);
      void applyEdit(project, { pinned: true, order: nextPinOrder(actuallyPinned) }, `Pin ${project.title}`);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={togglePin}>{isPinned ? 'Unpin' : 'Pin'}</ContextMenuItem>
        <ContextMenuItem onClick={() => setTimeout(onRename, 0)}>Rename</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Status</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={String(project.status ?? 'active')}>
              {STATUSES.map((status) => (
                <ContextMenuRadioItem
                  key={status}
                  value={status}
                  onClick={() => setProjectStatus(project.id, status)}
                >
                  {capitalize(status)}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Set color</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <div className="chronicle-swatch-grid">
              {projectSwatches.map((swatch) => (
                <ContextMenuItem
                  key={swatch.name}
                  asChild
                  onClick={() => void applyEdit(project, { swatch: swatch.name }, `Color ${swatch.displayName}`)}
                >
                  <button
                    type="button"
                    aria-label={swatch.displayName}
                    className={cn('chronicle-swatch-cell p-0', project.swatch === swatch.name && 'is-current')}
                  >
                    <span style={{ background: swatch.hex }} />
                  </button>
                </ContextMenuItem>
              ))}
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!project.swatch}
              onClick={() => void applyEdit(project, { swatch: undefined }, 'Automatic color')}
            >
              Automatic
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem
          onClick={() => navigate(`/projects?project=${encodeURIComponent(project.id)}&newtask=1`)}
        >
          New task in project
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => setProjectStatus(project.id, 'archived')}>Archive</ContextMenuItem>
        <ContextMenuItem destructive onClick={() => setTimeout(onDelete, 0)}>
          Delete…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
