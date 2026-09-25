import { ChevronDown, CheckCircle2, FilePlus, FolderPlus, Plus, Search } from 'lucide-react';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  Icon,
  IconButton,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '../../../ui';
import { useUIStore } from '../../../store/ui';
import { NewFromTemplateMenuItem } from '../../knowledge/slots';
import { SHORTCUTS } from '../shortcuts';
import { useCreate } from '../useCreate';

function NewMenuItems() {
  const { newNote, newTask, newProject } = useCreate();
  return (
    <>
      <MenuItem icon={FilePlus} shortcut={SHORTCUTS.newNote} onSelect={() => void newNote()}>
        New note
      </MenuItem>
      <MenuItem icon={CheckCircle2} shortcut={SHORTCUTS.capture} onSelect={newTask}>
        New task
      </MenuItem>
      <MenuItem icon={FolderPlus} onSelect={() => void newProject()}>
        New project
      </MenuItem>
      {/* Templates (features/knowledge) */}
      <NewFromTemplateMenuItem />
    </>
  );
}

/** Search (⌘K) and + New (⌘N), with note, task, and project on the chevron or a right-click. */
export function SidebarActions({ rail }: { rail: boolean }) {
  const openPalette = useUIStore((state) => state.openCommandPalette);
  const openCapture = useUIStore((state) => state.openQuickCapture);

  if (rail) {
    return (
      <div className="flex flex-col items-center gap-1">
        <IconButton icon={Search} label="Search" shortcut={SHORTCUTS.palette} onClick={openPalette} />
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <IconButton
              icon={Plus}
              variant="primary"
              label="New"
              shortcut={SHORTCUTS.capture}
              className="rounded-full"
              onClick={openCapture}
            />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <NewMenuItems />
          </ContextMenuContent>
        </ContextMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={openPalette}
        className="w-full justify-start gap-2 px-2 font-normal text-text-tertiary hover:text-text-secondary"
      >
        <Icon icon={Search} />
        <span className="flex-1 text-left">Search</span>
        <Kbd shortcut={SHORTCUTS.palette} className="bg-transparent" />
      </Button>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex rounded-md shadow-raised">
            <Button variant="primary" onClick={openCapture} className="flex-1 justify-start gap-2 rounded-r-none px-2">
              <Icon icon={Plus} />
              <span className="flex-1 text-left">New</span>
              <Kbd shortcut={SHORTCUTS.capture} className="bg-transparent text-accent-on" />
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button
                  variant="primary"
                  icon
                  aria-label="More ways to create"
                  className="rounded-l-none border-l border-accent-on/20"
                >
                  <Icon icon={ChevronDown} size="sm" />
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <NewMenuItems />
              </MenuContent>
            </Menu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <NewMenuItems />
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
