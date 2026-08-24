import { useEffect } from 'react';
import { useSettingsStore } from '../store/settings';

export function ThemeController() {
  const mode = useSettingsStore((state) => state.themeMode);

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

  return null;
}
