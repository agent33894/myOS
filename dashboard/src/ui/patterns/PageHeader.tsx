import type { ReactNode } from 'react';
import { cn } from '../cn';

interface PageHeaderProps {
  /** Text, or a ghost `Input` when the title is editable in place. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons aligned to the end of the title line. */
  actions?: ReactNode;
  /** `2xl` for documents and hero moments; `xl` for list pages. */
  size?: 'xl' | '2xl';
  className?: string;
}

/** The title block at the top of a page. */
export function PageHeader({ title, subtitle, actions, size = 'xl', className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start gap-4', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className={cn('font-semibold text-text', size === 'xl' ? 'text-xl' : 'text-2xl')}>{title}</h1>
        {subtitle ? <p className="text-base text-text-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
