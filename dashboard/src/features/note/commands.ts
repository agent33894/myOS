import { Code, FilePlus, FolderOpen, Keyboard, Link2, ListTree, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Command, CommandSource } from '../../app/commands';
import { go, openNote, paths } from '../../app/navigation';
import { createNote, freeName, remove } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import type { PanelId } from '../../app/panels';
import { updateSettings, useSettings } from '../../store/settings';
import { setRightPanel, setTabMode, useUIStore } from '../../store/ui';
import { formatShortcut } from '../../ui';

const failed = (error: unknown) => toast.error(error instanceof Error ? error.message : 'That did not work');

const parentOf = (path: string | null) => (path?.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

/** Show a panel in the right column, opening the column if it was folded. */
function showPanel(panel: PanelId) {
  const { sidebar } = useSettings.getState();
  if (sidebar.right.collapsed) void updateSettings({ sidebar: { ...sidebar, right: { ...sidebar.right, collapsed: false } } });
  setRightPanel(panel);
}

/** Commands for notes: new, source or rendered, Vim keys, panels, show in folder, delete. */
export const noteCommands: CommandSource = ({ activePath }) => {
  const commands: Command[] = [
    {
      id: 'note.new',
      group: 'Note',
      label: 'New note',
      icon: FilePlus,
      keywords: 'create file page',
      run: () => void createNote(freeName(parentOf(activePath))).then((note) => openNote(note.path), failed),
    },
  ];
  if (!activePath) return commands;
  return [
    ...commands,
    {
      id: 'note.mode',
      group: 'Note',
      label: 'Switch between rendered and Markdown source',
      icon: Code,
      shortcut: 'mod+e',
      keywords: 'source markdown raw edit view',
      run: () => {
        const { tabs, activeTab } = useUIStore.getState();
        if (activeTab !== null) setTabMode(activeTab, tabs[activeTab].mode === 'source' ? 'rendered' : 'source');
      },
    },
    {
      id: 'note.vim',
      group: 'Note',
      label: useSettings.getState().vimKeys ? 'Turn off Vim keys in source mode' : 'Turn on Vim keys in source mode',
      icon: Keyboard,
      keywords: 'vim modal keys editor',
      run: () => void updateSettings({ vimKeys: !useSettings.getState().vimKeys }),
    },
    { id: 'note.outline', group: 'Note', label: 'Show outline', icon: ListTree, keywords: 'headings toc contents', run: () => showPanel('outline') },
    { id: 'note.backlinks', group: 'Note', label: 'Show backlinks', icon: Link2, keywords: 'links mentions linked', run: () => showPanel('backlinks') },
    {
      id: 'note.properties',
      group: 'Note',
      label: 'Edit properties',
      icon: SlidersHorizontal,
      keywords: 'frontmatter yaml metadata tags',
      run: () => showPanel('properties'),
    },
    { id: 'note.reveal', group: 'Note', label: 'Show in file manager', icon: FolderOpen, run: () => void invoke('shell:reveal', activePath).catch(failed) },
    {
      id: 'note.delete',
      group: 'Note',
      label: 'Delete note',
      icon: Trash2,
      keywords: 'remove trash',
      run: () =>
        void remove(activePath).then(() => {
          go(paths.today);
          toast(`Deleted ${activePath}. Undo with ${formatShortcut('mod+z')}.`);
        }, failed),
    },
  ];
};
