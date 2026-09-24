import { useSyncExternalStore } from 'react';

// One app-lifetime subscription to the desktop accent, shared by every caller.
let accent: string | null = null;
let started = false;
const listeners = new Set<() => void>();

function update(next: string | null) {
  accent = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (!started) {
    started = true;
    void window.electronAPI.getSystemAccent().then(update);
    window.electronAPI.onSystemAccentChanged(({ accent: next }) => update(next));
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The desktop theme's accent (Omarchy on Linux), or null when there is none. */
export function useSystemAccent(): string | null {
  return useSyncExternalStore(subscribe, () => accent);
}
