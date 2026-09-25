import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { exportCommands } from '../features/export/commands';
import { gitCommands } from '../features/git/commands';
import { noteCommands } from '../features/note/commands';
import { shellCommands } from '../features/shell/commands';
import { taskCommands } from '../features/tasks/commands';
import { useGitStore } from '../data/git';
import { useSettings } from '../store/settings';
import { useActivePath, useUIStore } from '../store/ui';

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

/**
 * The command list, rebuilt whenever something a source reads changes: the
 * note on screen, Git, pinned views, the theme, Vim keys, or the split.
 */
export function useCommands(): Command[] {
  const activePath = useActivePath();
  const inRepo = useGitStore((state) => state.status?.repo ?? false);
  const pinnedViews = useSettings((state) => state.pinnedViews);
  const theme = useSettings((state) => state.theme);
  const vimKeys = useSettings((state) => state.vimKeys);
  const split = useUIStore((state) => state.current[1] !== null);
  return useMemo(
    () => SOURCES.flatMap((source) => source({ activePath, inRepo })),
    [activePath, inRepo, pinnedViews, theme, vimKeys, split],
  );
}
