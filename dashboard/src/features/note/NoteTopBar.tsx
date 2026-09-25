import type { ReactNode, Ref } from 'react';

interface NoteTopBarProps {
  /** The way back: Back, a breadcrumb. */
  leading?: ReactNode;
  /** Where the editor docks its find bar, just before the trailing controls. */
  findSlot: Ref<HTMLDivElement>;
  /** Save state and the ⋯ menu. */
  children: ReactNode;
}

/**
 * The bar above a note. It stays pinned while the note scrolls, so
 * find and the note's controls are always in reach and never cover
 * the writing.
 */
export function NoteTopBar({ leading, findSlot, children }: NoteTopBarProps) {
  return (
    // Focus mode fades the bar until the pointer comes back to it (features/shell/focus/focus.css).
    <div data-focus-hide="reveal" className="sticky top-0 z-sticky flex h-14 items-center gap-1 bg-canvas pt-4">
      {leading}
      <div className="ml-auto flex items-center gap-2">
        <div ref={findSlot} className="contents" />
        {children}
      </div>
    </div>
  );
}
