import { useEffect, useState, type KeyboardEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { IconButton, Input } from '../../ui';
import { hasPrimaryModifier } from '../../utils/platform';
import { findKey, setFind } from './plugin';

/** ⌘F inside the editor: a small bar that highlights matches and steps through them. */
export function FindBar({ editor, initialQuery, onClose }: { editor: Editor; initialQuery: string; onClose: () => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [position, setPosition] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const sync = () => {
      const state = findKey.getState(editor.state);
      if (state) setPosition((prev) => (prev.current === state.current && prev.total === state.matches.length ? prev : { current: state.current, total: state.matches.length }));
    };
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
      if (!editor.isDestroyed) editor.view.dispatch(setFind(editor.state, { query: '' }));
    };
  }, [editor]);

  useEffect(() => {
    editor.view.dispatch(setFind(editor.state, { query }));
    reveal(0);
  }, [query]);

  function reveal(index: number) {
    const match = findKey.getState(editor.state)?.matches[index];
    if (!match) return;
    const { node } = editor.view.domAtPos(match.from);
    (node instanceof Element ? node : node.parentElement)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  const step = (direction: 1 | -1) => {
    const state = findKey.getState(editor.state);
    if (!state?.matches.length) return;
    const current = (state.current + direction + state.matches.length) % state.matches.length;
    editor.view.dispatch(setFind(editor.state, { current }));
    reveal(current);
  };

  const close = () => {
    onClose();
    editor.commands.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (hasPrimaryModifier(event.nativeEvent) && event.key.toLowerCase() === 'f') {
      // Already finding: keep ⌘F here rather than opening search.
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.select();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const label = query ? (position.total ? `${position.current + 1} of ${position.total}` : 'No matches') : '';

  return (
    <div role="search" className="flex items-center gap-1 rounded-lg bg-overlay p-1 shadow-overlay animate-scale-in">
      <Input
        autoFocus
        size="sm"
        icon={Search}
        className="w-56"
        aria-label="Find in page"
        placeholder="Find in page"
        value={query}
        onFocus={(event) => event.target.select()}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <span aria-live="polite" className="min-w-16 px-1 text-center text-xs tabular-nums text-text-tertiary">
        {label}
      </span>
      <IconButton icon={ChevronUp} label="Previous match" shortcut="shift+enter" size="sm" disabled={!position.total} onClick={() => step(-1)} />
      <IconButton icon={ChevronDown} label="Next match" shortcut="enter" size="sm" disabled={!position.total} onClick={() => step(1)} />
      <IconButton icon={X} label="Close" shortcut="escape" size="sm" onClick={close} />
    </div>
  );
}
