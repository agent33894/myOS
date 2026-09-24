/**
 * Accent choices and decorative project colors.
 *
 * The accent is one color, applied as `--accent` on <html> by ThemeController;
 * the rest of the accent ramp derives from it in CSS. White text sits on the
 * accent in both themes, so every accent is fitted to reach 4.5:1 against white.
 */

interface Accent {
  /** Stable identifier persisted in settings. */
  id: string;
  name: string;
  hex: string;
}

/** Curated accents, ordered around the hue wheel. Each clears 4.5:1 with white text. */
export const ACCENTS: readonly Accent[] = [
  { id: 'iris', name: 'Iris', hex: '#5B5BD6' },
  { id: 'violet', name: 'Violet', hex: '#8746C8' },
  { id: 'pink', name: 'Pink', hex: '#C0369A' },
  { id: 'rose', name: 'Rose', hex: '#D1335F' },
  { id: 'orange', name: 'Orange', hex: '#C8481F' },
  { id: 'amber', name: 'Amber', hex: '#B25A00' },
  { id: 'green', name: 'Green', hex: '#2E7D4F' },
  { id: 'teal', name: 'Teal', hex: '#0F7B78' },
  { id: 'sky', name: 'Sky', hex: '#0B74A8' },
  { id: 'blue', name: 'Blue', hex: '#2F6BD8' },
  { id: 'graphite', name: 'Graphite', hex: '#5E636B' },
];

export const DEFAULT_ACCENT_ID = 'iris';

/** Settings value that follows the desktop (Omarchy) theme accent. */
export const SYSTEM_ACCENT = 'system';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const WHITE = '#FFFFFF';
const MIN_CONTRAST = 4.5;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value);
}

export function accentById(id: string): Accent | undefined {
  return ACCENTS.find((accent) => accent.id === id);
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Darken `hex` toward black just enough for white text to reach 4.5:1. */
function fitForWhiteText(hex: string): string {
  if (contrastRatio(hex, WHITE) >= MIN_CONTRAST) return hex;
  const [r, g, b] = channels(hex);
  let low = 0;
  let high = 1;
  const scaled = (factor: number) =>
    `#${[r, g, b].map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  for (let step = 0; step < 20; step += 1) {
    const mid = (low + high) / 2;
    if (contrastRatio(scaled(mid), WHITE) >= MIN_CONTRAST) low = mid;
    else high = mid;
  }
  return scaled(low);
}

interface ResolvedAccent {
  /** The settings value this resolved from, after fallbacks. */
  choice: string;
  name: string;
  /** The color painted as `--accent`. */
  hex: string;
}

/**
 * Turn a stored accent choice into the color to paint. A missing desktop
 * accent (macOS, non-Omarchy Linux) and unknown values fall back to Iris.
 */
export function resolveAccent(choice: string, systemAccent: string | null): ResolvedAccent {
  if (choice === SYSTEM_ACCENT && isHexColor(systemAccent)) {
    return { choice, name: 'Desktop theme', hex: fitForWhiteText(systemAccent.toUpperCase()) };
  }
  if (isHexColor(choice)) return { choice, name: 'Custom', hex: fitForWhiteText(choice.toUpperCase()) };
  const accent = accentById(choice) ?? accentById(DEFAULT_ACCENT_ID)!;
  return { choice: accent.id, name: accent.name, hex: accent.hex };
}

interface Swatch {
  /** Stable name persisted in project frontmatter (`swatch:`). */
  name: string;
  displayName: string;
  /** Mid-tone that reads on both themes. Decorative only: dots and covers. */
  hex: string;
}

export const projectSwatches: readonly Swatch[] = [
  { name: 'terracotta', displayName: 'Terracotta', hex: '#BE6A4C' },
  { name: 'marigold', displayName: 'Marigold', hex: '#D9A03C' },
  { name: 'olive', displayName: 'Olive', hex: '#8B8B3E' },
  { name: 'sage', displayName: 'Sage', hex: '#86A489' },
  { name: 'teal', displayName: 'Teal', hex: '#4E8F8B' },
  { name: 'cornflower', displayName: 'Cornflower', hex: '#6C8DC9' },
  { name: 'iris', displayName: 'Iris', hex: '#8B7BC7' },
  { name: 'plum', displayName: 'Plum', hex: '#9C5B88' },
  { name: 'rose', displayName: 'Rose', hex: '#C36F8E' },
  { name: 'oxblood', displayName: 'Oxblood', hex: '#8E3B3B' },
  { name: 'slate', displayName: 'Slate', hex: '#6E7B8A' },
  { name: 'umber', displayName: 'Umber', hex: '#8A6B4F' },
];

// Deterministic project → swatch mapping: FNV-1a 64-bit over the lowercased
// UTF-8 name, modulo the swatch count. Changing this recolors every project.
const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

export function projectSwatchFor(projectName: string, storedSwatch?: string): Swatch {
  if (storedSwatch) {
    const stored = projectSwatches.find((swatch) => swatch.name === storedSwatch);
    if (stored) return stored;
  }
  let hash = FNV_OFFSET_64;
  for (const byte of new TextEncoder().encode(projectName.toLowerCase())) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return projectSwatches[Number(hash % BigInt(projectSwatches.length))];
}
