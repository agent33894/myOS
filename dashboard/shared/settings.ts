import { DAILY_DEFAULTS } from './daily';
import { accentById, DEFAULT_ACCENT_ID, isHexColor, SYSTEM_ACCENT } from './design-system/accents';

/** A saved search, pinned to the sidebar. `id` names it in URLs (`/view/:id`). */
export interface PinnedView {
  id: string;
  name: string;
  query: string;
  kind: 'tasks' | 'notes';
}

export interface ColumnPrefs {
  width: number;
  collapsed: boolean;
}

/**
 * App settings, kept in the app data folder (never in the user's folder).
 * `dailyFolder` and `dailyPattern` fall back to Obsidian's daily-notes
 * settings in the open folder, then to `daily/` and `YYYY-MM-DD`.
 */
export interface Settings {
  dailyFolder: string;
  dailyPattern: string;
  /** Where captures go: today's daily note, or a file path in the folder. */
  captureTarget: 'daily' | string;
  /** Captures land at the end of this heading's section; null for the end of the file. */
  captureHeading: string | null;
  /** How a newly opened tab shows a note. */
  editorMode: 'rendered' | 'source';
  vimKeys: boolean;
  theme: 'system' | 'light' | 'dark';
  /** A curated accent id, `system` to follow the desktop theme, or a custom `#rrggbb`. */
  accent: string;
  readingFont: 'sans' | 'serif';
  pinnedViews: PinnedView[];
  sidebar: { left: ColumnPrefs; right: ColumnPrefs };
  /** Paths opened recently, newest first. */
  recentFiles: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  dailyFolder: DAILY_DEFAULTS.folder,
  dailyPattern: DAILY_DEFAULTS.pattern,
  captureTarget: 'daily',
  captureHeading: null,
  editorMode: 'rendered',
  vimKeys: false,
  theme: 'system',
  accent: DEFAULT_ACCENT_ID,
  readingFont: 'sans',
  pinnedViews: [
    { id: 'this-week', name: 'This week', query: 'open due<=today+7 sort:due', kind: 'tasks' },
  ],
  sidebar: { left: { width: 248, collapsed: false }, right: { width: 280, collapsed: true } },
  recentFiles: [],
};

const RECENT_LIMIT = 20;

const isString = (value: unknown): value is string => typeof value === 'string';
const oneOf = <T extends string>(options: readonly T[]) => (value: unknown): value is T => options.includes(value as T);
const clamp = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(480, Math.max(160, value))) : fallback);

const column = (value: unknown, fallback: ColumnPrefs): ColumnPrefs => {
  const record = (value && typeof value === 'object' ? value : {}) as Partial<ColumnPrefs>;
  return { width: clamp(record.width, fallback.width), collapsed: typeof record.collapsed === 'boolean' ? record.collapsed : fallback.collapsed };
};

const isView = (value: unknown): value is PinnedView => {
  const view = value as PinnedView | null;
  return Boolean(view && isString(view.id) && view.id && isString(view.name) && isString(view.query) && oneOf(['tasks', 'notes'] as const)(view.kind));
};

type Check = { [K in keyof Settings]: (value: unknown, fallback: Settings[K]) => Settings[K] | undefined };

const CHECKS: Check = {
  dailyFolder: (value) => (isString(value) ? value.trim().replace(/^\/+|\/+$/g, '') : undefined),
  dailyPattern: (value) => (isString(value) && value.trim() ? value.trim() : undefined),
  captureTarget: (value) => (value === 'daily' || (isString(value) && /\.md$/i.test(value)) ? value : undefined),
  captureHeading: (value) => (value === null ? null : isString(value) ? value.trim() || null : undefined),
  editorMode: (value) => (oneOf(['rendered', 'source'] as const)(value) ? value : undefined),
  vimKeys: (value) => (typeof value === 'boolean' ? value : undefined),
  theme: (value) => (oneOf(['system', 'light', 'dark'] as const)(value) ? value : undefined),
  accent: (value) => (isString(value) && (value === SYSTEM_ACCENT || isHexColor(value) || accentById(value)) ? value.toLowerCase() : undefined),
  readingFont: (value) => (oneOf(['sans', 'serif'] as const)(value) ? value : undefined),
  pinnedViews: (value) => (Array.isArray(value) ? value.filter(isView) : undefined),
  sidebar: (value, fallback) => {
    const record = (value && typeof value === 'object' ? value : {}) as Partial<Settings['sidebar']>;
    return { left: column(record.left, fallback.left), right: column(record.right, fallback.right) };
  },
  recentFiles: (value) => (Array.isArray(value) ? [...new Set(value.filter(isString))].slice(0, RECENT_LIMIT) : undefined),
};

/** Keep the keys of `value` that are valid settings, dropping anything else. */
export function validSettings(value: unknown, base: Settings = DEFAULT_SETTINGS): Partial<Settings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const valid: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const check = CHECKS[key as keyof Settings] as ((value: unknown, fallback: unknown) => unknown) | undefined;
    const checked = check?.(raw, base[key as keyof Settings]);
    if (checked !== undefined) valid[key] = checked;
  }
  return valid as Partial<Settings>;
}
