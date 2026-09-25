import { Code, FolderOpen, Keyboard, Link2, ListTree, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Command, CommandSource } from '../../app/commands';
import { go, paths } from '../../app/navigation';
import { remove } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import type { PanelId } from '../../app/panels';
import { updateSettings, useSettings } from '../../store/settings';
import { setRightPanel, setTabMode, useUIStore } from '../../store/ui';
import { offerUndo } from '../../data/undo';

const failed = (error: unknown) => toast.error(error instanceof Error ? error.message : 'That did not work');

/** Show a panel in the right column, opening the column if it was folded. */
export function showPanel(panel: PanelId) {
  const { sidebar } = useSettings.getState();
  if (sidebar.right.collapsed) void updateSettings({ sidebar: { ...sidebar, right: { ...sidebar.right, collapsed: false } } });
  setRightPanel(panel);
}

/** Commands for the note on screen: source or rendered, Vim keys, panels, show in folder, delete. */
export const noteCommands: CommandSource = ({ activePath }) => {
  if (!activePath) return [];
  const commands: Command[] = [
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
          offerUndo(`Deleted ${activePath}`);
        }, failed),
    },
  ];
  return commands;
};
