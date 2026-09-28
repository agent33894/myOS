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
  return keys.join(isMac ? '' : '+');
}

const ARIA_KEYS: Record<string, string> = {
  mod: isMac ? 'Meta' : 'Control',
  ctrl: 'Control',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  escape: 'Escape',
  tab: 'Tab',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

/**
 * A shortcut in `aria-keyshortcuts` form (`Control+Shift+K`). Controls declare
 * their shortcuts this way instead of printing them; the full list lives in
 * the Keyboard shortcuts dialog.
 */
export function ariaShortcut(shortcut: string | undefined): string | undefined {
  if (!shortcut) return undefined;
  return shortcut
    .toLowerCase()
    .split('+')
    .map((key) => ARIA_KEYS[key] ?? (key === '?' ? 'Shift+?' : key.toUpperCase()))
    .join('+');
}

interface KbdProps {
  /** Shortcut in `mod+shift+k` form; `mod` is ⌘ on macOS and Ctrl elsewhere. */
  shortcut: string;
  className?: string;
}

/** A keyboard shortcut, for the Keyboard shortcuts dialog. */
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
