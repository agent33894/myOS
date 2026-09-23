import { existsSync, readFileSync, watch, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Omarchy publishes the active theme here; `theme.name` is rewritten on every
// theme switch, so watching this directory is enough to follow changes.
const OMARCHY_CURRENT = join(homedir(), '.local', 'state', 'omarchy', 'current');

/** The active Omarchy theme accent as `#rrggbb`, or null outside Omarchy. */
export function readOmarchyAccent(): string | null {
  if (process.platform !== 'linux') return null;
  try {
    const colors = readFileSync(join(OMARCHY_CURRENT, 'theme', 'colors.toml'), 'utf8');
    const accent = colors.match(/^\s*accent\s*=\s*"(#[0-9a-f]{6})"/im)?.[1];
    return accent ? accent.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function watchOmarchyAccent(onChange: (accent: string | null) => void): FSWatcher | null {
  if (process.platform !== 'linux' || !existsSync(OMARCHY_CURRENT)) return null;
  let last = readOmarchyAccent();
  let timer: NodeJS.Timeout | null = null;
  try {
    return watch(OMARCHY_CURRENT, () => {
      if (timer) clearTimeout(timer);
      // A theme switch touches several files; read once it settles.
      timer = setTimeout(() => {
        const next = readOmarchyAccent();
        if (next !== last) {
          last = next;
          onChange(next);
        }
      }, 300);
    });
  } catch {
    return null;
  }
}
