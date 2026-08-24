import { useEffect } from 'react';
import { useUIStore } from '../store/ui';

interface ListNavigationOptions<T> {
  /** Ordered, flat list of navigable items as rendered. */
  items: T[];
  selectedId: string | null;
  getId: (item: T) => string;
  onSelect: (item: T) => void;
  /** Enter opens the current selection, when the page distinguishes the two. */
  onActivate?: (item: T) => void;
  /** Escape with a selection clears it; without one this is a no-op. */
  onEscape?: () => void;
  enabled?: boolean;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
  );
}

/**
 * Roving list selection for the shell's list panes: ArrowUp/Down and j/k move
 * the selection, Escape clears it. Selection is state-driven (not DOM focus),
 * so a page keeps one tab stop while the keyboard walks its rows. Rows must
 * carry data-nav-id={id} for scroll-into-view.
 */
export function useListNavigation<T>({
  items,
  selectedId,
  getId,
  onSelect,
  onActivate,
  onEscape,
  enabled = true,
}: ListNavigationOptions<T>) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const ui = useUIStore.getState();
      if (ui.isCommandPaletteOpen || ui.isQuickCaptureOpen || ui.isKeyboardShortcutsOpen) return;

      const isDown = event.key === 'ArrowDown' || event.key === 'j';
      const isUp = event.key === 'ArrowUp' || event.key === 'k';

      if (event.key === 'Escape') {
        if (selectedId && onEscape) {
          event.preventDefault();
          onEscape();
        }
        return;
      }
      if (event.key === 'Enter') {
        if (!onActivate || !selectedId) return;
        const current = items.find((item) => getId(item) === selectedId);
        if (!current) return;
        event.preventDefault();
        onActivate(current);
        return;
      }
      if (!isDown && !isUp) return;
      if (items.length === 0) return;

      event.preventDefault();
      const currentIndex = selectedId ? items.findIndex((item) => getId(item) === selectedId) : -1;
      const nextIndex =
        currentIndex === -1
          ? isDown
            ? 0
            : items.length - 1
          : Math.min(items.length - 1, Math.max(0, currentIndex + (isDown ? 1 : -1)));
      const next = items[nextIndex];
      if (!next || nextIndex === currentIndex) return;
      onSelect(next);
      document
        .querySelector(`[data-nav-id="${CSS.escape(getId(next))}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, items, selectedId, getId, onSelect, onActivate, onEscape]);
}
