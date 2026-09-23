import { useEffect, useState } from 'react';

/** The desktop theme's accent (Omarchy on Linux), or null when there is none. */
export function useSystemAccent(): string | null {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.electronAPI.getSystemAccent().then((value) => {
      if (active) setAccent(value);
    });
    const unsubscribe = window.electronAPI.onSystemAccentChanged(({ accent: next }) => setAccent(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return accent;
}
