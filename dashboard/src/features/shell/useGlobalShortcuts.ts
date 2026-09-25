import { useEffect } from 'react';
import { go, paths } from '../../app/navigation';
import { hasPrimaryModifier } from '../../lib/platform';
import { setSplit, toggleOverlay, useUIStore } from '../../store/ui';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

/** App-wide shortcuts (see shortcuts.ts). ⌘F belongs to the editor; ⌘Z to useUndoShortcuts; ⌘. to focus mode. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasPrimaryModifier(event)) {
        if (event.key === '?' && !event.altKey && !isTyping(event.target)) {
          event.preventDefault();
          toggleOverlay('shortcuts');
        }
        return;
      }
      if (event.altKey || event.shiftKey) return;
      const action = {
        k: () => toggleOverlay('palette'),
        p: () => toggleOverlay('switcher'),
        n: () => toggleOverlay('capture'),
        ',': () => go(paths.settings),
        '\\': () => {
          const { split, activeTab, tabs } = useUIStore.getState();
          // Split with the most recent other tab; ⌘\ again closes the split.
          const other = tabs.map((_, index) => index).filter((index) => index !== activeTab).pop();
          setSplit(split === null && other !== undefined ? other : null);
        },
      }[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
