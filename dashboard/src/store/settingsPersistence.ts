import { accentById, DEFAULT_ACCENT_ID, isHexColor, SYSTEM_ACCENT } from '@shared/design-system/accents';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ReadingFont = 'sans' | 'serif';

export interface StoredSettings {
  themeMode: ThemeMode;
  showCompletedTasks: boolean;
  /** A curated accent id, `system` to follow the desktop theme, or a custom `#rrggbb`. */
  accent: string;
  /** Face for the document body: Inter or Literata. */
  readingFont: ReadingFont;
  enableAutoSave: boolean;
  hasCompletedOnboarding: boolean;
}

const STORAGE_KEY = 'myos-settings';
const DEFAULT_SETTINGS: StoredSettings = {
  themeMode: 'system',
  showCompletedTasks: false,
  accent: DEFAULT_ACCENT_ID,
  readingFont: 'sans',
  enableAutoSave: true,
  hasCompletedOnboarding: false,
};

export function isAccentChoice(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value === SYSTEM_ACCENT || isHexColor(value) || accentById(value) !== undefined;
}

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
    // Legacy `followSystemAccent` is intentionally dropped: its default was on
    // for everyone, so it never expressed a choice.
    accent: isAccentChoice(parsed.accent) ? parsed.accent.toLowerCase() : defaults.accent,
    readingFont: isOneOf(parsed.readingFont, ['sans', 'serif']) ? parsed.readingFont : defaults.readingFont,
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
    accent: state.accent,
    readingFont: state.readingFont,
    enableAutoSave: state.enableAutoSave,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
  };
}
