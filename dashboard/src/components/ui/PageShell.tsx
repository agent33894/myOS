import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  /** Accepted for API compatibility; the shell toolbar already names the page. */
  title?: string;
  subtitle?: string;
  headerContent?: ReactNode;
  headerAside?: ReactNode;
  topBar?: ReactNode;
  topBarClassName?: string;
  contentBorder?: boolean;
  contentClassName?: string;
  children: ReactNode;
}

export default function PageShell({
  headerContent,
  headerAside,
  topBar,
  topBarClassName,
  contentBorder = true,
  contentClassName,
  children,
}: PageShellProps) {
  // The Chronicle toolbar already displays the page name, so PageShell no
  // longer renders a hero title — only a compact strip when a page brings
  // its own stats or actions.
  const hasHeader = Boolean(headerContent || headerAside);
  return (
    <section className="chronicle-page-shell flex h-full min-h-0 flex-col bg-background">
      {hasHeader && (
        <header className="chronicle-page-strip flex min-h-12 flex-shrink-0 items-center justify-between gap-4 px-6 py-2">
          <div className="min-w-0 flex-1">{headerContent}</div>
          {headerAside}
        </header>
      )}
      {topBar && <div className={cn('chronicle-page-strip flex-shrink-0', topBarClassName)}>{topBar}</div>}
      <div className={cn('chronicle-page-content min-h-0 flex-1', contentBorder && 'border-border', contentClassName)}>
        {children}
      </div>
    </section>
  );
}
