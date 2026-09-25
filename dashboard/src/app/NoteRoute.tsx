import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { movedTo, useDataStore } from '../data/store';
import { NoteTab } from '../features/note/NoteTab';
import { addRecentFile } from '../store/settings';
import { showTab, useUIStore } from '../store/ui';
import { paths, toNoteUrl } from './navigation';

/** `/note?path=…`: the note in its tab (and, with a split, the other tab beside it). */
export function NoteRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = params.get('path');
  const create = params.get('create') === '1';
  const mode = useUIStore((state) => state.tabs.find((tab) => tab.path === path)?.mode ?? 'rendered');
  const splitTab = useUIStore((state) => (state.split === null ? null : state.tabs[state.split]));
  // The file moved (renamed here, a folder moved, or undone): follow it.
  const followTo = useDataStore((state) => (path && !state.notes[path] ? movedTo(state, path) : undefined));

  useEffect(() => {
    if (followTo) navigate(toNoteUrl(followTo), { replace: true });
  }, [followTo, navigate]);

  useEffect(() => {
    if (!path) return;
    showTab(path);
    addRecentFile(path);
  }, [path]);

  if (!path) return <Navigate to={paths.today} replace />;
  return (
    <div className="flex h-full min-w-0">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <NoteTab key={path} path={path} mode={mode} createOnWrite={create} />
      </div>
      {splitTab && splitTab.path !== path ? (
        <div className="min-w-0 flex-1 overflow-y-auto border-l border-border">
          <NoteTab key={splitTab.path} path={splitTab.path} mode={splitTab.mode} />
        </div>
      ) : null}
    </div>
  );
}
