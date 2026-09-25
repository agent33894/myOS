import { useEffect } from 'react';
import { go, paths } from '../../app/navigation';
import { hasPrimaryModifier } from '../../lib/platform';
import { activateTab, toggleOverlay, toggleSplit, useUIStore } from '../../store/ui';
import { closeActiveTab, newNoteHere } from './commands';
import { toggleColumn } from './layout';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

/** The focused group's tabs, in order. */
const groupTabs = () => {
  const { tabs, focusedGroup } = useUIStore.getState();
  return tabs.filter((tab) => tab.group === focusedGroup);
};

/** Show the focused group's tab `index` (-1 is the last); `step` moves from the current one. */
function showTabAt(index: number | null, step = 0) {
  const tabs = groupTabs();
  if (!tabs.length) return;
  const { current, focusedGroup } = useUIStore.getState();
  const at = index ?? tabs.findIndex((tab) => tab.id === current[focusedGroup]) + step;
  const tab = index === -1 ? tabs[tabs.length - 1] : tabs[(at + tabs.length) % tabs.length];
  if (tab) activateTab(tab.id);
}

/**
 * App-wide shortcuts (see shortcuts.ts). Letters are read from `event.code`
 * so ⌥ combinations work on every layout. The editor gets the first say: a key
 * it already handled (⌘B for bold) is left alone.
 * ⌘F belongs to the editor; ⌘Z to useUndoShortcuts; ⌘. to focus mode.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // ⌃Tab on every platform (⌘Tab belongs to macOS).
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        showTabAt(null, event.shiftKey ? -1 : 1);
        return;
      }
      if (!hasPrimaryModifier(event)) {
        if (event.key === '?' && !event.altKey && !isTyping(event.target)) {
          event.preventDefault();
          toggleOverlay('shortcuts');
        }
        return;
      }
      const letter = event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();
      const digit = /^Digit[1-9]$/.test(event.code) ? Number(event.code.slice(5)) : null;
      let action: (() => void) | undefined;
      if (event.shiftKey) return;
      else if (event.altKey) {
        action = { n: newNoteHere, b: () => toggleColumn('right') }[letter];
      } else if (digit !== null) {
        action = () => showTabAt(digit === 9 ? -1 : digit - 1);
      } else {
        action = {
          k: () => toggleOverlay('palette'),
          p: () => toggleOverlay('switcher'),
          n: () => toggleOverlay('capture'),
          w: closeActiveTab,
          b: () => toggleColumn('left'),
          ',': () => go(paths.settings, { pin: true }),
          '\\': toggleSplit,
        }[event.code === 'Backslash' ? '\\' : event.code === 'Comma' ? ',' : letter];
      }
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
