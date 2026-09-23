import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useTasksStore } from '../../store/tasks';
import { useArtifactsStore } from '../../store/artifacts';
import { useUndoableArtifact } from '../../hooks/useUndoableArtifact';
import { useListNavigation } from '../../hooks/useListNavigation';
import { useUndoRedoStore } from '../../store/undoRedo';
import type { Artifact } from '../../types/artifacts';
import { TodoStatus } from '../../types/artifacts';
import type { InboxQueueEntry } from '../../types/tasks';
import InboxProcessor from '../../components/tasks/InboxProcessor';
import RefineModal from '../../components/artifacts/RefineModal';
import { ArtifactDetail } from '../shell/ArtifactDetail';
import { ChronicleCheckmark } from '../today/ChronicleCheckmark';
import { localDateStamp } from '../today/todaySelectors';
import { PaneDivider } from '../../components/ui/PaneDivider';
import { cn } from '../../lib/utils';
import { setArtifactDragData } from '../../lib/artifactDnd';
import { primaryModifier } from '../../utils/platform';

const LIST_WIDTH_KEY = 'chronicle-unfiled-list-width';
const COMPLETION_HOLD_MS = 450;
const DEPART_MS = 300;
const UNDO_WINDOW_MS = 4_000;

function entryId(entry: InboxQueueEntry): string {
  return entry.kind === 'task' ? entry.task.id : entry.artifact.id;
}
function entryTitle(entry: InboxQueueEntry): string {
  return entry.kind === 'task' ? entry.task.title : entry.artifact.title;
}

export default function UnfiledPage() {
  const inboxEntries = useTasksStore((state) => state.inboxEntries);
  const refreshTasks = useTasksStore((state) => state.refreshTasks);
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const updateStoreArtifact = useArtifactsStore((state) => state.updateArtifact);
  const reload = useArtifactsStore((state) => state.loadArtifacts);
  const { undoableUpdate } = useUndoableArtifact();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refineArtifactId, setRefineArtifactId] = useState<string | null>(null);
  const [showProcessor, setShowProcessor] = useState(false);
  // Same completion grammar as Today: checkmark draw + stamp, then depart.
  const [completing, setCompleting] = useState<Map<string, string>>(new Map());
  const [departingIds, setDepartingIds] = useState<Set<string>>(new Set());
  const [ghostEntries, setGhostEntries] = useState<Array<{ entry: InboxQueueEntry; index: number }>>([]);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);
  const rowTimers = useRef<number[]>([]);
  const [listWidth, setListWidth] = useState(() => Number(localStorage.getItem(LIST_WIDTH_KEY)) || 308);
  useEffect(() => {
    localStorage.setItem(LIST_WIDTH_KEY, String(listWidth));
  }, [listWidth]);
  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);
  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      rowTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  // Adopt the first entry once data arrives — and re-adopt when the selected
  // entry leaves the queue (completed, deleted, refined), so the detail pane
  // never dangles on an id that no longer resolves.
  useEffect(() => {
    const stillQueued = selectedId !== null && inboxEntries.some((entry) => entryId(entry) === selectedId);
    if (stillQueued) return;
    setSelectedId(inboxEntries.length > 0 ? entryId(inboxEntries[0]) : null);
  }, [selectedId, inboxEntries]);

  const selected: Artifact | null = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedId) || null,
    [artifacts, selectedId],
  );

  const complete = useCallback(
    async (taskId: string) => {
      if (completing.has(taskId)) return;
      const task = artifacts.find((artifact) => artifact.id === taskId);
      if (!task) return;
      const completedAt = new Date();
      const timestamp = completedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const index = inboxEntries.findIndex((entry) => entryId(entry) === taskId);
      const entry = inboxEntries[index];
      setCompleting((current) => new Map(current).set(taskId, timestamp));
      const today = localDateStamp(completedAt);
      const next: Artifact = { ...task, status: TodoStatus.DONE, completedDate: today, updated: today };
      try {
        const persistence = undoableUpdate(task.filePath, task, next, `Complete ${task.title}`);
        const [persisted] = await Promise.all([
          persistence,
          new Promise<void>((resolve) => window.setTimeout(resolve, COMPLETION_HOLD_MS)),
        ]);
        if (entry) {
          setGhostEntries((current) => [...current, { entry, index }]);
          setDepartingIds((current) => new Set(current).add(taskId));
        }
        updateStoreArtifact(persisted);
        setLastCompleted(taskId);
        rowTimers.current.push(
          window.setTimeout(() => {
            setGhostEntries((current) => current.filter((ghost) => entryId(ghost.entry) !== taskId));
            setDepartingIds((current) => {
              const nextIds = new Set(current);
              nextIds.delete(taskId);
              return nextIds;
            });
            setCompleting((current) => {
              const nextMap = new Map(current);
              nextMap.delete(taskId);
              return nextMap;
            });
          }, DEPART_MS),
        );
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setLastCompleted(null), UNDO_WINDOW_MS);
      } catch (error) {
        setCompleting((current) => {
          const nextMap = new Map(current);
          nextMap.delete(taskId);
          return nextMap;
        });
        toast.error(error instanceof Error ? error.message : 'Could not complete task');
      }
    },
    [artifacts, completing, inboxEntries, undoableUpdate, updateStoreArtifact],
  );

  const undo = async () => {
    if (await useUndoRedoStore.getState().undo()) {
      await reload();
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      setLastCompleted(null);
      toast.success('Completion undone');
    }
  };

  const displayEntries = useMemo(() => {
    if (ghostEntries.length === 0) return inboxEntries;
    const merged = [...inboxEntries];
    for (const ghost of ghostEntries) {
      merged.splice(Math.min(ghost.index, merged.length), 0, ghost.entry);
    }
    return merged;
  }, [inboxEntries, ghostEntries]);

  const getNavId = useCallback((entry: InboxQueueEntry) => entryId(entry), []);
  const selectEntry = useCallback((entry: InboxQueueEntry) => setSelectedId(entryId(entry)), []);
  useListNavigation({
    items: inboxEntries,
    selectedId,
    getId: getNavId,
    onSelect: selectEntry,
    onEscape: () => setSelectedId(inboxEntries.length > 0 ? entryId(inboxEntries[0]) : null),
    enabled: !showProcessor && !refineArtifactId,
  });

  return (
    <div className="chronicle-split" style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}>
      <div className="chronicle-list-pane custom-scrollbar">
        <section aria-labelledby="unfiled-heading">
          {/* The page name lives in the toolbar; the section gets a functional
              name, same as Today's "In Play". */}
          <div className="chronicle-list-heading chronicle-list-heading-row">
            <span id="unfiled-heading">Waiting</span>
            <span key={inboxEntries.length} className="chronicle-count">{inboxEntries.length}</span>
            {inboxEntries.length > 0 ? (
              <button className="chronicle-heading-action active:scale-[0.98]" onClick={() => setShowProcessor(true)}>
                Process
              </button>
            ) : null}
          </div>
          {inboxEntries.length === 0 ? (
            <p className="chronicle-empty-row">Nothing waiting. Capture with {primaryModifier}N and it lands here.</p>
          ) : null}
          {displayEntries.map((entry) => {
            const id = entryId(entry);
            const isCompleting = completing.has(id);
            const isDeparting = departingIds.has(id);
            const dragArtifact = entry.kind === 'task' ? entry.task : entry.artifact;
            return (
              <div
                key={id}
                data-nav-id={id}
                draggable
                onDragStart={(event) => setArtifactDragData(event, dragArtifact)}
                className={cn(
                  'chronicle-task-row',
                  selectedId === id && 'is-selected',
                  isCompleting && 'is-completing',
                  isDeparting && 'is-departing',
                )}
              >
                {entry.kind === 'task' ? (
                  <button
                    className="chronicle-completion"
                    onClick={() => void complete(entry.task.id)}
                    aria-label={`Complete ${entry.task.title}`}
                    disabled={isCompleting}
                  >
                    <span>
                      <ChronicleCheckmark />
                    </span>
                  </button>
                ) : (
                  <span className="chronicle-capture-glyph" aria-hidden="true">
                    <Inbox className="h-4 w-4" />
                  </span>
                )}
                <button className="chronicle-row-body active:scale-[0.98]" onClick={() => setSelectedId(id)}>
                  <span className="chronicle-row-title">{entryTitle(entry)}</span>
                  <span className="chronicle-row-meta">{entry.kind === 'task' ? 'Task' : 'Capture'}</span>
                </button>
                {isCompleting ? <time className="chronicle-completion-time">{completing.get(id)}</time> : null}
                {!isCompleting ? (
                  <div className="chronicle-row-affordances">
                    <button onClick={() => setRefineArtifactId(id)} aria-label={`Refine ${entryTitle(entry)}`}>
                      Refine
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
        {lastCompleted ? (
          <div className="chronicle-undo-pill" role="status">
            <span>Task closed</span>
            <button onClick={() => void undo()}>Undo</button>
          </div>
        ) : null}
      </div>
      <PaneDivider label="Resize Unfiled list" value={listWidth} min={276} max={460} onChange={setListWidth} />
      <ArtifactDetail artifact={selected} onDeleted={() => setSelectedId(null)} />

      {showProcessor ? (
        <InboxProcessor
          entries={inboxEntries}
          onClose={() => {
            setShowProcessor(false);
            refreshTasks();
          }}
        />
      ) : null}
      {refineArtifactId ? (
        <RefineModal
          isOpen
          artifactId={refineArtifactId}
          onClose={() => setRefineArtifactId(null)}
          onPromoted={() => {
            setRefineArtifactId(null);
            refreshTasks();
          }}
        />
      ) : null}
    </div>
  );
}
