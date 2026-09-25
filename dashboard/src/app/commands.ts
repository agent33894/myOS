import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { exportCommands } from '../features/export/commands';
import { gitCommands } from '../features/git/commands';
import { noteCommands } from '../features/note/commands';
import { shellCommands } from '../features/shell/commands';
import { taskCommands } from '../features/tasks/commands';
import { useGitStore } from '../data/git';
import { useActivePath } from '../store/ui';

export interface Command {
  /** Stable and unique across owners, e.g. `note.delete`. */
  id: string;
  group: 'Go to' | 'Note' | 'Tasks' | 'Git' | 'App';
  label: string;
  icon?: LucideIcon;
  /** `mod+shift+k` form (see ui/Kbd); shown in the command bar. Binding it is the owner's job. */
  shortcut?: string;
  /** Other words that should find this command. */
  keywords?: string;
  run: () => void;
}

/** What a command source can see when the list is built. */
export interface CommandContext {
  /** The note on screen, or null. */
  activePath: string | null;
  /** Whether the folder is in a Git repository. */
  inRepo: boolean;
}

export type CommandSource = (context: CommandContext) => Command[];

/** Every owner's commands, in command-bar order. */
const SOURCES: readonly CommandSource[] = [shellCommands, noteCommands, taskCommands, gitCommands, exportCommands];

export function useCommands(): Command[] {
  const activePath = useActivePath();
  const inRepo = useGitStore((state) => state.status?.repo ?? false);
  return useMemo(() => SOURCES.flatMap((source) => source({ activePath, inRepo })), [activePath, inRepo]);
}
