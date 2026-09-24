import { formatLocalDate } from '@shared/date';
import { selectInbox } from '@shared/inbox';
import { selectToday } from '@shared/today';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
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
const todayOf = memo((list: ArtifactSummary[]) => selectToday(list));
const inboxOf = memo((list: ArtifactSummary[]) => selectInbox(list));
const projectsOf = memo((list: ArtifactSummary[], day: string) => projectsWithStats(list, day));

const NOT_NOTES = new Set<string>([ArtifactType.TODO, ArtifactType.PROJECT, ArtifactType.INBOX]);
const notesOf = memo((list: ArtifactSummary[]) =>
  list.filter((artifact) => !NOT_NOTES.has(artifact.type)).sort((a, b) => b.updated.localeCompare(a.updated)),
);

const countsOf = memo((list: ArtifactSummary[]) => {
  const today = todayOf(list);
  return { inbox: inboxOf(list).length, today: today.overdue.length + today.today.length };
});

export const useArtifacts = () => useDataStore((state) => listOf(state.byPath));
export const useArtifact = (path: string | null | undefined) =>
  useDataStore((state) => (path ? state.byPath[path] : undefined));
export const useDataStatus = () => useDataStore((state) => state.status);

/** Overdue, today (due, flagged, in progress), upcoming (7 days), and done today; deferred tasks stay hidden. */
export const useToday = () => useDataStore((state) => todayOf(listOf(state.byPath)));
export const useInbox = () => useDataStore((state) => inboxOf(listOf(state.byPath)));
export const useProjects = () => useDataStore((state) => projectsOf(listOf(state.byPath)));
/** @public Every note (memos and older typed files), most recently edited first. */
export const useNotes = () => useDataStore((state) => notesOf(listOf(state.byPath)));
/** Sidebar counts; each equals the number of rows its page shows. */
export const useCounts = () => useDataStore((state) => countsOf(listOf(state.byPath)));
