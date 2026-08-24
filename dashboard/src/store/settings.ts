import { create } from 'zustand';
import {
  getDefaultSettings,
  getStorableSettings,
  loadSettings,
  saveSettings,
  type EditorView,
  type StoredSettings,
  type ThemeMode,
} from './settingsPersistence';

export type { EditorView } from './settingsPersistence';

interface SettingsState extends StoredSettings {
  setThemeMode: (mode: ThemeMode) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setDefaultEditorView: (view: EditorView) => void;
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
    setThemeMode: (themeMode) => persist({ themeMode }),
    setShowCompletedTasks: (showCompletedTasks) => persist({ showCompletedTasks }),
    setDefaultEditorView: (defaultEditorView) => persist({ defaultEditorView }),
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
