/** Shortcuts in `mod+shift+k` form (see ui/Kbd). The shell binds these in useGlobalShortcuts. */
export const SHORTCUTS = {
  palette: 'mod+k',
  switcher: 'mod+p',
  capture: 'mod+n',
  settings: 'mod+,',
  split: 'mod+\\',
  focus: 'mod+.',
  help: '?',
  undo: 'mod+z',
  redo: 'mod+shift+z',
  find: 'mod+f',
} as const;

interface ShortcutGroup {
  title: string;
  items: Array<{ keys: string; label: string }>;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Everywhere',
    items: [
      { keys: SHORTCUTS.palette, label: 'Commands' },
      { keys: SHORTCUTS.switcher, label: 'Open a file' },
      { keys: SHORTCUTS.capture, label: 'Capture' },
      { keys: SHORTCUTS.settings, label: 'Settings' },
      { keys: SHORTCUTS.undo, label: 'Undo' },
      { keys: SHORTCUTS.redo, label: 'Redo' },
      { keys: SHORTCUTS.help, label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Writing',
    items: [
      { keys: SHORTCUTS.focus, label: 'Focus mode' },
      { keys: 'escape', label: 'Leave focus mode' },
      { keys: SHORTCUTS.split, label: 'Split view' },
      { keys: SHORTCUTS.find, label: 'Find in note' },
      { keys: '/', label: 'Insert a block' },
      { keys: '[[', label: 'Link to a note' },
    ],
  },
];
