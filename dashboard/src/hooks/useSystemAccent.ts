import { useEffect, useState } from 'react';
import { invoke, subscribe } from '../data/ipc';

/** The desktop theme's accent (Omarchy on Linux), or null when there is none. */
export function useSystemAccent(): string | null {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void invoke('system:accent').then((value) => {
      if (active) setAccent(value);
    });
    const unsubscribe = subscribe('system:accent-changed', ({ accent: next }) => setAccent(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return accent;
}
