import { useEffect } from 'react';
import { designColorPairs, hexToHslTriplet, hexToRgbTriplet } from '@shared/design-system/tokens';
import { useSettingsStore } from '../store/settings';
import { useSystemAccent } from '../hooks/useSystemAccent';

// The stamp ink and every variable derived from it in ds2.generated.css.
const ACCENT_PROPERTIES = ['--ds2-stamp', '--accent-color', '--accent', '--ring', '--accent-foreground', '--accent-contrast-text'];

function relativeLuminance(hex: string): number {
  const channels = hexToRgbTriplet(hex).split(', ').map((channel) => {
    const value = Number(channel) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function ThemeController() {
  const mode = useSettingsStore((state) => state.themeMode);
  const followSystemAccent = useSettingsStore((state) => state.followSystemAccent);
  const systemAccent = useSystemAccent();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  // Swap the one stamp ink for the desktop theme's accent. Inline properties
  // on <html> win over both theme blocks, so light/dark keep working.
  useEffect(() => {
    const style = document.documentElement.style;
    if (!followSystemAccent || !systemAccent) {
      ACCENT_PROPERTIES.forEach((property) => style.removeProperty(property));
      return;
    }
    const paper = designColorPairs.paper;
    const contrast = relativeLuminance(systemAccent) > 0.4 ? paper.dark : paper.light;
    style.setProperty('--ds2-stamp', systemAccent);
    style.setProperty('--accent-color', hexToRgbTriplet(systemAccent));
    style.setProperty('--accent', hexToHslTriplet(systemAccent));
    style.setProperty('--ring', hexToHslTriplet(systemAccent));
    style.setProperty('--accent-foreground', hexToHslTriplet(contrast));
    style.setProperty('--accent-contrast-text', hexToRgbTriplet(contrast));
  }, [followSystemAccent, systemAccent]);

  return null;
}
