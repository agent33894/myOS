import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../cn';
import { Icon } from '../Icon';

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  /** One warm sentence that invites the next step. */
  description?: ReactNode;
  /** Usually one `Button`. */
  action?: ReactNode;
  tone?: 'accent' | 'danger';
  className?: string;
}

/** A calm, centered placeholder for an empty list or page. */
export function EmptyState({ icon, title, description, action, tone = 'accent', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span
        className={cn(
          'mb-1 grid size-12 place-items-center rounded-full',
          tone === 'accent' ? 'bg-accent-soft text-accent-text' : 'bg-danger-soft text-danger',
        )}
      >
        <Icon icon={icon} size="lg" />
      </span>
      <h2 className="text-md font-semibold text-text">{title}</h2>
      {description ? <p className="max-w-xs text-base text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
