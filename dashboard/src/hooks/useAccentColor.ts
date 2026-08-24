import { useEffect, useMemo, useState } from 'react';
import { projectSwatches, stampColorPair } from '@shared/design-system/tokens';
import type { Domain, ArtifactType } from '../types/artifacts';

/**
 * The accent is the DS2 vermilion stamp — one ink, theme-aware, not a user
 * setting. `--accent-color` / `--accent-contrast-text` are defined per theme
 * in styles/themes/_variables.css; this hook exposes the same values to
 * components that need them imperatively (charts, canvases).
 */
function hexToRgbTriplet(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export function useAccentColor() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark',
  );

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.dataset.theme === 'dark');
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const stampHex = isDark ? stampColorPair.dark : stampColorPair.light;
  const pantoneColor = {
    rgb: hexToRgbTriplet(stampHex),
    hex: stampHex,
    name: 'Vermilion',
  };

  const accentBgStyle = { backgroundColor: 'var(--ds2-stamp)' };
  const accentTextStyle = { color: 'var(--ds2-stamp)' };
  const accentBorderStyle = { borderColor: 'var(--ds2-stamp)' };
  const accentRingStyle = {
    '--tw-ring-color': 'color-mix(in srgb, var(--ds2-stamp) 20%, transparent)',
  } as React.CSSProperties;

  const domainPalette = useMemo(
    () => ({
      work: projectSwatches[5].hex,
      personal: projectSwatches[3].hex,
      research: projectSwatches[6].hex,
      creative: projectSwatches[1].hex,
    }),
    [],
  ) as Record<Domain, string>;

  const typePalette = useMemo(
    () =>
      Object.fromEntries(
        [
          'todo',
          'query',
          'snippet',
          'decision',
          'meeting',
          'memo',
          'research',
          'project',
          'prompt',
          'development',
          'inbox',
        ].map((type, index) => [type, projectSwatches[index % projectSwatches.length].hex]),
      ),
    [],
  ) as Record<ArtifactType, string>;

  return {
    accentColor: 'vermilion',
    pantoneColor,
    accentBg: 'accent-bg',
    accentBgStyle,
    accentText: 'accent-text',
    accentTextStyle,
    accentBorder: 'accent-border',
    accentBorderStyle,
    accentRing: 'accent-ring',
    accentRingStyle,
    accentBgText: 'text-on-accent',
    needsDarkText: false,
    isDark,
    domainPalette,
    typePalette,
  };
}
