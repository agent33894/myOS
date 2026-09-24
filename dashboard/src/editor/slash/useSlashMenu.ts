import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { closeSlash, slashKey, type SlashState } from './plugin';
import { filterItems, type SlashItem } from './items';

interface SlashActions {
  attachFile: () => void;
}

/** State and keyboard behavior of the "/" insert menu for one editor. */
export function useSlashMenu(editor: Editor, onKeyDown: { current: ((event: KeyboardEvent) => boolean) | null }, actions: SlashActions) {
  const [slash, setSlash] = useState<SlashState>({ active: false, from: 0, query: '' });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const sync = () => {
      const next = slashKey.getState(editor.state);
      if (!next) return;
      setSlash((current) => (current.active === next.active && current.from === next.from && current.query === next.query ? current : next));
    };
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
    };
  }, [editor]);

  const items = useMemo(() => (slash.active ? filterItems(slash.query) : []), [slash]);
  useEffect(() => setActiveIndex(0), [slash.query, slash.active]);

  const close = () => {
    if (slashKey.getState(editor.state)?.active) editor.view.dispatch(closeSlash(editor.state));
  };

  const select = (item: SlashItem) => {
    editor.chain().focus().deleteRange({ from: slash.from, to: slash.from + 1 + slash.query.length }).run();
    item.run(editor, actions);
  };

  onKeyDown.current = (event) => {
    const count = items.length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!count) return false;
        setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count);
        return true;
      case 'Enter':
      case 'Tab':
        if (!count) {
          close();
          return false;
        }
        select(items[Math.min(activeIndex, count - 1)]);
        return true;
      case 'Escape':
        event.stopPropagation();
        close();
        return true;
      default:
        return false;
    }
  };

  const anchorRect = () => {
    const { top, bottom, left } = editor.view.coordsAtPos(slash.from);
    return new DOMRect(left, top, 0, bottom - top);
  };

  return { open: slash.active, query: slash.query, items, activeIndex, setActiveIndex, select, close, anchorRect };
}
