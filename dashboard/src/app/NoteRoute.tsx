import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { movedTo, useDataStore } from '../data/store';
import { NoteTab } from '../features/note/NoteTab';
import { useShownTab } from '../features/shell/shownTab';
import { addRecentFile } from '../store/settings';
import { followMove } from '../store/ui';
import { paths } from './navigation';

/** `/note?path=…`: the note in its tab, in the tab's mode. */
export function NoteRoute() {
  const [params] = useSearchParams();
  const path = params.get('path');
  const create = params.get('create') === '1';
  const line = Number(params.get('line')) || undefined;
  const tab = useShownTab();
  // The file moved (renamed here, a folder moved, or undone): the tab follows it.
  const followTo = useDataStore((state) => (path && !state.notes[path] ? movedTo(state, path) : undefined));

  useEffect(() => {
    if (path && followTo) followMove(path, followTo);
  }, [path, followTo]);

  useEffect(() => {
    if (path) addRecentFile(path);
  }, [path]);

  if (!path) return <Navigate to={paths.today} replace />;
  return <NoteTab key={path} path={path} mode={tab?.mode ?? 'rendered'} createOnWrite={create} line={line} />;
}
