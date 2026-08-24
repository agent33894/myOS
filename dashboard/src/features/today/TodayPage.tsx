import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useArtifactsStore } from '../../store/artifacts';
import { useUndoableArtifact } from '../../hooks/useUndoableArtifact';
import { useListNavigation } from '../../hooks/useListNavigation';
import { useUndoRedoStore } from '../../store/undoRedo';
import type { Artifact } from '../../types/artifacts';
import { TodoStatus } from '../../types/artifacts';
import { localDateStamp, selectInPlay, selectNextUp, selectRecord } from './todaySelectors';
import { InPlayList } from './InPlayList';
import { NowLine } from './NowLine';
import { RecordList } from './RecordList';
import { ArtifactDetail } from '../shell/ArtifactDetail';
import { TodayOverview } from './TodayOverview';
import { PaneDivider } from '../../components/ui/PaneDivider';

const LIST_WIDTH_KEY = 'chronicle-today-list-width';
const COMPLETION_HOLD_MS = 450;
const DEPART_MS = 300;
const ARRIVE_MS = 650;
const UNDO_WINDOW_MS = 4_000;

interface Ghost {
  task: Artifact;
  index: number;
  list: 'inPlay' | 'nextUp';
}

function insertGhosts(tasks: Artifact[], ghosts: Ghost[], list: Ghost['list']): Artifact[] {
  const own = ghosts.filter((ghost) => ghost.list === list);
  if (own.length === 0) return tasks;
  const merged = [...tasks];
  for (const ghost of own) {
    merged.splice(Math.min(ghost.index, merged.length), 0, ghost.task);
  }
  return merged;
}

export default function TodayPage() {
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const updateStoreArtifact = useArtifactsStore((state) => state.updateArtifact);
  const reload = useArtifactsStore((state) => state.loadArtifacts);
  const { undoableUpdate } = useUndoableArtifact();
  const inPlay = useMemo(() => selectInPlay(artifacts), [artifacts]);
  const nextUp = useMemo(() => selectNextUp(artifacts), [artifacts]);
  const record = useMemo(() => selectRecord(artifacts), [artifacts]);
  const [selected, setSelected] = useState<Artifact | null>(null);
  // Per-row completion state: id -> completion timestamp. Rows animate and
  // persist independently, so rapid triage never drops a click.
  const [completing, setCompleting] = useState<Map<string, string>>(new Map());
  const [departingIds, setDepartingIds] = useState<Set<string>>(new Set());
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [arriving, setArriving] = useState<Map<string, string>>(new Map());
  const [completionTimes, setCompletionTimes] = useState<Record<string, string>>({});
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);
  const rowTimers = useRef<number[]>([]);
  const [listWidth, setListWidth] = useState(() => Number(localStorage.getItem(LIST_WIDTH_KEY)) || 308);

  useEffect(() => {
    localStorage.setItem(LIST_WIDTH_KEY, String(listWidth));
  }, [listWidth]);
  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      rowTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  // Keep an explicitly selected detail synchronized with file-watcher reloads,
  // while preserving the day overview as the intentional default state.
  useEffect(() => {
    if (!selected) return;
    const current = artifacts.find((artifact) => artifact.id === selected.id) || null;
    if (current !== selected) setSelected(current);
  }, [artifacts, selected]);

  const complete = useCallback(
    async (task: Artifact) => {
      if (completing.has(task.id)) return;
      const completedAt = new Date();
      const timestamp = completedAt.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      const listIndex = inPlay.findIndex((item) => item.id === task.id);
      const ghost: Ghost =
        listIndex !== -1
          ? { task, index: listIndex, list: 'inPlay' }
          : { task, index: Math.max(0, nextUp.findIndex((item) => item.id === task.id)), list: 'nextUp' };
      setCompleting((current) => new Map(current).set(task.id, timestamp));
      const today = localDateStamp(completedAt);
      const next: Artifact = {
        ...task,
        status: TodoStatus.DONE,
        completedDate: today,
        updated: today,
      };
      try {
        const persistence = undoableUpdate(task.filePath, task, next, `Complete ${task.title}`);
        const [persisted] = await Promise.all([
          persistence,
          new Promise<void>((resolve) => window.setTimeout(resolve, COMPLETION_HOLD_MS)),
        ]);
        // The row leaves In Play in the store, but stays rendered as a
        // departing ghost so completion reads as one continuous motion.
        setGhosts((current) => [...current, { ...ghost, task: persisted }]);
        setDepartingIds((current) => new Set(current).add(task.id));
        updateStoreArtifact(persisted);
        if (selected?.id === task.id) setSelected(persisted);
        setArriving((current) => new Map(current).set(task.id, timestamp));
        setCompletionTimes((current) => ({ ...current, [task.id]: timestamp }));
        setLastCompleted(task.id);
        rowTimers.current.push(
          window.setTimeout(() => {
            setGhosts((current) => current.filter((entry) => entry.task.id !== task.id));
            setDepartingIds((current) => {
              const nextIds = new Set(current);
              nextIds.delete(task.id);
              return nextIds;
            });
            setCompleting((current) => {
              const nextMap = new Map(current);
              nextMap.delete(task.id);
              return nextMap;
            });
          }, DEPART_MS),
          window.setTimeout(() => {
            setArriving((current) => {
              const nextMap = new Map(current);
              nextMap.delete(task.id);
              return nextMap;
            });
          }, ARRIVE_MS),
        );
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setLastCompleted(null), UNDO_WINDOW_MS);
      } catch (error) {
        setCompleting((current) => {
          const nextMap = new Map(current);
          nextMap.delete(task.id);
          return nextMap;
        });
        toast.error(error instanceof Error ? error.message : 'Could not complete task');
      }
    },
    [completing, inPlay, nextUp, selected, undoableUpdate, updateStoreArtifact],
  );

  const defer = useCallback(
    async (task: Artifact) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const next: Artifact = {
        ...task,
        deferDate: localDateStamp(tomorrow),
        updated: localDateStamp(),
      };
      try {
        const persisted = await undoableUpdate(task.filePath, task, next, `Defer ${task.title}`);
        updateStoreArtifact(persisted);
        if (selected?.id === task.id) setSelected(persisted);
        toast.success('Deferred until tomorrow');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not defer task');
      }
    },
    [selected, undoableUpdate, updateStoreArtifact],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter' || !selected) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (selected.type !== 'todo' || selected.status === 'done' || selected.status === 'cancelled') return;
      event.preventDefault();
      void complete(selected);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [complete, selected]);

  const displayInPlay = useMemo(() => insertGhosts(inPlay, ghosts, 'inPlay'), [inPlay, ghosts]);
  const displayNextUp = useMemo(() => insertGhosts(nextUp, ghosts, 'nextUp'), [nextUp, ghosts]);
  const navigableItems = useMemo(() => [...inPlay, ...nextUp, ...record], [inPlay, nextUp, record]);
  const getNavId = useCallback((item: Artifact) => item.id, []);
  const clearSelection = useCallback(() => setSelected(null), []);
  useListNavigation({
    items: navigableItems,
    selectedId: selected?.id || null,
    getId: getNavId,
    onSelect: setSelected,
    onEscape: clearSelection,
  });

  const undo = async () => {
    if (await useUndoRedoStore.getState().undo()) {
      await reload();
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      setLastCompleted(null);
      setCompletionTimes((current) => {
        const next = { ...current };
        delete next[lastCompleted || ''];
        return next;
      });
      setSelected(null);
      toast.success('Completion undone');
    }
  };

  return (
    <div className="chronicle-split" style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}>
      <div className="chronicle-list-pane custom-scrollbar">
        <InPlayList
          tasks={displayInPlay}
          selectedId={selected?.id || null}
          completing={completing}
          departingIds={departingIds}
          onSelect={setSelected}
          onComplete={complete}
          onDefer={defer}
        />
        <InPlayList
          tasks={displayNextUp}
          selectedId={selected?.id || null}
          completing={completing}
          departingIds={departingIds}
          onSelect={setSelected}
          onComplete={complete}
          onDefer={defer}
          heading="Next"
          headingId="next-up-heading"
          emptyText={null}
        />
        <NowLine />
        <RecordList
          items={record}
          allArtifacts={artifacts}
          selectedId={selected?.id || null}
          arriving={arriving}
          completionTimes={completionTimes}
          onSelect={setSelected}
        />
        {lastCompleted ? (
          <div className="chronicle-undo-pill" role="status">
            <span>Moved below the now line</span>
            <button onClick={() => void undo()}>Undo</button>
          </div>
        ) : null}
      </div>
      <PaneDivider label="Resize Today list" value={listWidth} min={276} max={460} onChange={setListWidth} />
      {selected ? (
        <ArtifactDetail artifact={selected} onDeleted={clearSelection} />
      ) : (
        <TodayOverview inPlay={inPlay} record={record} onSelect={setSelected} />
      )}
    </div>
  );
}
