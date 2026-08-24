/**
 * Chronicle Design System token source of truth for myOS.
 *
 * Colors here are curated for the paper-and-ink editorial language and are
 * WCAG-gated in the accompanying unit tests:
 *   - ink text pairs must reach >= 4.5:1 against their paper
 *   - tertiary ink must reach >= 3.0:1
 *   - project swatches (decorative: covers/dots/rings/washes) >= 2.0:1
 * The emitter below produces deterministic CSS for the desktop app.
 */

interface DS2ColorPair {
  /** Stable lowerCamelCase token identifier. */
  name: string;
  /** Human label for pickers/preview gallery. */
  displayName: string;
  /** Hex sRGB used in light mode (on light paper). */
  light: string;
  /** Hex sRGB used in dark mode (on dark paper). */
  dark: string;
}

interface DS2Swatch {
  name: string;
  displayName: string;
  /** Single mid-tone value that reads on both papers. */
  hex: string;
}

const papers: DS2ColorPair[] = [
  { name: 'paper', displayName: 'Paper', light: '#F7F4EE', dark: '#1B1A16' },
  { name: 'paperElevated', displayName: 'Paper · Elevated', light: '#FDFBF7', dark: '#24221D' },
  { name: 'paperInset', displayName: 'Paper · Inset', light: '#EFEAE0', dark: '#151411' },
];

const inkText: DS2ColorPair[] = [
  { name: 'ink', displayName: 'Ink', light: '#1F1C17', dark: '#F0EDE4' },
  { name: 'inkSecondary', displayName: 'Ink · Secondary', light: '#57534A', dark: '#A8A399' },
  { name: 'inkTertiary', displayName: 'Ink · Tertiary', light: '#8A857A', dark: '#787369' },
];

const stamp: DS2ColorPair = {
  name: 'stamp',
  displayName: 'Stamp (Vermilion)',
  light: '#A63A22',
  dark: '#E06A4B',
};

export const stampColorPair = stamp;

const semantic: DS2ColorPair[] = [
  { name: 'success', displayName: 'Success', light: '#3A7048', dark: '#7FBF97' },
  { name: 'warning', displayName: 'Warning', light: '#855D00', dark: '#D9A63F' },
  { name: 'error', displayName: 'Error', light: '#B02E24', dark: '#E5766B' },
  { name: 'info', displayName: 'Info', light: '#2E6099', dark: '#7FB0DF' },
];

export const projectSwatches: DS2Swatch[] = [
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

// Deterministic project → swatch mapping using FNV-1a 64-bit over the
// lowercased UTF-8 name, modulo the swatch count.
const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

export function projectSwatchFor(projectName: string, storedSwatch?: string): DS2Swatch {
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

export const designColorPairs = {
  paper: papers[0],
  ink: inkText[0],
  inkSecondary: inkText[1],
  inkTertiary: inkText[2],
} as const;

/** Shape scale: 8/12/18, continuous corners. */
export const designTokens = {
  radii: { small: 8, medium: 12, large: 18 },
  /** Entry reading rhythm, shared by desktop CSS and native Swift. */
  spacing: { intraBlock: 6, interBlock: 14, section: 20, pageMargin: 20 },
  motion: {
    durations: { fast: '150ms', normal: '200ms', medium: '300ms', slow: '400ms', emphasis: '600ms' },
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
  typography: {
    display: '"Instrument Serif", Georgia, serif',
    reading: 'Literata, Georgia, serif',
    chrome: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
    mono: 'GeistMono-Variable, "SF Mono", ui-monospace, monospace',
    /** Target body line-height and MarkdownUI's additive leading. */
    readingLineHeight: 1.6,
    paragraphRelativeLineSpacing: 0.4,
    entryBodySize: 18,
    entryCodeSize: 13,
    codeRelativeLineSpacing: 0.28,
  },
  rules: { subtle: 0.12, standard: 0.2, strong: 0.34 },
  shadows: { raised: '0 18px 48px rgba(16, 13, 9, 0.18)', overlay: '0 24px 80px rgba(16, 13, 9, 0.3)' },
} as const;

/** Desktop-only material tokens for dense controls and warm paper surfaces. */
const desktopDesignTokens = {
  radii: { chip: 4, control: 8, overlay: 12 },
  rules: { faint: 0.07, standard: 0.14, strong: 0.24 },
  /**
   * Overlay scrim — a true shadow that darkens in BOTH themes. Never derive
   * this from ink: ink is near-white in dark mode, and an ink-mixed scrim
   * would brighten the room when a surface is summoned.
   */
  scrim: { light: 'rgba(20, 15, 9, 0.34)', dark: 'rgba(0, 0, 0, 0.42)' },
  shadows: {
    light: {
      lifted: '0 1px 1px rgba(20, 15, 9, 0.05), 0 3px 6px rgba(20, 15, 9, 0.06)',
      floating: '0 1px 2px rgba(20, 15, 9, 0.08), 0 10px 18px rgba(20, 15, 9, 0.11)',
    },
    dark: {
      lifted: '0 1px 1px rgba(20, 15, 9, 0.11), 0 3px 6px rgba(20, 15, 9, 0.132)',
      floating: '0 1px 2px rgba(20, 15, 9, 0.176), 0 10px 18px rgba(20, 15, 9, 0.242)',
    },
  },
} as const;

function hexToHslTriplet(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return `${hue.toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(lightness * 100).toFixed(1)}%`;
}

function hexToRgbTriplet(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function themeVariables(mode: 'light' | 'dark'): string[] {
  const key = mode;
  const token = (name: string) => [...papers, ...inkText, stamp, ...semantic].find((item) => item.name === name)![key];
  const paper = token('paper');
  const elevated = token('paperElevated');
  const inset = token('paperInset');
  const ink = token('ink');
  const secondary = token('inkSecondary');
  const tertiary = token('inkTertiary');
  const accent = token('stamp');
  const success = token('success');
  const warning = token('warning');
  const error = token('error');
  const info = token('info');
  return [
    `  color-scheme: ${mode};`,
    `  --ds2-paper: ${paper};`,
    `  --ds2-paper-elevated: ${elevated};`,
    `  --ds2-paper-inset: ${inset};`,
    `  --ds2-ink: ${ink};`,
    `  --ds2-ink-secondary: ${secondary};`,
    `  --ds2-ink-tertiary: ${tertiary};`,
    `  --ds2-stamp: ${accent};`,
    `  --accent-color: ${hexToRgbTriplet(accent)};`,
    `  --accent-color-rgb: var(--accent-color);`,
    `  --accent-contrast-text: ${hexToRgbTriplet(paper)};`,
    `  --ed-success: ${hexToHslTriplet(success)};`,
    `  --ed-warning: ${hexToHslTriplet(warning)};`,
    `  --ed-error: ${hexToHslTriplet(error)};`,
    `  --ed-info: ${hexToHslTriplet(info)};`,
    `  --ed-success-muted: ${hexToHslTriplet(success)} / 0.12;`,
    `  --ed-warning-muted: ${hexToHslTriplet(warning)} / 0.12;`,
    `  --ed-error-muted: ${hexToHslTriplet(error)} / 0.12;`,
    `  --ed-info-muted: ${hexToHslTriplet(info)} / 0.12;`,
    `  --background: ${hexToHslTriplet(paper)};`,
    `  --foreground: ${hexToHslTriplet(ink)};`,
    `  --card: ${hexToHslTriplet(elevated)};`,
    `  --card-foreground: ${hexToHslTriplet(ink)};`,
    `  --popover: ${hexToHslTriplet(elevated)};`,
    `  --popover-foreground: ${hexToHslTriplet(ink)};`,
    `  --primary: ${hexToHslTriplet(ink)};`,
    `  --primary-foreground: ${hexToHslTriplet(paper)};`,
    `  --secondary: ${hexToHslTriplet(inset)};`,
    `  --secondary-foreground: ${hexToHslTriplet(ink)};`,
    `  --muted: ${hexToHslTriplet(inset)};`,
    `  --muted-foreground: ${hexToHslTriplet(secondary)};`,
    `  --destructive: ${hexToHslTriplet(error)};`,
    `  --destructive-foreground: ${hexToHslTriplet(paper)};`,
    `  --accent: ${hexToHslTriplet(accent)};`,
    `  --accent-foreground: ${hexToHslTriplet(paper)};`,
    `  --border: ${hexToHslTriplet(ink)} / ${desktopDesignTokens.rules.standard};`,
    `  --input: ${hexToHslTriplet(ink)} / ${desktopDesignTokens.rules.standard};`,
    `  --ring: ${hexToHslTriplet(accent)};`,
    `  --sidebar-background: ${hexToHslTriplet(inset)};`,
    `  --sidebar-foreground: ${hexToHslTriplet(ink)};`,
    `  --sidebar-accent: ${hexToHslTriplet(paper)};`,
    `  --sidebar-accent-foreground: ${hexToHslTriplet(ink)};`,
    `  --sidebar-border: ${hexToHslTriplet(ink)} / ${desktopDesignTokens.rules.standard};`,
    `  --sidebar-ring: ${hexToHslTriplet(accent)};`,
    `  --rule-faint: color-mix(in srgb, var(--ds2-ink) ${desktopDesignTokens.rules.faint * 100}%, transparent);`,
    `  --rule-standard: color-mix(in srgb, var(--ds2-ink) ${desktopDesignTokens.rules.standard * 100}%, transparent);`,
    `  --rule-strong: color-mix(in srgb, var(--ds2-ink) ${desktopDesignTokens.rules.strong * 100}%, transparent);`,
    `  --shadow-lifted: ${desktopDesignTokens.shadows[mode].lifted};`,
    `  --shadow-overlay: ${desktopDesignTokens.shadows[mode].floating};`,
    `  --ds2-scrim: ${desktopDesignTokens.scrim[mode]};`,
  ];
}

export function buildDS2CSSSource(): string {
  return [
    '/* GENERATED FILE - DO NOT EDIT. */',
    '/* Source: dashboard/shared/design-system/tokens.ts */',
    ':root, [data-theme="light"] {',
    ...themeVariables('light'),
    '}',
    '',
    '[data-theme="dark"] {',
    ...themeVariables('dark'),
    '}',
    '',
    ':root {',
    `  --font-display: ${designTokens.typography.display};`,
    `  --font-reading: ${designTokens.typography.reading};`,
    `  --font-chrome: ${designTokens.typography.chrome};`,
    `  --font-mono: ${designTokens.typography.mono};`,
    `  --reading-line-height: ${designTokens.typography.readingLineHeight};`,
    `  --space-intra-block: ${designTokens.spacing.intraBlock}px;`,
    `  --space-inter-block: ${designTokens.spacing.interBlock}px;`,
    `  --space-section: ${designTokens.spacing.section}px;`,
    `  --space-page-margin: ${designTokens.spacing.pageMargin}px;`,
    `  --radius-chip: ${desktopDesignTokens.radii.chip}px;`,
    `  --radius-control: ${desktopDesignTokens.radii.control}px;`,
    `  --radius-overlay: ${desktopDesignTokens.radii.overlay}px;`,
    `  --radius: ${desktopDesignTokens.radii.control}px;`,
    `  --timing-fast: ${designTokens.motion.durations.fast};`,
    `  --timing-normal: ${designTokens.motion.durations.normal};`,
    `  --timing-medium: ${designTokens.motion.durations.medium};`,
    `  --timing-slow: ${designTokens.motion.durations.slow};`,
    `  --timing-emphasis: ${designTokens.motion.durations.emphasis};`,
    `  --easing-standard: ${designTokens.motion.easing.standard};`,
    `  --easing-bounce: ${designTokens.motion.easing.bounce};`,
    `  --easing-smooth: ${designTokens.motion.easing.smooth};`,
    '}',
    '',
  ].join('\n');
}
