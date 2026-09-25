import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../../ui';

const MIN = 180;
const MAX = 480;
const FOLD_BELOW = 120;
const clamp = (width: number) => Math.round(Math.min(MAX, Math.max(MIN, width)));

interface ResizeHandleProps {
  side: 'left' | 'right';
  width: number;
  /** While dragging (not saved yet). */
  onResize: (width: number) => void;
  /** On release: the width to keep, or fold when dragged nearly shut. */
  onCommit: (width: number, fold: boolean) => void;
}

/** The edge between a side column and the editor: drag to resize, arrow keys too, double-click to fold. */
export function ResizeHandle({ side, width, onResize, onCommit }: ResizeHandleProps) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const sign = side === 'left' ? 1 : -1;
  const raw = (event: PointerEvent) => (start.current ? start.current.width + sign * (event.clientX - start.current.x) : width);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? 'Resize the files' : 'Resize the panel'}
      aria-valuenow={width}
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { x: event.clientX, width };
        document.documentElement.dataset.resizing = '';
      }}
      onPointerMove={(event) => {
        if (start.current) onResize(clamp(raw(event)));
      }}
      onPointerUp={(event) => {
        if (!start.current) return;
        const next = raw(event);
        start.current = null;
        delete document.documentElement.dataset.resizing;
        onCommit(clamp(next), next < FOLD_BELOW);
      }}
      onDoubleClick={() => onCommit(width, true)}
      onKeyDown={(event: KeyboardEvent) => {
        const step = { ArrowLeft: -16, ArrowRight: 16 }[event.key];
        if (!step) return;
        event.preventDefault();
        onCommit(clamp(width + sign * step), false);
      }}
      className={cn(
        'group relative z-10 w-2 shrink-0 cursor-col-resize outline-none',
        side === 'left' ? '-mr-1 -ml-1' : '-ml-1 -mr-1',
      )}
    >
      <span className="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-transparent transition-colors duration-fast group-hover:bg-border-strong group-focus-visible:bg-focus group-active:bg-accent" />
    </div>
  );
}
