import { X } from 'lucide-react';
import { sidebarRoutes } from '../../app/routes';
import { useIsKeyboardShortcutsOpen, useKeyboardShortcutsActions } from '../../store/selectors';
import { Button } from '../ui/button';
import { CommandSurface } from '../ui/CommandSurface';
import { primaryModifierKey } from '../../utils/platform';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: [primaryModifierKey, 'N'], description: 'Quick capture' },
      { keys: [primaryModifierKey, '⇧', 'N'], description: 'New artifact workspace' },
      { keys: [primaryModifierKey, 'F'], description: 'Search' },
      { keys: [primaryModifierKey, 'K'], description: 'Command palette' },
      { keys: [primaryModifierKey, 'Z'], description: 'Undo' },
      { keys: [primaryModifierKey, '\\'], description: 'Collapse sidebar' },
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
    // Derived from the sidebar order, like the primary-modifier 1-9 handler.
    shortcuts: sidebarRoutes
      .filter((route) => route.shortcut)
      .map((route) => ({ keys: [primaryModifierKey, route.shortcut!], description: route.label })),
  },
  {
    title: 'Lists',
    shortcuts: [
      { keys: ['↓', '/', 'j'], description: 'Next row' },
      { keys: ['↑', '/', 'k'], description: 'Previous row' },
      { keys: ['Esc'], description: 'Clear selection' },
      { keys: [primaryModifierKey, '↵'], description: 'Complete selected task' },
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
      </div>
    </CommandSurface>
  );
}
