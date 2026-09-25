import { useState, type DragEvent, type ReactNode } from 'react';
import { FileText, ListChecks, Search, Settings, SunMedium, X, type LucideIcon } from 'lucide-react';
import { openNote, paths } from '../../app/navigation';
import { useDataStore } from '../../data/store';
import { useUnsaved } from '../../data/useDocument';
import { useSettings } from '../../store/settings';
import { activateTab, closeTabById, moveTab, pinTab, useUIStore, type GroupId, type Tab } from '../../store/ui';
import { Icon, IconButton, cn } from '../../ui';
import { FILE_TYPE, TAB_TYPE } from './layout';
import { SHORTCUTS } from './shortcuts';


const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');

/** What a tab is called and its icon: the note's title, or the screen's name. */
export function useTabLabel(tab: Tab): { label: string; icon: LucideIcon } {
  const title = useDataStore((state) => (tab.path ? state.notes[tab.path]?.title : undefined));
  const views = useSettings((state) => state.pinnedViews);
  if (tab.path) return { label: title ?? stem(tab.path), icon: FileText };
  const pathname = tab.url.split('?')[0];
  if (pathname === paths.today) return { label: 'Today', icon: SunMedium };
  if (pathname === paths.tasks) return { label: 'Tasks', icon: ListChecks };
  if (pathname === paths.settings) return { label: 'Settings', icon: Settings };
  if (pathname.startsWith(`${paths.view}/`)) {
    const id = decodeURIComponent(pathname.slice(paths.view.length + 1));
    return { label: views.find((view) => view.id === id)?.name ?? 'View', icon: Search };
  }
  return { label: 'Not found', icon: FileText };
}

/** Drops from a tab or a file row: move the tab here, or open the file here. */
export function acceptDrop(event: DragEvent, group: GroupId, beforeId: string | null): boolean {
  const tab = event.dataTransfer.getData(TAB_TYPE);
  const file = event.dataTransfer.getData(FILE_TYPE);
  if (tab) {
    moveTab(tab, group, beforeId);
    return true;
  }
  if (file) {
    const { path, kind } = JSON.parse(file) as { path: string; kind: string };
    if (kind === 'file') openNote(path, { group, pin: true });
    return kind === 'file';
  }
  return false;
}

export const isTabOrFileDrag = (event: DragEvent) => event.dataTransfer.types.includes(TAB_TYPE) || event.dataTransfer.types.includes(FILE_TYPE);

function TabItem({ tab, active, focused, index, dropBefore, onDropHover }: { tab: Tab; active: boolean; focused: boolean; index: number; dropBefore: boolean; onDropHover: (id: string | null) => void }) {
  const { label, icon } = useTabLabel(tab);
  const unsaved = useUnsaved(tab.path);
  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      title={tab.path ?? label}
      draggable
      data-tab={tab.id}
      onClick={() => activateTab(tab.id)}
      onDoubleClick={() => pinTab(tab.id)}
      onAuxClick={(event) => event.button === 1 && closeTabById(tab.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') activateTab(tab.id);
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(TAB_TYPE, tab.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        if (!isTabOrFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        onDropHover(tab.id);
      }}
      onDrop={(event) => {
        event.stopPropagation();
        onDropHover(null);
        if (acceptDrop(event, tab.group, tab.id)) event.preventDefault();
      }}
      className={cn(
        'no-drag group/tab relative flex h-7 min-w-0 max-w-56 shrink cursor-default select-none items-center gap-2 rounded-md pl-3 pr-1 text-sm outline-none transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        active ? 'bg-sheet text-text shadow-raised' : 'text-text-secondary hover:bg-text/5 hover:text-text',
        active && !focused && 'text-text-secondary',
      )}
    >
      {dropBefore ? <span aria-hidden="true" className="absolute inset-y-1 -left-1 w-0.5 rounded-full bg-accent" /> : null}
      <Icon icon={icon} size="sm" className={cn('shrink-0', active && focused ? 'text-accent-text' : 'text-text-tertiary')} />
      <span className={cn('truncate', tab.preview && 'italic')}>{label}</span>
      {index < 9 ? <span className="sr-only">, tab {index + 1}</span> : null}
      {unsaved ? (
        <span title="Not saved yet" className="grid size-5 shrink-0 place-items-center group-hover/tab:hidden">
          <span className="size-1.5 rounded-full bg-text-secondary" />
          <span className="sr-only">, not saved yet</span>
        </span>
      ) : null}
      <IconButton
        icon={X}
        label={`Close ${label}`}
        shortcut={active ? SHORTCUTS.closeTab : undefined}
        size="sm"
        tabIndex={-1}
        className={cn('size-5 shrink-0 rounded-sm opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100', active && 'opacity-100', unsaved && 'hidden group-hover/tab:inline-flex')}
        onClick={(event) => {
          event.stopPropagation();
          closeTabById(tab.id);
        }}
      />
    </div>
  );
}

/** A group's tabs along the top: click to show, drag to reorder or to the other group, middle-click or ⌘W to close. */
export function TabBar({ group, leading, trailing }: { group: GroupId; leading?: ReactNode; trailing?: ReactNode }) {
  const tabs = useUIStore((state) => state.tabs);
  const current = useUIStore((state) => state.current[group]);
  const focused = useUIStore((state) => state.focusedGroup === group);
  const [dropBefore, setDropBefore] = useState<string | null | undefined>(undefined);
  const mine = tabs.filter((tab) => tab.group === group);

  return (
    <div
      className="window-drag-region flex h-11 shrink-0 items-center gap-1 px-2"
      onDragOver={(event) => {
        if (!isTabOrFileDrag(event)) return;
        event.preventDefault();
        setDropBefore(null);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropBefore(undefined);
      }}
      onDrop={(event) => {
        setDropBefore(undefined);
        if (acceptDrop(event, group, null)) event.preventDefault();
      }}
    >
      {leading}
      <div role="tablist" aria-label={group === 0 ? 'Tabs' : 'Tabs on the right'} className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {mine.map((tab, index) => (
          <TabItem
            key={tab.id}
            tab={tab}
            index={index}
            active={tab.id === current}
            focused={focused}
            dropBefore={dropBefore === tab.id}
            onDropHover={setDropBefore}
          />
        ))}
        {dropBefore === null ? <span aria-hidden="true" className="h-5 w-0.5 rounded-full bg-accent" /> : null}
      </div>
      {trailing}
    </div>
  );
}
