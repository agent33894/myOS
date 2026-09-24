import type { ReactNode } from 'react';
import { cn } from '../cn';

interface SectionHeaderProps {
  title: ReactNode;
  count?: number;
  /** Usually a ghost `IconButton` or small `Button`. */
  action?: ReactNode;
  /** Heading level for the document outline. */
  as?: 'h2' | 'h3';
  className?: string;
}

/** A quiet label above a group of rows. Sentence case, never uppercase. */
export function SectionHeader({ title, count, action, as: Heading = 'h2', className }: SectionHeaderProps) {
  return (
    <div className={cn('flex h-8 items-center gap-2 px-3', className)}>
      <Heading className="text-sm font-medium text-text-secondary">
        {title}
        {count !== undefined ? <span className="ml-1.5 tabular-nums text-text-tertiary">{count}</span> : null}
      </Heading>
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </div>
  );
}
