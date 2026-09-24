/**
 * Accent (stamp ink) palette for myOS.
 *
 * Each accent stores one nominal Pantone colour. The ink actually painted is
 * contrast-fitted per theme: lightness shifts (hue and saturation held) until
 * the ink reaches WCAG text contrast against every paper it sits on. That makes
 * any source — curated Pantone, the Omarchy theme accent, or a custom pick —
 * legible in both light and dark mode.
 */

interface PantoneAccent {
  /** Stable kebab-case identifier persisted in settings. */
  id: string;
  name: string;
  /** Pantone Fashion, Home + Interiors (TCX) reference. */
  code: string;
  /** Nominal sRGB approximation of the Pantone chip. */
  hex: string;
}

/** Ordered around the hue wheel so the picker reads as a spectrum. */
export const PANTONE_ACCENTS: PantoneAccent[] = [
  { id: 'chili-pepper', name: 'Chili Pepper', code: '19-1557', hex: '#9B1B30' },
  { id: 'viva-magenta', name: 'Viva Magenta', code: '18-1750', hex: '#BB2649' },
  { id: 'honeysuckle', name: 'Honeysuckle', code: '18-2120', hex: '#D94F70' },
  { id: 'tangerine-tango', name: 'Tangerine Tango', code: '17-1463', hex: '#DD4124' },
  { id: 'mocha-mousse', name: 'Mocha Mousse', code: '17-1230', hex: '#A47864' },
  { id: 'mimosa', name: 'Mimosa', code: '14-0848', hex: '#F0C05A' },
  { id: 'greenery', name: 'Greenery', code: '15-0343', hex: '#88B04B' },
  { id: 'emerald', name: 'Emerald', code: '17-5641', hex: '#009473' },
  { id: 'turquoise', name: 'Turquoise', code: '15-5519', hex: '#45B5AA' },
  { id: 'cerulean', name: 'Cerulean', code: '15-4020', hex: '#9BB7D4' },
  { id: 'classic-blue', name: 'Classic Blue', code: '19-4052', hex: '#0F4C81' },
  { id: 'very-peri', name: 'Very Peri', code: '17-3938', hex: '#6667AB' },
  { id: 'ultra-violet', name: 'Ultra Violet', code: '18-3838', hex: '#5F4B8B' },
  { id: 'radiant-orchid', name: 'Radiant Orchid', code: '18-3224', hex: '#B163A3' },
  { id: 'marsala', name: 'Marsala', code: '18-1438', hex: '#955251' },
];

export const DEFAULT_ACCENT_ID = 'ultra-violet';

/** Settings value that follows the desktop (Omarchy) theme accent. */
export const SYSTEM_ACCENT = 'system';

/** Minimum contrast for the stamp ink: it is used for small active-state text. */
export const ACCENT_MIN_CONTRAST = 4.5;

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value);
}

export function pantoneAccentById(id: string): PantoneAccent | undefined {
  return PANTONE_ACCENTS.find((accent) => accent.id === id);
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

export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

function fromHsl(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const sectors: [number, number, number][] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ];
  const [r, g, b] = sectors[Math.min(5, Math.floor(hue / 60))];
  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Shift `hex` toward dark (on light paper) or light (on dark paper) just far
 * enough to reach `minContrast` against every background. Inks that already
 * pass are returned unchanged, so well-chosen colours stay exact.
 */
export function fitInkToPapers(hex: string, papers: string[], minContrast = ACCENT_MIN_CONTRAST): string {
  const passes = (candidate: string) => papers.every((paper) => contrastRatio(candidate, paper) >= minContrast);
  const normalized = hex.toUpperCase();
  if (passes(normalized)) return normalized;

  const [hue, saturation, lightness] = toHsl(normalized);
  const darken = papers.every((paper) => relativeLuminance(paper) > 0.5);
  // Binary search the lightness closest to the original that still passes.
  let low = darken ? 0 : lightness;
  let high = darken ? lightness : 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    const candidatePasses = passes(fromHsl(hue, saturation, mid));
    if (darken === candidatePasses) low = mid;
    else high = mid;
  }
  return fromHsl(hue, saturation, darken ? low : high);
}

interface ResolvedAccent {
  /** The settings value this resolved from, after fallbacks. */
  choice: string;
  name: string;
  /** Pantone reference, when the accent is a curated swatch. */
  code?: string;
  /** Nominal colour before contrast fitting. */
  hex: string;
}

/**
 * Turn a stored accent choice into a concrete colour. Following the desktop
 * theme without one available (macOS, non-Omarchy Linux) and unknown values
 * both fall back to the default Pantone accent.
 */
export function resolveAccent(choice: string, systemAccent: string | null): ResolvedAccent {
  if (choice === SYSTEM_ACCENT && systemAccent && isHexColor(systemAccent)) {
    return { choice, name: 'Omarchy theme', hex: systemAccent.toUpperCase() };
  }
  if (isHexColor(choice)) return { choice, name: 'Custom', hex: choice.toUpperCase() };
  const pantone = pantoneAccentById(choice) ?? pantoneAccentById(DEFAULT_ACCENT_ID)!;
  return { choice: pantone.id, name: pantone.name, code: pantone.code, hex: pantone.hex };
}
