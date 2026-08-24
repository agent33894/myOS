import FocusLock from 'react-focus-lock';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function CommandSurface({
  title,
  onClose,
  children,
  labelledBy,
  describedBy,
  variant = 'command',
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  variant?: 'command' | 'dialog' | 'tall';
  className?: string;
}) {
  const titleId = labelledBy || 'command-surface-title';
  return (
    <div
      className={cn('chronicle-modal-layer', variant === 'dialog' && 'is-dialog', variant === 'tall' && 'is-tall')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <FocusLock returnFocus>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          className={cn(
            'chronicle-command-surface',
            variant !== 'command' && 'is-dialog',
            variant === 'tall' && 'is-tall',
            className,
          )}
        >
          {!labelledBy ? (
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
          ) : null}
          {children}
        </section>
      </FocusLock>
    </div>
  );
}
