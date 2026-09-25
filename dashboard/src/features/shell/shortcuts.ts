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
  /** `keys` lists alternatives (`j` or `down`). */
  items: Array<{ keys: string | string[]; label: string }>;
}

/** Every shortcut, for the `?` sheet and Settings → Keyboard. Keep it to what is bound. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Everywhere',
    items: [
      { keys: SHORTCUTS.palette, label: 'Commands' },
      { keys: SHORTCUTS.switcher, label: 'Open a file' },
      { keys: SHORTCUTS.capture, label: 'Capture a line' },
      { keys: SHORTCUTS.newNote, label: 'New note' },
      { keys: SHORTCUTS.settings, label: 'Settings' },
      { keys: SHORTCUTS.undo, label: 'Undo a file change' },
      { keys: SHORTCUTS.redo, label: 'Redo a file change' },
      { keys: SHORTCUTS.help, label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Tabs and layout',
    items: [
      { keys: ['mod+1', 'mod+8'], label: 'Go to tab 1 to 8' },
      { keys: 'mod+9', label: 'Go to the last tab' },
      { keys: ['ctrl+tab', 'ctrl+shift+tab'], label: 'Next or previous tab' },
      { keys: SHORTCUTS.closeTab, label: 'Close tab' },
      { keys: SHORTCUTS.split, label: 'Split, or back to one' },
      { keys: SHORTCUTS.left, label: 'Show or hide the files' },
      { keys: SHORTCUTS.right, label: 'Show or hide the panel' },
      { keys: SHORTCUTS.focus, label: 'Focus mode' },
      { keys: 'escape', label: 'Leave focus mode' },
    ],
  },
  {
    title: 'Writing',
    items: [
      { keys: SHORTCUTS.mode, label: 'Rendered or Markdown source' },
      { keys: SHORTCUTS.find, label: 'Find in note' },
      { keys: '/', label: 'Insert a block' },
      { keys: '[[', label: 'Link to a note' },
      { keys: 'mod+k', label: 'Link the selected text' },
      { keys: ['mod+b', 'mod+i'], label: 'Bold, italic' },
      { keys: 'mod+click', label: 'Open a link to the side' },
    ],
  },
  {
    title: 'Files',
    items: [
      { keys: ['up', 'down'], label: 'Move in the file list' },
      { keys: ['right', 'left'], label: 'Open or close a folder' },
      { keys: 'enter', label: 'Open the file' },
      { keys: ['mod+enter', 'mod+click'], label: 'Open to the side' },
      { keys: 'f2', label: 'Rename' },
      { keys: ['delete', 'mod+backspace'], label: 'Delete' },
    ],
  },
  {
    title: 'Task lists',
    items: [
      { keys: ['j', 'k'], label: 'Next or previous task' },
      { keys: ['x', 'space'], label: 'Check or uncheck' },
      { keys: 'd', label: 'Set the due date' },
      { keys: 's', label: 'Set the scheduled date' },
      { keys: 't', label: 'Add a tag' },
      { keys: 'enter', label: 'Open at the line' },
      { keys: ['mod+enter', 'mod+click'], label: 'Open to the side' },
    ],
  },
  {
    title: 'Git and switcher',
    items: [
      { keys: 'mod+shift+enter', label: 'Commit' },
      { keys: ['up', 'down'], label: 'Move in the file switcher' },
      { keys: 'enter', label: 'Open the file' },
      { keys: 'mod+enter', label: 'Open it to the side' },
    ],
  },
];
