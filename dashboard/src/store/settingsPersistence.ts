import { accentById, DEFAULT_ACCENT_ID, isHexColor, SYSTEM_ACCENT } from '@shared/design-system/accents';
import { isDomain } from '@shared/spec';
import { Domain } from '@shared/types';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ReadingFont = 'sans' | 'serif';

export interface StoredSettings {
  themeMode: ThemeMode;
  /** A curated accent id, `system` to follow the desktop theme, or a custom `#rrggbb`. */
  accent: string;
  /** Face for the document body: Inter or Literata. */
  readingFont: ReadingFont;
  /** One desktop notification a day when tasks are due today or overdue. */
  remindDueToday: boolean;
  hasCompletedOnboarding: boolean;
  /** The area new items take when their project has none. */
  defaultArea: Domain;
  /** Hours available for planned work, for Today's capacity line. */
  availableHours: number;
  showCapacity: boolean;
  /** Day of the week (0 Sunday – 6 Saturday) the Weekly review appears in the sidebar. */
  weeklyReviewDay: number;
  /** YYYY-MM-DD of the last finished Weekly review. */
  lastWeeklyReview: string | null;
  /** Rename a file to match its title after the title is edited. */
  renameFilesWithTitles: boolean;
  /** Focus mode softly dims paragraphs other than the one being written. */
  focusDimParagraphs: boolean;
  includeJournalInSearch: boolean;
}

const STORAGE_KEY = 'myos-settings';
const DEFAULT_SETTINGS: StoredSettings = {
  themeMode: 'system',
  accent: DEFAULT_ACCENT_ID,
  readingFont: 'sans',
  remindDueToday: false,
  hasCompletedOnboarding: false,
  defaultArea: Domain.PERSONAL,
  availableHours: 6,
  showCapacity: true,
  weeklyReviewDay: 5,
  lastWeeklyReview: null,
  renameFilesWithTitles: true,
  focusDimParagraphs: true,
  includeJournalInSearch: false,
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
    // Legacy `followSystemAccent` is intentionally dropped: its default was on
    // for everyone, so it never expressed a choice.
    accent: isAccentChoice(parsed.accent) ? parsed.accent.toLowerCase() : defaults.accent,
    readingFont: isOneOf(parsed.readingFont, ['sans', 'serif']) ? parsed.readingFont : defaults.readingFont,
    remindDueToday: typeof parsed.remindDueToday === 'boolean' ? parsed.remindDueToday : defaults.remindDueToday,
    hasCompletedOnboarding: typeof parsed.hasCompletedOnboarding === 'boolean'
      ? parsed.hasCompletedOnboarding
      : defaults.hasCompletedOnboarding,
    defaultArea: isDomain(parsed.defaultArea) ? parsed.defaultArea : defaults.defaultArea,
    availableHours: isNumberIn(parsed.availableHours, 0, 24) ? parsed.availableHours : defaults.availableHours,
    showCapacity: isBoolean(parsed.showCapacity) ? parsed.showCapacity : defaults.showCapacity,
    weeklyReviewDay:
      isNumberIn(parsed.weeklyReviewDay, 0, 6) && Number.isInteger(parsed.weeklyReviewDay) ? parsed.weeklyReviewDay : defaults.weeklyReviewDay,
    lastWeeklyReview:
      typeof parsed.lastWeeklyReview === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastWeeklyReview)
        ? parsed.lastWeeklyReview
        : defaults.lastWeeklyReview,
    renameFilesWithTitles: isBoolean(parsed.renameFilesWithTitles) ? parsed.renameFilesWithTitles : defaults.renameFilesWithTitles,
    focusDimParagraphs: isBoolean(parsed.focusDimParagraphs) ? parsed.focusDimParagraphs : defaults.focusDimParagraphs,
    includeJournalInSearch: isBoolean(parsed.includeJournalInSearch) ? parsed.includeJournalInSearch : defaults.includeJournalInSearch,
  };
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isNumberIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

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
  return Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, state[key as keyof StoredSettings]])) as unknown as StoredSettings;
}
