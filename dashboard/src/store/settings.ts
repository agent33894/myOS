import { toast } from 'sonner';
import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings';
import { invoke } from '../data/ipc';

interface SettingsState extends Settings {
  /** False until the main process has answered; the shell waits for it. */
  loaded: boolean;
  /** An accent shown while the user hovers a swatch; never saved. */
  accentPreview: string | null;
}

/** The app's settings, mirrored from the settings file in the app data folder. */
export const useSettings = create<SettingsState>(() => ({ ...DEFAULT_SETTINGS, loaded: false, accentPreview: null }));

// The theme is applied before the first paint from this copy (public/theme-init.js).
const APPEARANCE_KEY = 'myos-next-appearance';

function remember({ theme, readingFont, lineWidth }: Settings) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme, readingFont, lineWidth }));
  } catch {
    // Storage unavailable: the first frame may just flash the default theme.
  }
}

export async function loadSettings(): Promise<void> {
  const settings = await invoke('settings:get');
  useSettings.setState({ ...settings, loaded: true });
  remember(settings);
}

/** Change settings now, save them in the background, and roll back if the save fails. */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const { loaded: _loaded, accentPreview: _preview, ...before } = useSettings.getState();
  useSettings.setState(patch);
  try {
    const saved = await invoke('settings:set', patch);
    useSettings.setState(saved);
    remember(saved);
  } catch (error) {
    useSettings.setState(Object.fromEntries(Object.keys(patch).map((key) => [key, before[key as keyof Settings]])));
    toast.error(error instanceof Error ? error.message : 'Could not save that setting');
  }
}

export const setAccentPreview = (accentPreview: string | null) => useSettings.setState({ accentPreview });

/** Put `path` first in the recent files. */
export function addRecentFile(path: string): void {
  const recent = useSettings.getState().recentFiles;
  if (recent[0] === path) return;
  void updateSettings({ recentFiles: [path, ...recent.filter((item) => item !== path)] });
}
