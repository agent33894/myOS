import { useMemo } from 'react';
import { formatLocalDate } from '@shared/date';
import { runView, type ViewKind, type ViewResult } from '@shared/query';
import type { NoteSummary } from '@shared/spec';
import { todayBucket, type Task } from '@shared/tasks';
import { useSettings } from '../store/settings';
import { useDataStore } from './store';
import { buildTree, type TreeFolder } from './tree';

/** Recompute only when the input (and, for date-aware selectors, the day) changes. */
function memo<In, Out>(compute: (input: In, day: string) => Out): (input: In) => Out {
  let lastInput: In | undefined;
  let lastDay = '';
  let last: Out;
  return (input) => {
    const day = formatLocalDate();
    if (input !== lastInput || day !== lastDay) {
      lastInput = input;
      lastDay = day;
      last = compute(input, day);
    }
    return last;
  };
}

const listOf = memo((notes: Record<string, NoteSummary>) => Object.values(notes));
const tasksOf = memo((list: NoteSummary[]) => list.flatMap((note) => note.tasks));
const todayOf = memo((tasks: Task[], day) => {
  const byDue = [...tasks].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.path.localeCompare(b.path) || a.line - b.line);
  return { overdue: byDue.filter((task) => todayBucket(task, day) === 'overdue'), today: byDue.filter((task) => todayBucket(task, day) === 'today') };
});
let treeInput: { folders: string[]; notes: Record<string, NoteSummary> } | null = null;
let tree: TreeFolder = buildTree([], []);
const treeOf = (folders: string[], notes: Record<string, NoteSummary>) => {
  if (treeInput?.folders !== folders || treeInput.notes !== notes) {
    treeInput = { folders, notes };
    tree = buildTree(folders, listOf(notes));
  }
  return tree;
};

/** Every note in the folder, in no particular order. */
export const useNotes = () => useDataStore((state) => listOf(state.notes));
export const useNote = (path: string | null | undefined) => useDataStore((state) => (path ? state.notes[path] : undefined));
/** @public 'loading' until the first listing arrives. */
export const useDataStatus = () => useDataStore((state) => state.status);
/** The folder tree: folders first, then notes, in natural name order. */
export const useTree = () => useDataStore((state) => treeOf(state.folders, state.notes));
/** @public Every task line (and `type: todo` file) in the folder. */
export const useTasks = () => useDataStore((state) => tasksOf(listOf(state.notes)));
/** Open tasks that are late, and those due, scheduled, or starting today. */
export const useTodayTasks = () => useDataStore((state) => todayOf(tasksOf(listOf(state.notes))));

/** Run a view (see shared/query.ts) over the folder; recomputed when files, the text, or the day change. */
export function useView(kind: ViewKind, query: string): ViewResult {
  const notes = useNotes();
  const day = formatLocalDate();
  return useMemo(() => runView(kind, query, notes, day), [kind, query, notes, day]);
}

/** Recently opened notes that still exist, newest first. */
export function useRecentNotes(): NoteSummary[] {
  const recent = useSettings((state) => state.recentFiles);
  const notes = useDataStore((state) => state.notes);
  return useMemo(() => recent.flatMap((path) => (notes[path] ? [notes[path]] : [])), [recent, notes]);
}
