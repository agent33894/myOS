import { useSyncExternalStore } from 'react';
import { invoke, subscribe as subscribeIpc } from '../data/ipc';

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
    void invoke('system:accent').then(update);
    subscribeIpc('system:accent-changed', ({ accent: next }) => update(next));
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
