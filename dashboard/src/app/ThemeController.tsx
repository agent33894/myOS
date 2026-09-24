import { useLayoutEffect } from 'react';
import { useSettingsStore } from '../store/settings';
import { useAccent } from './useAccent';

/**
 * Applies Appearance settings to <html>: `data-theme`, `data-reading-font`,
 * and the one `--accent` color every other accent token derives from.
 */
export function ThemeController() {
  const { hex, isDark } = useAccent();
  const readingFont = useSettingsStore((state) => state.readingFont);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useLayoutEffect(() => {
    document.documentElement.dataset.readingFont = readingFont;
  }, [readingFont]);

  useLayoutEffect(() => {
    const style = document.documentElement.style;
    style.setProperty('--accent', hex);
    // TEMPORARY: legacy `rgb(var(--accent-color))` consumers; remove with styles/legacy.css.
    const value = Number.parseInt(hex.slice(1), 16);
    style.setProperty('--accent-color', `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`);
  }, [hex]);

  return null;
}
