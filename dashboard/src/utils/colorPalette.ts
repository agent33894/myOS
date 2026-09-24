/**
 * Color Palette Generation Utilities
 *
 * Generates harmonious color palettes derived from the user's accent color
 * for use in charts and visualizations.
 */

/** '#5b5bd6' → '91, 91, 214' */
export function hexToRgbString(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}


/**
 * Calculate relative luminance of a color per WCAG 2.1 formula
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Convert 8-bit values (0-255) to sRGB (0-1)
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction (linearize)
  const R =
    rsRGB <= 0.04045 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G =
    gsRGB <= 0.04045 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B =
    bsRGB <= 0.04045 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance using ITU-R BT.709 coefficients
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Determine if dark text should be used on a background color
 * Uses the mathematically optimal threshold of 0.179
 *
 * @param rgbString RGB string (e.g., '155, 183, 212')
 * @returns true if dark text should be used, false for light text
 */
function shouldUseDarkText(rgbString: string): boolean {
  const [r, g, b] = rgbString.split(',').map((v) => Number(v.trim()));
  const luminance = getRelativeLuminance(r, g, b);
  // Threshold derived from: contrast with black > contrast with white
  return luminance > 0.179;
}

/**
 * Get the appropriate text color (black or white) for a background color
 *
 * @param rgbString RGB string (e.g., '155, 183, 212')
 * @returns Hex color for text ('#1a1a1a' for dark, '#ffffff' for light)
 */
export function getContrastTextColor(rgbString: string): string {
  return shouldUseDarkText(rgbString) ? '#1a1a1a' : '#ffffff';
}

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Convert RGB string (e.g., '155, 183, 212') to HSL
 */
export function rgbStringToHsl(rgbString: string): HSL {
  const [r, g, b] = rgbString.split(',').map((v) => Number(v.trim()) / 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (value: number) => {
    const hex = Math.round((value + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Normalize hue to 0-360 range
 */
function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/**
 * Keep chart colors cohesive by staying in a narrow range
 * around the current accent hue and progressively desaturating.
 */
interface EditorialSwatchTemplate {
  hueOffset: number;
  saturationScale: number;
  darkLightness: number;
  lightLightness: number;
}

const EDITORIAL_SWATCH_TEMPLATES: EditorialSwatchTemplate[] = [
  { hueOffset: 0, saturationScale: 1.0, darkLightness: 58, lightLightness: 50 },
  { hueOffset: 10, saturationScale: 0.9, darkLightness: 53, lightLightness: 47 },
  { hueOffset: -12, saturationScale: 0.82, darkLightness: 49, lightLightness: 44 },
  { hueOffset: 18, saturationScale: 0.74, darkLightness: 45, lightLightness: 41 },
  { hueOffset: -20, saturationScale: 0.67, darkLightness: 42, lightLightness: 38 },
  { hueOffset: 26, saturationScale: 0.92, darkLightness: 56, lightLightness: 49 },
  { hueOffset: -28, saturationScale: 0.84, darkLightness: 51, lightLightness: 46 },
  { hueOffset: 34, saturationScale: 0.76, darkLightness: 47, lightLightness: 42 },
  { hueOffset: -36, saturationScale: 0.69, darkLightness: 43, lightLightness: 39 },
  { hueOffset: 6, saturationScale: 0.62, darkLightness: 39, lightLightness: 36 },
  { hueOffset: -8, saturationScale: 0.56, darkLightness: 37, lightLightness: 34 },
  { hueOffset: 14, saturationScale: 0.5, darkLightness: 35, lightLightness: 33 },
  { hueOffset: -16, saturationScale: 0.44, darkLightness: 33, lightLightness: 32 },
  { hueOffset: 22, saturationScale: 0.38, darkLightness: 31, lightLightness: 31 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function generateEditorialChartScale(
  accentRgb: string,
  count: number,
  isDarkMode: boolean
): string[] {
  const hsl = rgbStringToHsl(accentRgb);
  const baseSaturation = isDarkMode
    ? clamp(hsl.s * 0.9, 42, 75)
    : clamp(hsl.s * 0.95, 44, 78);

  return Array.from({ length: count }, (_, index) => {
    const template = EDITORIAL_SWATCH_TEMPLATES[index % EDITORIAL_SWATCH_TEMPLATES.length];
    const cycle = Math.floor(index / EDITORIAL_SWATCH_TEMPLATES.length);

    const hue = normalizeHue(hsl.h + template.hueOffset + cycle * 4);
    const saturation = clamp(baseSaturation * template.saturationScale - cycle * 4, 24, 78);
    const baseLightness = isDarkMode ? template.darkLightness : template.lightLightness;
    const lightness = clamp(baseLightness - cycle * 2, isDarkMode ? 30 : 32, isDarkMode ? 64 : 56);

    return hslToHex(hue, saturation, lightness);
  });
}
