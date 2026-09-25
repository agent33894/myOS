import { sections } from '../../app/routes';

/** Shortcuts in `mod+shift+k` form (see ui/Kbd). The global ones are bound in useGlobalShortcuts. */
export const SHORTCUTS = {
  palette: 'mod+k',
  capture: 'mod+n',
  newNote: 'mod+shift+n',
  settings: 'mod+,',
  sidebar: 'mod+\\',
  help: '?',
  undo: 'mod+z',
  redo: 'mod+shift+z',
  /** Bound in features/knowledge/KnowledgeLayer (FOCUS_SHORTCUT). */
  focus: 'mod+.',
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
      { keys: SHORTCUTS.palette, label: 'Search and commands' },
      { keys: SHORTCUTS.capture, label: 'Quick capture' },
      { keys: SHORTCUTS.newNote, label: 'New note' },
      { keys: SHORTCUTS.undo, label: 'Undo' },
      { keys: SHORTCUTS.redo, label: 'Redo' },
      { keys: SHORTCUTS.help, label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Go to',
    items: [
      ...sections.map((section) => ({ keys: section.shortcut, label: section.label })),
      { keys: SHORTCUTS.settings, label: 'Settings' },
      { keys: SHORTCUTS.sidebar, label: 'Show or hide the sidebar' },
    ],
  },
  {
    title: 'Writing',
    items: [
      { keys: SHORTCUTS.focus, label: 'Focus mode' },
      { keys: 'escape', label: 'Leave focus mode' },
      { keys: SHORTCUTS.find, label: 'Find in page' },
      { keys: '/', label: 'Insert a block' },
      { keys: '[[', label: 'Link to a page' },
    ],
  },
  {
    title: 'Sorting the Inbox',
    items: [
      { keys: 't', label: 'Make task' },
      { keys: 'n', label: 'Make note' },
      { keys: 'p', label: 'Move to project' },
      { keys: 'backspace', label: 'Delete' },
      { keys: 'right', label: 'Skip' },
    ],
  },
  {
    title: 'Task rows',
    items: [
      { keys: 'x', label: 'Complete (or Space)' },
      { keys: 'enter', label: 'Open' },
      { keys: 'd', label: 'Set a date' },
      { keys: 'f', label: 'Flag' },
      { keys: 't', label: 'Plan for today' },
      { keys: 's', label: 'Someday' },
      { keys: 'alt+up', label: 'Move up in today’s plan' },
      { keys: 'alt+down', label: 'Move down in today’s plan' },
      { keys: 'backspace', label: 'Delete' },
    ],
  },
  {
    title: 'Reviewing notes',
    items: [
      { keys: 'mod+enter', label: 'Show note' },
      { keys: '1', label: 'Again' },
      { keys: '2', label: 'Hard' },
      { keys: '3', label: 'Good' },
      { keys: '4', label: 'Easy' },
    ],
  },
];
