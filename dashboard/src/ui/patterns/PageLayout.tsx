import type { ReactNode } from 'react';
import { cn } from '../cn';

interface PageLayoutProps {
  children: ReactNode;
  /** Documents open with a pinned top bar (Back, save state, ⋯) that brings its own top padding. */
  document?: boolean;
  /** Usually the vertical gap between sections. */
  className?: string;
}

/**
 * The scrolling canvas and the sheet every page sits on: a softly raised,
 * centered page as wide as the text column (Appearance → Line width) plus
 * its margins. Titles and rows line up as you move between Today, Tasks, a
 * note, and Settings. Inside the sheet `bg-canvas` is the sheet's own color.
 * List pages run 8px wider on each side: their headers and rows carry `px-2`,
 * so row highlights bleed into the margin while text lines up with a document's.
 */
export function PageLayout({ children, document = false, className }: PageLayoutProps) {
  return (
    <div className="scrollbar-stable flex h-full flex-col overflow-y-auto bg-canvas px-3 pb-3">
      <div className="sheet mx-auto flex w-full max-w-sheet shrink-0 grow flex-col rounded-xl bg-sheet shadow-sheet">
        <div className={cn('flex flex-col pb-24', document ? 'px-8 pt-1 md:px-14' : 'px-6 pt-12 md:px-12', className)}>{children}</div>
      </div>
    </div>
  );
}
