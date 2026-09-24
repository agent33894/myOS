import { useSyncExternalStore } from 'react';

const query = () => window.matchMedia('(max-width: 900px)');

function subscribe(listener: () => void) {
  const media = query();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

/** Tiled and half-screen windows: two-pane surfaces show one pane at a time. */
export const useNarrowWindow = () => useSyncExternalStore(subscribe, () => query().matches);
