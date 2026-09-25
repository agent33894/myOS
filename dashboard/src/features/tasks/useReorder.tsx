import { useState, type DragEvent } from 'react';
import { reorderToday } from '../../data/planning';
import { dragHasArtifact, readArtifactDragData } from '../../lib/artifactDnd';
import { cn } from '../../ui';
import { attempt } from './actions';

/**
 * Put today's plan in order: drag a row onto another, or ⌥↑ / ⌥↓. `paths`
 * is the list as shown; every change stores the whole order as one undo step.
 */
export function useReorder(paths: readonly string[]) {
  const [drop, setDrop] = useState<{ key: string; after: boolean } | null>(null);

  const place = (path: string, target: string, after: boolean) => {
    if (path === target || !paths.includes(path)) return;
    const order = paths.filter((candidate) => candidate !== path);
    const index = order.indexOf(target);
    if (index < 0) return;
    order.splice(after ? index + 1 : index, 0, path);
    attempt(reorderToday(order), 'Could not reorder');
    // Keep the moved row focused after React moves it.
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-reorder-key="${CSS.escape(path)}"] [data-task-row], [data-reorder-key="${CSS.escape(path)}"][data-task-row]`)?.focus(),
    );
  };

  const move = (path: string, step: 1 | -1) => {
    const neighbour = paths[paths.indexOf(path) + step];
    if (neighbour) place(path, neighbour, step === 1);
  };

  const dropProps = (key: string) => ({
    'data-reorder-key': key,
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!dragHasArtifact(event)) return;
      event.preventDefault();
      const box = event.currentTarget.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      if (drop?.key !== key || drop.after !== after) setDrop({ key, after });
    },
    onDragLeave: () => setDrop((current) => (current?.key === key ? null : current)),
    onDrop: (event: DragEvent<HTMLElement>) => {
      const payload = readArtifactDragData(event);
      const after = drop?.after ?? false;
      setDrop(null);
      if (!payload) return;
      event.preventDefault();
      place(payload.filePath, key, after);
    },
  });

  return { move, dropProps, markerFor: (key: string) => (drop?.key === key ? drop : null) };
}

/** The accent line showing where a dragged row will land. */
export function DropMarker({ after }: { after: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-accent', after ? '-bottom-px' : '-top-px')}
    />
  );
}
