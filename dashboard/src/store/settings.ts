import { create } from 'zustand';
import {
  getDefaultSettings,
  getStorableSettings,
  loadSettings,
  saveSettings,
  type ReadingFont,
  type StoredSettings,
  type ThemeMode,
} from './settingsPersistence';

interface SettingsState extends StoredSettings {
  /** Transient accent shown while the user hovers a swatch; never persisted. */
  accentPreview: string | null;
  setThemeMode: (mode: ThemeMode) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setAccent: (accent: string) => void;
  setAccentPreview: (accent: string | null) => void;
  setReadingFont: (font: ReadingFont) => void;
  setEnableAutoSave: (enable: boolean) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  resetAllSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSettings();
  const persist = (next: Partial<StoredSettings>) => {
    const state = { ...get(), ...next };
    set(next);
    saveSettings(getStorableSettings(state));
  };

  return {
    ...initial,
    accentPreview: null,
    setThemeMode: (themeMode) => persist({ themeMode }),
    setShowCompletedTasks: (showCompletedTasks) => persist({ showCompletedTasks }),
    setAccent: (accent) => {
      set({ accentPreview: null });
      persist({ accent });
    },
    setAccentPreview: (accentPreview) => set({ accentPreview }),
    setReadingFont: (readingFont) => persist({ readingFont }),
    setEnableAutoSave: (enableAutoSave) => persist({ enableAutoSave }),
    setHasCompletedOnboarding: (hasCompletedOnboarding) => persist({ hasCompletedOnboarding }),
    resetAllSettings: () => {
      const defaults = {
        ...getDefaultSettings(),
        hasCompletedOnboarding: get().hasCompletedOnboarding,
      };
      set(defaults);
      saveSettings(defaults);
    },
  };
});
