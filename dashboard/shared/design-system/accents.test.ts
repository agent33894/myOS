import { describe, expect, it } from 'vitest';
import {
  ACCENT_MIN_CONTRAST,
  contrastRatio,
  DEFAULT_ACCENT_ID,
  fitInkToPapers,
  PANTONE_ACCENTS,
  resolveAccent,
} from './accents';
import { buildDS2CSSSource, stampInksFor } from './tokens';

const LIGHT_PAPERS = ['#F7F4EE', '#FDFBF7'];
const DARK_PAPERS = ['#1B1A16', '#24221D'];

describe('accent palette', () => {
  it('has unique ids and six-digit hex values', () => {
    expect(new Set(PANTONE_ACCENTS.map((accent) => accent.id)).size).toBe(PANTONE_ACCENTS.length);
    for (const accent of PANTONE_ACCENTS) expect(accent.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it.each([...PANTONE_ACCENTS.map((accent) => [accent.id, accent.hex]), ['omarchy blue', '#7aa2f7'], ['white', '#ffffff'], ['black', '#000000']])(
    'fits %s to text contrast on every paper in both themes',
    (_id, hex) => {
      const inks = stampInksFor(hex);
      for (const paper of LIGHT_PAPERS) expect(contrastRatio(inks.light, paper)).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST);
      for (const paper of DARK_PAPERS) expect(contrastRatio(inks.dark, paper)).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST);
    },
  );

  it('leaves inks that already pass untouched', () => {
    expect(fitInkToPapers('#0F4C81', LIGHT_PAPERS)).toBe('#0F4C81');
    expect(fitInkToPapers('#7AA2F7', DARK_PAPERS)).toBe('#7AA2F7');
  });

  it('emits the default accent as the generated stamp', () => {
    const inks = stampInksFor(resolveAccent(DEFAULT_ACCENT_ID, null).hex);
    expect(buildDS2CSSSource()).toContain(`--ds2-stamp: ${inks.light};`);
    expect(buildDS2CSSSource()).toContain(`--ds2-stamp: ${inks.dark};`);
  });
});

describe('resolveAccent', () => {
  it('follows the desktop accent only when one is available', () => {
    expect(resolveAccent('system', '#7aa2f7')).toMatchObject({ name: 'Omarchy theme', hex: '#7AA2F7' });
    expect(resolveAccent('system', null).choice).toBe(DEFAULT_ACCENT_ID);
  });

  it('resolves Pantone ids, custom hex, and unknown values', () => {
    expect(resolveAccent('classic-blue', null)).toMatchObject({ name: 'Classic Blue', code: '19-4052' });
    expect(resolveAccent('#123456', null)).toMatchObject({ name: 'Custom', hex: '#123456' });
    expect(resolveAccent('nope', null).choice).toBe(DEFAULT_ACCENT_ID);
  });
});
