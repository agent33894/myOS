import type { ReactNode } from 'react';
import { cn } from '../cn';

interface PageLayoutProps {
  children: ReactNode;
  /** Documents open with a pinned top bar (Back, save state, ⋯) that brings its own top padding. */
  document?: boolean;
  /** Two-column flows such as Plan my day; the title still sits where other pages put it. */
  wide?: boolean;
  /** Usually the vertical gap between sections. */
  className?: string;
}

/**
 * The scrolling canvas and centered column every page shares, so titles and
 * rows line up as you move between Today, Inbox, Projects, a page, and Settings.
 * List pages run 8px wider on each side: their headers and rows carry `px-2`,
 * so row highlights bleed into the margin while text lines up with a document's.
 */
export function PageLayout({ children, document = false, wide = false, className }: PageLayoutProps) {
  return (
    <div className="scrollbar-stable h-full overflow-y-auto bg-canvas">
      <div className={cn('mx-auto flex flex-col pb-24', wide ? 'max-w-5xl' : 'max-w-3xl', document ? 'px-6' : 'px-4 pt-12', className)}>
        {children}
      </div>
    </div>
  );
}
