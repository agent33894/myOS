import { Archive, Palette, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { projectSwatches, projectSwatchFor } from '@shared/design-system/accents';
import type { ArtifactSummary } from '@shared/types';
import { MenuCheckboxItem, MenuItem, MenuSeparator, MenuSub } from '../../../ui';
import { archiveProject, setProjectColor, togglePin } from './projectActions';

interface ProjectMenuItemsProps {
  project: ArtifactSummary;
  onRename: () => void;
  onDelete: () => void;
}

/** One set of project actions for both the ⋯ menu and the right-click menu. */
export function ProjectMenuItems({ project, onRename, onDelete }: ProjectMenuItemsProps) {
  const current = projectSwatchFor(project.title, project.swatch).name;
  return (
    <>
      <MenuItem icon={Pencil} onSelect={onRename}>
        Rename
      </MenuItem>
      <MenuSub label="Color" icon={Palette}>
        {projectSwatches.map((swatch) => (
          <MenuCheckboxItem
            key={swatch.name}
            checked={swatch.name === current}
            onCheckedChange={() => void setProjectColor(project, swatch.name)}
          >
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: swatch.hex }} />
              {swatch.displayName}
            </span>
          </MenuCheckboxItem>
        ))}
      </MenuSub>
      <MenuItem icon={project.pinned ? PinOff : Pin} onSelect={() => void togglePin(project)}>
        {project.pinned ? 'Unpin' : 'Pin to top'}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Archive} onSelect={() => void archiveProject(project)}>
        Archive
      </MenuItem>
      <MenuItem icon={Trash2} danger onSelect={onDelete}>
        Delete…
      </MenuItem>
    </>
  );
}
