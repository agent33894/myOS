/** Shortcuts in `mod+shift+k` form (see ui/Kbd). The shell binds these in useGlobalShortcuts. */
export const SHORTCUTS = {
  palette: 'mod+k',
  switcher: 'mod+p',
  capture: 'mod+n',
  newNote: 'mod+alt+n',
  settings: 'mod+,',
  split: 'mod+\\',
  closeTab: 'mod+w',
  left: 'mod+b',
  right: 'mod+alt+b',
  focus: 'mod+.',
  help: '?',
  undo: 'mod+z',
  redo: 'mod+shift+z',
  find: 'mod+f',
  mode: 'mod+e',
} as const;

interface ShortcutGroup {
  title: string;
  items: Array<{ keys: string; label: string }>;
}

/** Every shortcut, for the `?` sheet and Settings → Keyboard. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Everywhere',
    items: [
      { keys: SHORTCUTS.palette, label: 'Commands' },
      { keys: SHORTCUTS.switcher, label: 'Open a file' },
      { keys: SHORTCUTS.capture, label: 'Capture' },
      { keys: SHORTCUTS.newNote, label: 'New note in this folder' },
      { keys: SHORTCUTS.settings, label: 'Settings' },
      { keys: SHORTCUTS.undo, label: 'Undo a file change' },
      { keys: SHORTCUTS.redo, label: 'Redo' },
      { keys: SHORTCUTS.help, label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Tabs and columns',
    items: [
      { keys: 'mod+1', label: 'Go to tab 1 to 9' },
      { keys: SHORTCUTS.closeTab, label: 'Close tab' },
      { keys: SHORTCUTS.split, label: 'Split to the right, or back' },
      { keys: SHORTCUTS.left, label: 'Show or hide the files' },
      { keys: SHORTCUTS.right, label: 'Show or hide the panel' },
      { keys: SHORTCUTS.focus, label: 'Focus mode' },
      { keys: 'escape', label: 'Leave focus mode' },
    ],
  },
  {
    title: 'Files',
    items: [
      { keys: 'up', label: 'Move in the file list' },
      { keys: 'right', label: 'Open a folder' },
      { keys: 'left', label: 'Close a folder' },
      { keys: 'enter', label: 'Open the file' },
      { keys: 'f2', label: 'Rename' },
      { keys: 'delete', label: 'Delete' },
    ],
  },
  {
    title: 'Writing',
    items: [
      { keys: SHORTCUTS.mode, label: 'Rendered or Markdown source' },
      { keys: SHORTCUTS.find, label: 'Find in note' },
      { keys: '/', label: 'Insert a block' },
      { keys: '[[', label: 'Link to a note' },
    ],
  },
  {
    title: 'File switcher',
    items: [
      { keys: 'enter', label: 'Open' },
      { keys: 'mod+enter', label: 'Open to the side' },
    ],
  },
];
