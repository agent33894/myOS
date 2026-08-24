import { describe, expect, it } from 'vitest';
import { buildDS2CSSSource, designColorPairs, designTokens, projectSwatchFor } from './tokens';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
}

describe('Chronicle design token emitters', () => {
  it('emits deterministic CSS from the Chronicle token contract', () => {
    expect(buildDS2CSSSource()).toBe(buildDS2CSSSource());
    expect(buildDS2CSSSource()).toContain('[data-theme="dark"]');
    expect(designTokens.motion.durations.fast).toBe('150ms');
  });

  it('maps projects to swatches deterministically and case-insensitively', () => {
    expect(projectSwatchFor('Atlas')).toBe(projectSwatchFor('ATLAS'));
    // Golden values pin the FNV-1a 64 mapping so upgrades do not reshuffle projects.
    expect(projectSwatchFor('Atlas').name).toBe('rose');
    expect(projectSwatchFor('Family Home Purchase').name).toBe('umber');
  });

  it('prefers a stored swatch name over the title hash, falling back on unknown names', () => {
    expect(projectSwatchFor('Atlas', 'teal').name).toBe('teal');
    // Unknown stored values fall back to the hash so stale frontmatter never blanks a dot.
    expect(projectSwatchFor('Atlas', 'not-a-swatch').name).toBe('rose');
    expect(projectSwatchFor('Atlas', undefined).name).toBe('rose');
  });

  it('keeps primary and essential small text at WCAG text contrast in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      expect(contrast(designColorPairs.ink[mode], designColorPairs.paper[mode])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(designColorPairs.inkSecondary[mode], designColorPairs.paper[mode])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(designColorPairs.inkTertiary[mode], designColorPairs.paper[mode])).toBeGreaterThanOrEqual(3);
    }
  });
});
