import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ArtifactSummary } from '@shared/types';
import { toggleComplete } from '../../../data/gateway';
import { useToday } from '../../../data/selectors';
import { toLibraryArtifactUrl } from '../../artifact-route/routeContract';
import { cn } from '../../../lib/utils';

/** The ledger shows the top of the day, not the whole day — Today owns the rest. */
const ROW_LIMIT = 3;
/** Completed rows hold their filled ring briefly so completion reads as a moment. */
const COMPLETION_HOLD_MS = 700;

/**
 * The Daybook's ambient block: today's In Play todos as ledger lines with
 * completion rings. Completing is undoable, like the Today page.
 */
export function SidebarInPlay() {
  const navigate = useNavigate();
  const today = useToday();
  const [completingIds, setCompletingIds] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const inPlay = useMemo(() => [...today.overdue, ...today.today].slice(0, ROW_LIMIT), [today]);

  const complete = useCallback(
    async (task: ArtifactSummary) => {
      if (completingIds.has(task.id)) return;
      setCompletingIds((current) => new Set(current).add(task.id));
      try {
        await Promise.all([
          toggleComplete(task),
          new Promise<void>((resolve) => {
            timers.current.push(window.setTimeout(resolve, COMPLETION_HOLD_MS));
          }),
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not complete task');
      } finally {
        setCompletingIds((current) => {
          const nextIds = new Set(current);
          nextIds.delete(task.id);
          return nextIds;
        });
      }
    },
    [completingIds],
  );

  if (inPlay.length === 0) return null;

  return (
    <div className="chronicle-inplay">
      <div className="chronicle-inplay-label">
        <span>In Play</span>
        <span className="chronicle-inplay-lamp" aria-hidden="true" />
      </div>
      {inPlay.map((task) => {
        const done = completingIds.has(task.id);
        return (
          <div key={task.id} className={cn('chronicle-inplay-row', done && 'is-done')}>
            <button
              type="button"
              className="chronicle-inplay-ring"
              aria-label={`Complete ${task.title}`}
              onClick={() => void complete(task)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path className="chronicle-inplay-check" d="M3.2 6.4 5.1 8.2 8.8 3.9" />
              </svg>
            </button>
            <button
              type="button"
              className="chronicle-inplay-title"
              onClick={() => navigate(toLibraryArtifactUrl(task.filePath))}
            >
              {task.title}
            </button>
          </div>
        );
      })}
    </div>
  );
}
