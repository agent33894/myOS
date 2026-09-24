import { FolderOpen, MoreHorizontal, PenSquare, Trash2 } from 'lucide-react';
import type { ArtifactSummary } from '@shared/types';
import { invoke } from '../../data/ipc';
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../ui';
import { attempt, deleteItem } from '../tasks/actions';

interface PageMenuProps {
  item: ArtifactSummary;
  /** Save pending edits before another app opens the file. */
  flush: () => Promise<void>;
  onDeleted: () => void;
}

/** The page's ⋯ menu: the file-level actions that don't belong in the property row. */
export function PageMenu({ item, flush, onDeleted }: PageMenuProps) {
  const remove = async () => {
    await flush();
    if (await deleteItem(item)) onDeleted();
  };
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon={MoreHorizontal} label="More" size="sm" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem
          icon={PenSquare}
          onSelect={() => attempt(flush().then(() => invoke('shell:open-in-editor', item.filePath)), 'Could not open an editor')}
        >
          Open in editor
        </MenuItem>
        <MenuItem icon={FolderOpen} onSelect={() => attempt(invoke('shell:reveal', item.filePath), 'Could not show the file')}>
          Show in folder
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Trash2} danger onSelect={() => void remove()}>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
