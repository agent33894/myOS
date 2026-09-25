import { useEffect, useId, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { FilePlus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { NoteSummary } from '@shared/spec';
import { createNote } from '../../data/gateway';
import { useNotes } from '../../data/selectors';
import { useSettings } from '../../store/settings';
import { cn, Icon, Popover, PopoverAnchor, PopoverContent } from '../../ui';
import { findWikiLinkedNote } from '../../lib/links';
import { linkedNotePath, rankLinkTargets } from './linkTargets';
import { closeLinkSuggest, linkSuggestKey, type LinkSuggestState } from './wikiSuggest';

type Option = { kind: 'page'; item: NoteSummary } | { kind: 'create'; title: string };

const folderOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

interface LinkSuggestMenuProps {
  editor: Editor;
  /** The note being edited, left out of its own suggestions. */
  filePath: string;
  keyHandler: { current: ((event: KeyboardEvent) => boolean) | null };
}

/**
 * The `[[` popover: pages that match what you type, recent first, and
 * Create “…” to make a new note and link it in one step. Focus stays in the
 * editor; arrows, Enter, Tab, and Escape drive it.
 */
export function LinkSuggestMenu({ editor, filePath, keyHandler }: LinkSuggestMenuProps) {
  const notes = useNotes();
  const recentPaths = useSettings((state) => state.recentFiles);
  const [state, setState] = useState<LinkSuggestState>({ active: false, from: 0, query: '' });
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();

  useEffect(() => {
    const sync = () => {
      const next = linkSuggestKey.getState(editor.state);
      if (!next) return;
      setState((current) => (current.active === next.active && current.from === next.from && current.query === next.query ? current : next));
    };
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
    };
  }, [editor]);

  const options = useMemo<Option[]>(() => {
    if (!state.active) return [];
    const pages: Option[] = rankLinkTargets(notes, state.query, { recentPaths, exclude: filePath }).map((item) => ({ kind: 'page', item }));
    const title = state.query.trim();
    const exists = title && findWikiLinkedNote(title, notes);
    return title && !exists ? [...pages, { kind: 'create', title }] : pages;
  }, [state, notes, recentPaths, filePath]);

  useEffect(() => setActiveIndex(0), [state.query, state.active]);

  const close = () => {
    if (linkSuggestKey.getState(editor.state)?.active) editor.view.dispatch(closeLinkSuggest(editor.state));
  };

  const insert = (target: string) => {
    const to = state.from + 2 + state.query.length;
    const after = editor.state.doc.textBetween(to, Math.min(to + 2, editor.state.doc.content.size), '\0', '\0');
    editor
      .chain()
      .focus()
      .insertContentAt({ from: state.from, to: after === ']]' ? to + 2 : to }, { type: 'text', text: `[[${target}]]` })
      .run();
    close();
  };

  const select = (option: Option) => {
    if (option.kind === 'page') {
      insert(option.item.title);
      return;
    }
    insert(option.title);
    createNote(linkedNotePath(option.title, filePath)).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Could not create the note'),
    );
  };

  keyHandler.current = (event) => {
    const count = options.length;
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
        select(options[Math.min(activeIndex, count - 1)]);
        return true;
      case 'Escape':
        event.stopPropagation();
        close();
        return true;
      default:
        return false;
    }
  };

  const active = options[activeIndex];
  const optionId = (index: number) => `${id}-${index}`;

  useEffect(() => {
    const dom = editor.view.dom;
    if (!state.active) return;
    dom.setAttribute('aria-controls', `${id}-list`);
    dom.setAttribute('aria-expanded', 'true');
    if (active) dom.setAttribute('aria-activedescendant', optionId(activeIndex));
    return () => {
      dom.removeAttribute('aria-controls');
      dom.removeAttribute('aria-expanded');
      dom.removeAttribute('aria-activedescendant');
    };
  });

  useEffect(() => {
    if (state.active) document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, state.active]);

  const anchor = {
    current: {
      getBoundingClientRect: () => {
        const { top, bottom, left } = editor.view.coordsAtPos(Math.min(state.from, editor.state.doc.content.size));
        return new DOMRect(left, top, 0, bottom - top);
      },
    },
  };

  const open = state.active && options.length > 0;

  return (
    <Popover open={open} onOpenChange={(next) => !next && close()}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
      >
        <div className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary">{state.query.trim() ? 'Link to' : 'Recent'}</div>
        <div id={`${id}-list`} role="listbox" aria-label="Link to a note" className="max-h-80 overflow-y-auto">
          {options.map((option, index) => {
            const selected = index === activeIndex;
            return (
              <div
                key={option.kind === 'page' ? option.item.path : 'create'}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onMouseMove={() => !selected && setActiveIndex(index)}
                onClick={() => select(option)}
                className={cn(
                  'flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-base',
                  selected && 'bg-text/5',
                  option.kind === 'create' && 'mt-1',
                )}
              >
                {option.kind === 'page' ? (
                  <>
                    <Icon icon={FileText} className="shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 truncate text-text">{option.item.title}</span>
                    <span className="max-w-32 shrink-0 truncate font-mono text-xs text-text-tertiary">{folderOf(option.item.path)}</span>
                  </>
                ) : (
                  <>
                    <Icon icon={FilePlus} className="shrink-0 text-accent-text" />
                    <span className="min-w-0 flex-1 truncate text-text">
                      Create <span className="font-medium">“{option.title}”</span>
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
