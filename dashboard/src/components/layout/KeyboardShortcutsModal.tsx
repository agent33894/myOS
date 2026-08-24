import { X } from 'lucide-react';
import { sidebarRoutes } from '../../app/routes';
import { useIsKeyboardShortcutsOpen, useKeyboardShortcutsActions } from '../../store/selectors';
import { Button } from '../ui/button';
import { CommandSurface } from '../ui/CommandSurface';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['⌘', 'N'], description: 'Quick capture' },
      { keys: ['⌘', '⇧', 'N'], description: 'New artifact workspace' },
      { keys: ['⌘', 'F'], description: 'Search' },
      { keys: ['⌘', 'K'], description: 'Command palette' },
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', '\\'], description: 'Collapse sidebar' },
      { keys: ['Esc'], description: 'Close overlay' },
    ],
  },
  {
    title: 'Projects',
    shortcuts: [
      { keys: ['['], description: 'Toggle project index rail' },
      { keys: [']'], description: 'Toggle inspector' },
      { keys: ['Esc'], description: 'Back up: artifact → overview → index' },
    ],
  },
  {
    title: 'Navigation',
    // Derived from the sidebar order — the same source the ⌘1-9 handler uses.
    shortcuts: sidebarRoutes
      .filter((route) => route.shortcut)
      .map((route) => ({ keys: ['⌘', route.shortcut!], description: route.label })),
  },
  {
    title: 'Lists',
    shortcuts: [
      { keys: ['↓', '/', 'j'], description: 'Next row' },
      { keys: ['↑', '/', 'k'], description: 'Previous row' },
      { keys: ['Esc'], description: 'Clear selection' },
      { keys: ['⌘', '↵'], description: 'Complete selected task' },
    ],
  },
];

function ShortcutKey({ children }: { children: string }) {
  return <kbd className="chronicle-shortcut-key">{children}</kbd>;
}

export default function KeyboardShortcutsModal() {
  const isOpen = useIsKeyboardShortcutsOpen();
  const { closeKeyboardShortcuts } = useKeyboardShortcutsActions();
  if (!isOpen) return null;

  return (
    <CommandSurface
      title="Keyboard shortcuts"
      onClose={closeKeyboardShortcuts}
      labelledBy="keyboard-shortcuts-title"
      variant="dialog"
      className="max-w-2xl"
    >
      <header className="chronicle-modal-header">
        <h2 id="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
        <Button onClick={closeKeyboardShortcuts} variant="icon" size="sm" aria-label="Close keyboard shortcuts">
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="chronicle-shortcuts custom-scrollbar">
        {shortcutGroups.map((group) => (
          <section key={group.title} className="chronicle-shortcut-group">
            <h3>{group.title}</h3>
            {group.shortcuts.map((shortcut) => (
              <div key={`${group.title}-${shortcut.description}`} className="chronicle-shortcut-row">
                <span>{shortcut.description}</span>
                <span className="chronicle-shortcut-keys">
                  {shortcut.keys.map((key) => (
                    <ShortcutKey key={key}>{key}</ShortcutKey>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
        <p className="chronicle-empty-state">On Windows and Linux, use Ctrl instead of ⌘.</p>
      </div>
    </CommandSurface>
  );
}
