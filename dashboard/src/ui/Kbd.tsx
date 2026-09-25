import { isMac } from '../lib/platform';
import { cn } from './cn';

const MAC_KEYS: Record<string, string> = {
  mod: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: 'Esc',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
  click: 'Click',
  home: 'Home',
  end: 'End',
};

const OTHER_KEYS: Record<string, string> = {
  ...MAC_KEYS,
  mod: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  tab: 'Tab',
};

/**
 * Format a shortcut like `mod+shift+k` for the current platform:
 * `⌘⇧K` on macOS, `Ctrl+Shift+K` elsewhere.
 */
export function formatShortcut(shortcut: string): string {
  const names = isMac ? MAC_KEYS : OTHER_KEYS;
  const keys = shortcut
    .toLowerCase()
    .split('+')
    .map((key) => names[key] ?? key.toUpperCase());
  // A click reads better spelled out: ⌘-Click, Ctrl+Click.
  return isMac && keys.at(-1) === 'Click' ? `${keys.slice(0, -1).join('')}-Click` : keys.join(isMac ? '' : '+');
}

interface KbdProps {
  /** Shortcut in `mod+shift+k` form; `mod` is ⌘ on macOS and Ctrl elsewhere. */
  shortcut: string;
  className?: string;
}

/** A keyboard shortcut hint. */
export function Kbd({ shortcut, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded-sm bg-text/5 px-1 font-mono text-xs text-text-tertiary',
        className,
      )}
    >
      {formatShortcut(shortcut)}
    </kbd>
  );
}
