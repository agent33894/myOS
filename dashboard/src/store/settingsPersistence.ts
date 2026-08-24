export type EditorView = 'split' | 'preview' | 'source';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface StoredSettings {
  themeMode: ThemeMode;
  showCompletedTasks: boolean;
  defaultEditorView: EditorView;
  enableAutoSave: boolean;
  hasCompletedOnboarding: boolean;
}

const STORAGE_KEY = 'myos-settings';
const DEFAULT_SETTINGS: StoredSettings = {
  themeMode: 'system',
  showCompletedTasks: false,
  defaultEditorView: 'split',
  enableAutoSave: true,
  hasCompletedOnboarding: false,
};

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T);
}

export function getDefaultSettings(): StoredSettings {
  return { ...DEFAULT_SETTINGS };
}

export function normalizeStoredSettings(value: unknown): StoredSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return getDefaultSettings();
  const parsed = value as Record<string, unknown>;
  const defaults = getDefaultSettings();

  return {
    themeMode: isOneOf(parsed.themeMode, ['system', 'light', 'dark'])
      ? parsed.themeMode
      : defaults.themeMode,
    showCompletedTasks: typeof parsed.showCompletedTasks === 'boolean'
      ? parsed.showCompletedTasks
      : defaults.showCompletedTasks,
    defaultEditorView: isOneOf(parsed.defaultEditorView, ['split', 'preview', 'source'])
      ? parsed.defaultEditorView
      : defaults.defaultEditorView,
    enableAutoSave: typeof parsed.enableAutoSave === 'boolean'
      ? parsed.enableAutoSave
      : defaults.enableAutoSave,
    hasCompletedOnboarding: typeof parsed.hasCompletedOnboarding === 'boolean'
      ? parsed.hasCompletedOnboarding
      : defaults.hasCompletedOnboarding,
  };
}

export function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeStoredSettings(JSON.parse(stored)) : getDefaultSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
}

export function saveSettings(settings: StoredSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function getStorableSettings(state: StoredSettings): StoredSettings {
  return {
    themeMode: state.themeMode,
    showCompletedTasks: state.showCompletedTasks,
    defaultEditorView: state.defaultEditorView,
    enableAutoSave: state.enableAutoSave,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
  };
}
