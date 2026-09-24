import { useSyncExternalStore } from 'react';
import { resolveAccent } from '@shared/design-system/accents';
import { useSettingsStore } from '../store/settings';
import { useSystemAccent } from './useSystemAccent';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function subscribeToColorScheme(listener: () => void) {
  const media = darkQuery();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

/** Whether the dark theme is active, from Appearance settings and the OS. */
export function useIsDark(): boolean {
  const mode = useSettingsStore((state) => state.themeMode);
  const systemDark = useSyncExternalStore(subscribeToColorScheme, () => darkQuery().matches);
  return mode === 'dark' || (mode === 'system' && systemDark);
}

/**
 * The live accent for code that needs it as a value (charts, canvases).
 * Styling should use the `accent` Tailwind colors instead.
 */
export function useAccent(): { hex: string; isDark: boolean } {
  const choice = useSettingsStore((state) => state.accentPreview ?? state.accent);
  const systemAccent = useSystemAccent();
  const isDark = useIsDark();
  return { hex: resolveAccent(choice, systemAccent).hex, isDark };
}
