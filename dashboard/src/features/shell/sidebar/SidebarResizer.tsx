import type { PointerEvent } from 'react';
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useUIStore } from '../../../store/ui';

const STEP = 16;

/** The sidebar's right edge: drag, or focus and use the arrow keys, to resize. */
export function SidebarResizer() {
  const width = useUIStore((state) => state.sidebarWidth);
  const setWidth = useUIStore((state) => state.setSidebarWidth);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = (moveEvent: globalThis.PointerEvent) => setWidth(startWidth + moveEvent.clientX - startX);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      document.body.style.removeProperty('cursor');
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => setWidth(240)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') setWidth(width - STEP);
        if (event.key === 'ArrowRight') setWidth(width + STEP);
      }}
      className="group absolute inset-y-0 -right-1 z-10 flex w-2 cursor-col-resize justify-center outline-none"
    >
      <span className="w-px bg-transparent transition-colors duration-fast group-hover:bg-border-strong group-focus-visible:bg-focus" />
    </div>
  );
}
