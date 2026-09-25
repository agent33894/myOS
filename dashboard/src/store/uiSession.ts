import { restoreTabs, useUIStore, type GroupId } from './ui';

/**
 * Open tabs, the split, and expanded folders are this window's session, kept
 * per folder in local storage (not in settings, and never in the folder).
 */
const key = (folder: string, what: string) => `myos-next:${what}:${folder}`;

function read<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(name);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(name: string, value: unknown): void {
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the session just isn't remembered.
  }
}

interface SavedTabs {
  tabs: Array<{ url: string; mode: 'rendered' | 'source'; group: GroupId }>;
  current: [number | null, number | null];
  focusedGroup: GroupId;
}

/** Put back the folder's tabs, then keep saving them. Returns the unsubscribe. */
export function keepTabSession(folder: string): () => void {
  const saved = read<SavedTabs>(key(folder, 'tabs'));
  if (saved && Array.isArray(saved.tabs)) {
    const tabs = saved.tabs.filter((tab) => typeof tab?.url === 'string' && (tab.group === 0 || tab.group === 1));
    restoreTabs({ tabs: tabs.map(({ url, mode, group }) => ({ url, mode: mode === 'source' ? 'source' : 'rendered', group })), current: saved.current ?? [null, null], focusedGroup: saved.focusedGroup === 1 ? 1 : 0 });
  }
  let timer: number | undefined;
  return useUIStore.subscribe((state, previous) => {
    if (state.tabs === previous.tabs && state.current === previous.current && state.focusedGroup === previous.focusedGroup) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const { tabs, current, focusedGroup } = useUIStore.getState();
      const indexOf = (id: string | null) => {
        const index = tabs.findIndex((tab) => tab.id === id);
        return index < 0 ? null : index;
      };
      write(key(folder, 'tabs'), {
        tabs: tabs.map(({ url, mode, group }) => ({ url, mode, group })),
        current: [indexOf(current[0]), indexOf(current[1])],
        focusedGroup,
      } satisfies SavedTabs);
    }, 300);
  });
}

/** Expanded folders in the file tree, per open folder. */
export const readExpanded = (folder: string): string[] => read<string[]>(key(folder, 'expanded')) ?? [];
export const writeExpanded = (folder: string, expanded: Iterable<string>) => write(key(folder, 'expanded'), [...expanded]);

const RECENT_COMMANDS = 'myos-next:recent-commands';
const RECENT_LIMIT = 6;

/** Command ids run from the command bar, newest first. */
export const recentCommands = (): string[] => read<string[]>(RECENT_COMMANDS) ?? [];
export const rememberCommand = (id: string) => write(RECENT_COMMANDS, [id, ...recentCommands().filter((item) => item !== id)].slice(0, RECENT_LIMIT));
