import { forwardRef, useState, type DragEvent, type HTMLAttributes, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, FilePlus, FolderPlus, ListChecks, Pencil, PinOff, Search, Settings, SunMedium, type LucideIcon } from 'lucide-react';
import type { PinnedView } from '@shared/settings';
import { go, paths, toViewUrl } from '../../app/navigation';
import { updateSettings, useSettings } from '../../store/settings';
import { activeTabOf, tabKey, useUIStore } from '../../store/ui';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger, Icon, IconButton, Input, MenuItem, MenuSeparator, cn } from '../../ui';
import { FileTree } from './FileTree';
import { baseName, selectedFolder, startDraft, useTreeStore } from './layout';
import { SHORTCUTS } from './shortcuts';
import { WindowStrip } from './WindowStrip';

const placeRow = 'flex h-7 w-full cursor-default select-none items-center gap-2 rounded-md px-2 text-sm outline-none transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';

/** The key of the tab on screen, so a place can show that it is open. */
const useCurrentKey = () => useUIStore((state) => {
  const tab = activeTabOf(state);
  return tab ? tabKey(tab.url) : null;
});

type PlaceRowProps = { url: string; label: ReactNode; icon: LucideIcon } & HTMLAttributes<HTMLDivElement>;

const PlaceRow = forwardRef<HTMLDivElement, PlaceRowProps>(function PlaceRow({ url, label, icon, ...rest }, ref) {
  const current = useCurrentKey() === tabKey(url);
  return (
    <div
      ref={ref}
      role="link"
      tabIndex={0}
      aria-current={current ? 'page' : undefined}
      onClick={() => go(url)}
      onDoubleClick={() => go(url, { pin: true })}
      onKeyDown={(event) => {
        if (event.key === 'Enter') go(url, { pin: true });
      }}
      className={cn(placeRow, current ? 'bg-sheet font-medium text-text shadow-raised' : 'text-text-secondary hover:bg-text/5 hover:text-text')}
      {...rest}
    >
      <Icon icon={icon} size="sm" className={cn('shrink-0', current ? 'text-accent-text' : 'text-text-tertiary')} />
      <span className="truncate">{label}</span>
    </div>
  );
});

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Pinned views: open, rename in place, reorder by dragging or from the menu, unpin. */
function PinnedViews() {
  const views = useSettings((state) => state.pinnedViews);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const save = (pinnedViews: PinnedView[]) => void updateSettings({ pinnedViews });

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault();
    if (dragging !== null && dragging !== to) save(move(views, dragging, to));
    setDragging(null);
  };

  return views.map((view, index) =>
    renaming === view.id ? (
      <Input
        key={view.id}
        autoFocus
        size="sm"
        aria-label={`New name for ${view.name}`}
        defaultValue={view.name}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setRenaming(null);
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name && name !== view.name) save(views.map((entry) => (entry.id === view.id ? { ...entry, name } : entry)));
          setRenaming(null);
        }}
        className="h-7 px-2"
      />
    ) : (
      <ContextMenu key={view.id}>
        <ContextMenuTrigger asChild>
          <PlaceRow
            url={toViewUrl(view.id)}
            label={view.name}
            icon={Search}
            title={view.query}
            draggable
            onDragStart={(event) => {
              setDragging(index);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => dragging !== null && event.preventDefault()}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={() => setDragging(null)}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <MenuItem icon={Pencil} onSelect={() => setTimeout(() => setRenaming(view.id), 0)}>
            Rename
          </MenuItem>
          <MenuItem icon={ArrowUp} disabled={index === 0} onSelect={() => save(move(views, index, index - 1))}>
            Move up
          </MenuItem>
          <MenuItem icon={ArrowDown} disabled={index === views.length - 1} onSelect={() => save(move(views, index, index + 1))}>
            Move down
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={PinOff} onSelect={() => save(views.filter((entry) => entry.id !== view.id))}>
            Unpin
          </MenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ),
  );
}

/** The left column: the folder's name, Today, Tasks, pinned views, then the folder's files. */
export function Sidebar({ width }: { width: number }) {
  const folder = useTreeStore((state) => state.folder);
  return (
    <aside aria-label="Files" className="flex h-full shrink-0 flex-col" style={{ width }}>
      <WindowStrip className="pl-4 pr-2">
        <span className="truncate text-sm font-semibold text-text" title={folder}>
          {baseName(folder) || 'myOS Next'}
        </span>
      </WindowStrip>
      <nav aria-label="Places" className="flex flex-col gap-0.5 px-2 pb-3">
        <PlaceRow url={paths.today} label="Today" icon={SunMedium} />
        <PlaceRow url={paths.tasks} label="Tasks" icon={ListChecks} />
        <PinnedViews />
      </nav>
      <div className="group/files flex h-8 shrink-0 items-center gap-1 pl-4 pr-2">
        <span className="flex-1 text-xs font-medium text-text-tertiary">Files</span>
        <IconButton icon={FilePlus} label="New note" shortcut={SHORTCUTS.newNote} size="sm" onClick={() => startDraft(selectedFolder(), 'note')} />
        <IconButton icon={FolderPlus} label="New folder" size="sm" onClick={() => startDraft(selectedFolder(), 'folder')} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <FileTree />
      </div>
      <footer className="px-2 py-2">
        <PlaceRow url={paths.settings} label="Settings" icon={Settings} />
      </footer>
    </aside>
  );
}
