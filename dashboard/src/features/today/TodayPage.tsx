import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { defer as deferTask, toggleComplete } from '../../data/gateway';
import { useArtifacts, useToday } from '../../data/selectors';
import { undo as undoLast } from '../../data/undo';
import { useListNavigation } from '../../hooks/useListNavigation';
import type { ArtifactSummary } from '@shared/types';
import { localDateStamp, selectRecord } from './todaySelectors';
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
  task: ArtifactSummary;
  index: number;
  list: 'inPlay' | 'nextUp';
}

function insertGhosts(tasks: ArtifactSummary[], ghosts: Ghost[], list: Ghost['list']): ArtifactSummary[] {
  const own = ghosts.filter((ghost) => ghost.list === list);
  if (own.length === 0) return tasks;
  const merged = [...tasks];
  for (const ghost of own) {
    merged.splice(Math.min(ghost.index, merged.length), 0, ghost.task);
  }
  return merged;
}

export default function TodayPage() {
  const artifacts = useArtifacts();
  const today = useToday();
  // In Play is exactly what the sidebar counts: overdue, then due today, flagged, or in progress.
  const inPlay = useMemo(() => [...today.overdue, ...today.today], [today]);
  const nextUp = today.upcoming;
  const record = useMemo(() => selectRecord(artifacts), [artifacts]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const selected = useMemo(
    () => artifacts.find((artifact) => artifact.filePath === selectedPath) ?? null,
    [artifacts, selectedPath],
  );
  const setSelected = useCallback((artifact: ArtifactSummary | null) => setSelectedPath(artifact?.filePath ?? null), []);
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

  const complete = useCallback(
    async (task: ArtifactSummary) => {
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
      try {
        const [persisted] = await Promise.all([
          toggleComplete(task),
          new Promise<void>((resolve) => window.setTimeout(resolve, COMPLETION_HOLD_MS)),
        ]);
        // The row leaves In Play in the store, but stays rendered as a
        // departing ghost so completion reads as one continuous motion.
        setGhosts((current) => [...current, { ...ghost, task: persisted }]);
        setDepartingIds((current) => new Set(current).add(task.id));
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
    [completing, inPlay, nextUp],
  );

  const defer = useCallback(
    async (task: ArtifactSummary) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      try {
        await deferTask(task, localDateStamp(tomorrow));
        toast.success('Deferred until tomorrow');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not defer task');
      }
    },
    [],
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
  const getNavId = useCallback((item: ArtifactSummary) => item.id, []);
  const clearSelection = useCallback(() => setSelected(null), []);
  useListNavigation({
    items: navigableItems,
    selectedId: selected?.id || null,
    getId: getNavId,
    onSelect: setSelected,
    onEscape: clearSelection,
  });

  const undo = async () => {
    try {
      await undoLast();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo');
      return;
    }
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setLastCompleted(null);
    setCompletionTimes((current) => {
      const next = { ...current };
      delete next[lastCompleted || ''];
      return next;
    });
    setSelected(null);
    toast.success('Completion undone');
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
