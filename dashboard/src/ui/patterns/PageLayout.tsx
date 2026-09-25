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
 * The scrolling canvas and centered column every page shares, so titles and
 * rows line up as you move between Today, Tasks, a note, and Settings.
 * List pages run 8px wider on each side: their headers and rows carry `px-2`,
 * so row highlights bleed into the margin while text lines up with a document's.
 */
export function PageLayout({ children, document = false, className }: PageLayoutProps) {
  return (
    <div className="scrollbar-stable h-full overflow-y-auto bg-canvas">
      <div className={cn('mx-auto flex max-w-3xl flex-col pb-24', document ? 'px-6' : 'px-4 pt-12', className)}>
        {children}
      </div>
    </div>
  );
}
