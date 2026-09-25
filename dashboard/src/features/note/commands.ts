import { Code, FilePlus, FolderOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Command, CommandSource } from '../../app/commands';
import { go, openNote, paths } from '../../app/navigation';
import { createNote, freeName, remove } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import { setTabMode, useUIStore } from '../../store/ui';
import { formatShortcut } from '../../ui';

const failed = (error: unknown) => toast.error(error instanceof Error ? error.message : 'That did not work');

const parentOf = (path: string | null) => (path?.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

/** Commands for notes: new, source or rendered, show in folder, delete. */
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
