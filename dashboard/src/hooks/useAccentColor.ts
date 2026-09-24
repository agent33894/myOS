import { useEffect, useMemo, useState } from 'react';
import { projectSwatches, stampColorPair } from '@shared/design-system/tokens';
import type { Domain, ArtifactType } from '@shared/types';

/**
 * The accent is the DS2 stamp — one user-chosen ink, contrast-fitted per theme.
 * ThemeController sets `--ds2-stamp` inline on <html> for non-default accents;
 * this hook exposes the live value to components that need it imperatively
 * (charts, canvases).
 */
function hexToRgbTriplet(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export function useAccentColor() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark',
  );
  const [systemStamp, setSystemStamp] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const root = document.documentElement;
      setIsDark(root.dataset.theme === 'dark');
      setSystemStamp(root.style.getPropertyValue('--ds2-stamp').trim() || null);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  const stampHex = systemStamp ?? (isDark ? stampColorPair.dark : stampColorPair.light);
  const pantoneColor = {
    rgb: hexToRgbTriplet(stampHex),
    hex: stampHex,
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
    accentColor: 'stamp',
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
