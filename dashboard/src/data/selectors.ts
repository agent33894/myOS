import { useMemo } from 'react';
import { checkEntries } from '@shared/checklist';
import { formatLocalDate } from '@shared/date';
import { selectInbox } from '@shared/inbox';
import { journalDate } from '@shared/journal';
import { dueForReview } from '@shared/recall';
import { selectTasks } from '@shared/tasks';
import { selectToday } from '@shared/today';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { selectWeek } from '@shared/week';
import { projectsWithStats } from './projects';
import { useDataStore } from './store';

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

const listOf = memo((byPath: Record<string, ArtifactSummary>) => Object.values(byPath));
const checksOf = memo((list: ArtifactSummary[]) => checkEntries(list));
const todayOf = memo((list: ArtifactSummary[]) => selectToday(list, new Date(), checksOf(list)));
const tasksOf = memo((list: ArtifactSummary[]) => selectTasks(list));
const inboxOf = memo((list: ArtifactSummary[]) => selectInbox(list));
const projectsOf = memo((list: ArtifactSummary[], day: string) => projectsWithStats(list, day));

const NOT_NOTES = new Set<string>([ArtifactType.TODO, ArtifactType.PROJECT, ArtifactType.INBOX, ArtifactType.JOURNAL, ArtifactType.TEMPLATE]);
const notesOf = memo((list: ArtifactSummary[]) =>
  list.filter((artifact) => !NOT_NOTES.has(artifact.type)).sort((a, b) => b.updated.localeCompare(a.updated)),
);
const reviewOf = memo((list: ArtifactSummary[], day: string) => dueForReview(notesOf(list), day));

const templatesOf = memo((list: ArtifactSummary[]) =>
  list
    .filter((artifact) => artifact.type === ArtifactType.TEMPLATE && artifact.status !== 'archived')
    .sort((a, b) => a.title.localeCompare(b.title)),
);

export interface JournalEntry {
  date: string;
  page: ArtifactSummary;
}
const journalOf = memo((list: ArtifactSummary[]) =>
  list
    .flatMap((page): JournalEntry[] => {
      const date = journalDate(page);
      return date ? [{ date, page }] : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date)),
);

const countsOf = memo((list: ArtifactSummary[]) => {
  const today = todayOf(list);
  return { inbox: inboxOf(list).length, today: today.carriedOver.length + today.today.length };
});

export const useArtifacts = () => useDataStore((state) => listOf(state.byPath));
export const useArtifact = (path: string | null | undefined) =>
  useDataStore((state) => (path ? state.byPath[path] : undefined));
export const useDataStatus = () => useDataStore((state) => state.status);

/**
 * Carried over, today (due or planned today, flagged, in progress), upcoming
 * (7 days), and done today. Dated checklist lines from notes sit beside tasks
 * (`isCheckEntry`); deferred and Someday tasks stay hidden.
 */
export const useToday = () => useDataStore((state) => todayOf(listOf(state.byPath)));
/** @public The Tasks page: Anytime, Upcoming (beyond this week), and Someday. */
export const useTasks = () => useDataStore((state) => tasksOf(listOf(state.byPath)));
/** @public Every checklist line in every note, done or not. */
export const useChecks = () => useDataStore((state) => checksOf(listOf(state.byPath)));
/** @public Templates (not archived), by title. */
export const useTemplates = () => useDataStore((state) => templatesOf(listOf(state.byPath)));
/** @public Journal pages, newest day first. */
export const useJournal = () => useDataStore((state) => journalOf(listOf(state.byPath)));
/** @public Notes due for spaced review today, at most ten. */
export const useReviewQueue = () => useDataStore((state) => reviewOf(listOf(state.byPath)));
/** @public What moved in the week starting `weekStart` (YYYY-MM-DD). */
export function useWeek(weekStart: string) {
  const list = useArtifacts();
  return useMemo(() => selectWeek(list, weekStart), [list, weekStart]);
}
export const useInbox = () => useDataStore((state) => inboxOf(listOf(state.byPath)));
export const useProjects = () => useDataStore((state) => projectsOf(listOf(state.byPath)));
/** @public Every note (memos and older typed files; not journal pages or templates), most recently edited first. */
export const useNotes = () => useDataStore((state) => notesOf(listOf(state.byPath)));
/** Sidebar counts; each equals the number of rows its page shows. */
export const useCounts = () => useDataStore((state) => countsOf(listOf(state.byPath)));
