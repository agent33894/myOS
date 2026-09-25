import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArtifactType } from '@shared/types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Brain, FileText, Plus, Search, SearchX } from 'lucide-react';
import { paths, toNoteUrl } from '../../app/navigation';
import { useDataStatus, useJournal, useNotes, useReviewQueue } from '../../data/selectors';
import { useUIStore } from '../../store/ui';
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  LoadingState,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuLabel,
  MenuTrigger,
  formatShortcut,
} from '../../ui';
import { Page } from '../page/Page';
import { useNarrowWindow } from '../page/useNarrowWindow';
import { useCreate } from '../shell/useCreate';
import { useProjectRefs } from '../tasks/projectRefs';
import { applyNoteFilter, NoteFilters, TagsList, type NoteFilter } from './NoteFilters';
import { NoteRow } from './NoteRow';
import { searchNotes, type NoteSort } from './noteSearch';

const SORT_KEY = 'myos-notes-sort';
const SORT_LABELS: Record<NoteSort, string> = { edited: 'Recently edited', created: 'Created', title: 'Title' };
const isSort = (value: unknown): value is NoteSort => typeof value === 'string' && value in SORT_LABELS;

/** Every note, search-first, beside the one that is open. */
export default function NotesPage() {
  const allNotes = useNotes();
  const journal = useJournal();
  const due = useReviewQueue().length;
  const focusMode = useUIStore((state) => state.focusMode);
  const status = useDataStatus();
  const [filter, setFilter] = useState<NoteFilter>({});
  // Journal pages stay out of Notes unless the Kind filter asks for them.
  const pool = useMemo(() => [...allNotes, ...journal.map((entry) => entry.page)], [allNotes, journal]);
  const notes = useMemo(
    () => applyNoteFilter(filter.kind === ArtifactType.JOURNAL ? pool : allNotes, filter),
    [pool, allNotes, filter],
  );
  const filtering = Object.values(filter).some(Boolean);
  const projects = useProjectRefs();
  const narrow = useNarrowWindow();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const path = params.get('path');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<NoteSort>(() => {
    const stored = localStorage.getItem(SORT_KEY);
    return isSort(stored) ? stored : 'edited';
  });
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => localStorage.setItem(SORT_KEY, sort), [sort]);
  const results = useMemo(() => searchNotes(notes, query, sort), [notes, query, sort]);

  const open = (notePath: string, replace = false) => navigate(toNoteUrl(notePath), { replace });
  const { newNote } = useCreate();

  const step = (from: number, by: number) => {
    const next = results[Math.min(Math.max(from + by, 0), results.length - 1)];
    if (!next) return;
    open(next.filePath, true);
    rowRefs.current.get(next.filePath)?.focus();
  };
  const onRowKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      step(index, event.key === 'ArrowDown' ? 1 : -1);
    }
  };

  const showList = (!narrow || !path) && !focusMode;
  const showPage = !narrow || Boolean(path);

  const list = (
    <aside
      aria-label="Notes"
      className={narrow ? 'flex h-full w-full flex-col bg-canvas' : 'flex h-full w-80 shrink-0 flex-col border-r border-border bg-canvas'}
    >
      <div className="flex items-center gap-2 px-4 pt-6">
        <h1 className="flex-1 text-lg font-semibold text-text">Notes</h1>
        {due > 0 ? (
          <Button size="sm" variant="ghost" leadingIcon={Brain} onClick={() => navigate(paths.review)} className="-mr-2 text-accent-text hover:text-accent-text">
            Review {due}
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <Input
          icon={Search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              step(-1, 1);
            } else if (event.key === 'Escape' && query) {
              event.stopPropagation();
              setQuery('');
            }
          }}
          placeholder="Search notes"
          aria-label="Search notes"
          className="flex-1"
        />
        <Menu>
          <MenuTrigger asChild>
            <IconButton icon={ArrowUpDown} label={`Sort: ${SORT_LABELS[sort]}`} />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>Sort by</MenuLabel>
            {(Object.keys(SORT_LABELS) as NoteSort[]).map((option) => (
              <MenuCheckboxItem key={option} checked={sort === option} onCheckedChange={() => setSort(option)}>
                {SORT_LABELS[option]}
              </MenuCheckboxItem>
            ))}
          </MenuContent>
        </Menu>
        <TagsList />
        <IconButton icon={Plus} label="New note" shortcut="mod+shift+n" onClick={newNote} />
      </div>
      <div className="px-3 pb-2">
        <NoteFilters notes={pool} filter={filter} onChange={setFilter} />
      </div>
      <div role="listbox" aria-label="Notes" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-6">
        {status !== 'ready' ? (
          <LoadingState rows={6} />
        ) : results.length === 0 ? (
          query || filtering ? (
            <EmptyState
              icon={SearchX}
              title="No matching notes."
              description={filtering ? 'Try clearing a filter.' : 'Try fewer or different words.'}
              action={filtering ? <Button size="sm" onClick={() => setFilter({})}>Clear filters</Button> : undefined}
            />
          ) : (
            <EmptyState icon={FileText} title="No notes yet." description="Your writing will gather here." />
          )
        ) : (
          results.map((note, index) => (
            <NoteRow
              key={note.filePath}
              ref={(node) => {
                if (node) rowRefs.current.set(note.filePath, node);
                else rowRefs.current.delete(note.filePath);
              }}
              note={note}
              project={projects.find(note.project)}
              query={query}
              selected={note.filePath === path}
              onSelect={() => open(note.filePath)}
              onKeyDown={onRowKeyDown(index)}
            />
          ))
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-full bg-canvas">
      {showList ? list : null}
      {showPage ? (
        <section className="min-w-0 flex-1">
          {path ? (
            <Page
              key={path}
              path={path}
              onDeleted={() => navigate(paths.notes, { replace: true })}
              onMoved={(moved) => open(moved, true)}
              missingAction={<Button onClick={() => navigate(paths.notes)}>Back to notes</Button>}
              leading={
                narrow ? <IconButton icon={ArrowLeft} label="All notes" size="sm" onClick={() => navigate(paths.notes)} /> : null
              }
            />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={FileText}
                title={notes.length > 0 ? 'Pick a note' : 'Write your first note.'}
                description={
                  notes.length > 0
                    ? `Or press ${formatShortcut('mod+shift+n')} to start a new one.`
                    : `Ideas, meeting notes, a plan for the weekend. Press ${formatShortcut('mod+shift+n')} anytime.`
                }
                action={
                  <Button variant="primary" leadingIcon={Plus} onClick={newNote}>
                    New note
                  </Button>
                }
              />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
