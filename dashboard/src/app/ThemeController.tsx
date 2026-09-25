import { useLayoutEffect } from 'react';
import { useSettings } from '../store/settings';
import { useAccent } from './useAccent';

/**
 * Applies Appearance settings to <html>: `data-theme`, `data-reading-font`,
 * and the one `--accent` color every other accent token derives from.
 */
export function ThemeController() {
  const { hex, isDark } = useAccent();
  const readingFont = useSettings((state) => state.readingFont);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useLayoutEffect(() => {
    document.documentElement.dataset.readingFont = readingFont;
  }, [readingFont]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--accent', hex);
  }, [hex]);

  return null;
}
