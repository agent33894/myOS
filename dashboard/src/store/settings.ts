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
  setAccent: (accent: string) => void;
  setAccentPreview: (accent: string | null) => void;
  setReadingFont: (font: ReadingFont) => void;
  setRemindDueToday: (value: boolean) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  /** Any stored setting, e.g. `setSetting('defaultArea', Domain.WORK)`. */
  setSetting: <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => void;
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
    setAccent: (accent) => {
      set({ accentPreview: null });
      persist({ accent });
    },
    setAccentPreview: (accentPreview) => set({ accentPreview }),
    setReadingFont: (readingFont) => persist({ readingFont }),
    setRemindDueToday: (remindDueToday) => persist({ remindDueToday }),
    setHasCompletedOnboarding: (hasCompletedOnboarding) => persist({ hasCompletedOnboarding }),
    setSetting: (key, value) => persist({ [key]: value }),
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
