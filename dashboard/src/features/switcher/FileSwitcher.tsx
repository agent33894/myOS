import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { FileText } from 'lucide-react';
import { openNote } from '../../app/navigation';
import { useNotes, useRecentNotes } from '../../data/selectors';
import { rankLinkTargets } from '../../editor/links/linkTargets';
import { useSettings } from '../../store/settings';
import { closeOverlay, useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogTitle, Icon, Input, ListRow } from '../../ui';

const LIMIT = 30;

function SwitcherBody() {
  const notes = useNotes();
  const recent = useRecentNotes();
  const recentPaths = useSettings((state) => state.recentFiles);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = useMemo(
    () => (query.trim() ? rankLinkTargets(notes, query, { recentPaths, limit: LIMIT }) : recent.slice(0, LIMIT)),
    [notes, recent, recentPaths, query],
  );
  useEffect(() => setActive(0), [query]);

  const open = (index: number) => {
    const note = matches[index];
    if (!note) return;
    closeOverlay();
    openNote(note.path);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (matches.length) setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      open(active);
    }
  };

  return (
    <>
      <DialogTitle className="sr-only">Open a file</DialogTitle>
      <Input autoFocus variant="ghost" aria-label="File name" placeholder="Type a file name" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown} className="h-12 border-b border-border px-5 text-md" />
      <div role="listbox" aria-label="Files" className="max-h-96 overflow-y-auto p-2">
        {matches.map((note, index) => (
          <ListRow
            key={note.path}
            role="option"
            selected={index === active}
            leading={<Icon icon={FileText} className="text-text-tertiary" />}
            meta={<span className="font-mono text-xs">{note.path}</span>}
            onMouseMove={() => index !== active && setActive(index)}
            onActivate={() => open(index)}
          >
            {note.title}
          </ListRow>
        ))}
        {matches.length === 0 ? <p className="px-3 py-8 text-center text-base text-text-secondary">{query.trim() ? 'No file matches that name.' : 'Files you open show up here.'}</p> : null}
      </div>
    </>
  );
}

/** ⌘P: jump to a file by name; recent files first. (Wave B: full fuzzy matching over paths and titles.) */
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
