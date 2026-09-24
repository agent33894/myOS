import { useEffect, useState } from 'react';
import { DEFAULT_ACCENT_ID, resolveAccent } from '@shared/design-system/accents';
import { designColorPairs, hexToHslTriplet, hexToRgbTriplet, stampInksFor } from '@shared/design-system/tokens';
import { useSettingsStore } from '../store/settings';
import { useSystemAccent } from '../hooks/useSystemAccent';

// The stamp ink and every variable derived from it in ds2.generated.css.
const ACCENT_PROPERTIES = [
  '--ds2-stamp',
  '--accent-color',
  '--accent',
  '--ring',
  '--sidebar-ring',
  '--accent-foreground',
  '--accent-contrast-text',
];

export function ThemeController() {
  const mode = useSettingsStore((state) => state.themeMode);
  const accent = useSettingsStore((state) => state.accentPreview ?? state.accent);
  const systemAccent = useSystemAccent();
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      setIsDark(dark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  // Swap the one stamp ink for the chosen accent, contrast-fitted to the
  // active paper. Inline properties on <html> win over both theme blocks; the
  // default accent simply defers to the generated CSS.
  useEffect(() => {
    const style = document.documentElement.style;
    const resolved = resolveAccent(accent, systemAccent);
    if (resolved.choice === DEFAULT_ACCENT_ID) {
      ACCENT_PROPERTIES.forEach((property) => style.removeProperty(property));
      return;
    }
    const ink = stampInksFor(resolved.hex)[isDark ? 'dark' : 'light'];
    // Fitted inks clear 4.5:1 against paper, so paper reads on the ink too.
    const onInk = isDark ? designColorPairs.paper.dark : designColorPairs.paper.light;
    style.setProperty('--ds2-stamp', ink);
    style.setProperty('--accent-color', hexToRgbTriplet(ink));
    style.setProperty('--accent', hexToHslTriplet(ink));
    style.setProperty('--ring', hexToHslTriplet(ink));
    style.setProperty('--sidebar-ring', hexToHslTriplet(ink));
    style.setProperty('--accent-foreground', hexToHslTriplet(onInk));
    style.setProperty('--accent-contrast-text', hexToRgbTriplet(onInk));
  }, [accent, systemAccent, isDark]);

  return null;
}
