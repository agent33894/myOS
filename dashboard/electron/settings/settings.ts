import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { DAILY_DEFAULTS } from '../../shared/daily';
import { DEFAULT_SETTINGS, validSettings, type Settings } from '../../shared/settings';
import { DomainError } from '../errors';
import { appDataPath } from '../utils/app-data';
import { currentWorkspace } from '../workspace/root';

const settingsFile = () => join(appDataPath(), 'settings.json');

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Only what the user changed is stored; everything else follows the defaults. */
const stored = (): Partial<Settings> => validSettings(readJson(settingsFile()));

/** Obsidian's daily-notes settings in the open folder, when it has them (Obsidian's defaults: the top folder, YYYY-MM-DD). */
function obsidianDaily(): Partial<Settings> {
  const root = currentWorkspace();
  const config = root ? (readJson(join(root, '.obsidian', 'daily-notes.json')) as { folder?: unknown; format?: unknown } | null) : null;
  if (!config || typeof config !== 'object') return {};
  return validSettings({
    dailyFolder: typeof config.folder === 'string' ? config.folder : '',
    dailyPattern: typeof config.format === 'string' && config.format.trim() ? config.format : DAILY_DEFAULTS.pattern,
  });
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...obsidianDaily(), ...stored() };
}

/** Store the keys in `patch`; any key that is unknown or has an unusable value fails the whole change. */
export function setSettings(patch: Partial<Settings>): Settings {
  const valid = validSettings(patch, getSettings());
  const rejected = Object.keys(patch).filter((key) => !(key in valid));
  if (rejected.length > 0) throw new DomainError('INVALID', `These settings can’t be saved: ${rejected.join(', ')}.`);
  mkdirSync(dirname(settingsFile()), { recursive: true });
  writeFileSync(settingsFile(), JSON.stringify({ ...stored(), ...valid }, null, 2));
  return getSettings();
}
