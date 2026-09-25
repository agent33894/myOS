import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FilePlus, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { NoteSummary } from '@shared/spec';
import { openNote } from '../../app/navigation';
import { createNote } from '../../data/gateway';
import { useNotes, useRecentNotes } from '../../data/selectors';
import { useSettings } from '../../store/settings';
import { closeOverlay, useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogTitle, Icon, Input, Kbd, cn } from '../../ui';
import { matchAll } from './fuzzy';

const LIMIT = 50;

type Row = { kind: 'note'; note: NoteSummary } | { kind: 'create'; path: string };

const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** A path the user typed, as a Markdown file in the folder: `notes/foo` → `notes/foo.md`. */
function typedPath(query: string): string | null {
  const path = query.trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  if (!path || path.endsWith('/') || path.split('/').some((part) => part === '..' || part === '.')) return null;
  return /\.md$/i.test(path) ? path : `${path}.md`;
}

function SwitcherBody() {
  const notes = useNotes();
  const recent = useRecentNotes();
  const recentPaths = useSettings((state) => state.recentFiles);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const recency = (path: string) => {
      const index = recentPaths.indexOf(path);
      return index < 0 ? 0 : (recentPaths.length - index) / recentPaths.length;
    };
    if (!query.trim()) {
      const others = notes.filter((note) => !recentPaths.includes(note.path)).sort((a, b) => b.modified.localeCompare(a.modified));
      return [...recent, ...others].slice(0, LIMIT).map((note) => ({ kind: 'note', note }));
    }
    const scored = notes
      .map((note) => ({
        note,
        score: matchAll(query, [
          { text: note.title, weight: 1.2 },
          { text: nameOf(note.path), weight: 1.1 },
          { text: note.path, weight: 1 },
        ]),
      }))
      .filter(({ score }) => score >= 0)
      .map(({ note, score }) => ({ note, score: score + recency(note.path) * 6 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT)
      .map(({ note }): Row => ({ kind: 'note', note }));
    const path = typedPath(query);
    const exists = path && notes.some((note) => note.path.toLowerCase() === path.toLowerCase());
    return path && !exists ? [...scored, { kind: 'create', path }] : scored;
  }, [notes, recent, recentPaths, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (row: Row | undefined, side: boolean) => {
    if (!row) return;
    closeOverlay();
    const group = side ? 1 : undefined;
    if (row.kind === 'note') openNote(row.note.path, { pin: true, group });
    else
      void createNote(row.path).then(
        (note) => openNote(note.path, { pin: true, group }),
        (error: unknown) => toast.error(error instanceof Error ? error.message : `Could not make ${row.path}`),
      );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || (event.ctrlKey && (event.key === 'n' || event.key === 'p'))) {
      event.preventDefault();
      const down = event.key === 'ArrowDown' || event.key === 'n';
      if (rows.length) setActive((current) => (current + (down ? 1 : -1) + rows.length) % rows.length);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(rows[active], event.metaKey || event.ctrlKey);
    }
  };

  const activeRow = rows[active];
  return (
    <>
      <DialogTitle className="sr-only">Open a file</DialogTitle>
      <div className="flex items-center gap-3 border-b border-border pl-5 pr-12">
        <Icon icon={Search} className="text-text-tertiary" />
        <Input
          autoFocus
          variant="ghost"
          role="combobox"
          aria-label="File name or path"
          aria-expanded="true"
          aria-controls="switcher-results"
          aria-activedescendant={activeRow ? `switcher-row-${active}` : undefined}
          placeholder="Type a file name or path"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-14 px-0 text-md hover:bg-transparent focus-visible:bg-transparent"
        />
      </div>
      <div ref={listRef} id="switcher-results" role="listbox" aria-label="Files" className="max-h-96 overflow-y-auto p-2">
        {!query.trim() && rows.length ? <div className="px-3 pb-1 pt-1 text-xs font-medium text-text-tertiary">Files, recent first</div> : null}
        {rows.map((row, index) => {
          const isActive = index === active;
          return (
            <div
              key={row.kind === 'note' ? row.note.path : 'create'}
              id={`switcher-row-${index}`}
              role="option"
              aria-selected={isActive}
              data-active={isActive}
              onMouseMove={() => !isActive && setActive(index)}
              onClick={(event) => choose(row, event.metaKey || event.ctrlKey)}
              className={cn('flex h-10 cursor-default items-center gap-3 rounded-md px-3 transition-colors duration-fast', isActive && 'bg-accent-soft')}
            >
              {row.kind === 'note' ? (
                <>
                  <Icon icon={FileText} className="shrink-0 text-text-tertiary" />
                  <span className="min-w-0 shrink truncate text-base text-text">{row.note.title}</span>
                  <span className="ml-auto min-w-0 max-w-xs truncate font-mono text-xs text-text-tertiary">{row.note.path}</span>
                </>
              ) : (
                <>
                  <Icon icon={FilePlus} className="shrink-0 text-accent-text" />
                  <span className="min-w-0 truncate text-base text-text">
                    Create <span className="font-mono text-sm">{row.path}</span>
                  </span>
                </>
              )}
            </div>
          );
        })}
        {rows.length === 0 ? <p className="px-3 py-8 text-center text-base text-text-secondary">{query.trim() ? 'No file matches that name.' : 'This folder has no Markdown files yet.'}</p> : null}
      </div>
      <div className="flex items-center gap-4 border-t border-border px-5 py-2 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <Kbd shortcut="enter" /> to open
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="mod+enter" /> to open to the side
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="escape" /> to close
        </span>
      </div>
    </>
  );
}

/** ⌘P: open a file by name or path, recent files first; a path that doesn't exist yet can be made. */
export function FileSwitcher() {
  const open = useUIStore((state) => state.overlay === 'switcher');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeOverlay()}>
      <DialogContent size="lg" aria-describedby={undefined} className="mt-16 gap-0 self-start overflow-hidden p-0">
        {open ? <SwitcherBody /> : null}
      </DialogContent>
    </Dialog>
  );
}
