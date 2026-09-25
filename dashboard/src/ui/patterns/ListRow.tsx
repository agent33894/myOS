import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../cn';

// Roles for which aria-selected is meaningful; elsewhere selection is aria-current.
const SELECTABLE_ROLES = new Set(['option', 'row', 'gridcell', 'tab', 'treeitem']);

interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Checkbox, icon, or swatch before the title. */
  leading?: ReactNode;
  /** The row's title. */
  children: ReactNode;
  /** Quiet metadata after the title (date, count, path). */
  meta?: ReactNode;
  /** Controls at the end of the row, such as an IconButton. */
  trailing?: ReactNode;
  selected?: boolean;
  /** Click or Enter. Makes the row focusable. */
  onActivate?: () => void;
}

/**
 * A 36px list row: leading · title · meta · trailing. Pass `role` to match its
 * container (for example `option` inside a `listbox`).
 */
export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  { leading, children, meta, trailing, selected = false, onActivate, role, className, onKeyDown, onClick, ...props },
  ref,
) {
  const selectable = role !== undefined && SELECTABLE_ROLES.has(role);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && event.key === 'Enter' && event.target === event.currentTarget) {
      event.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      ref={ref}
      role={role}
      tabIndex={onActivate ? 0 : undefined}
      aria-selected={selectable ? selected : undefined}
      aria-current={!selectable && selected ? 'true' : undefined}
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onActivate?.();
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex min-h-9 items-center gap-3 rounded-md px-3 text-base text-text transition-colors duration-fast ease-out',
        onActivate && 'cursor-default',
        selected ? 'bg-accent-soft' : 'hover:bg-text/5',
        className,
      )}
      {...props}
    >
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta ? <span className="shrink-0 text-sm text-text-tertiary">{meta}</span> : null}
      {trailing ? <span className="flex shrink-0 items-center gap-1">{trailing}</span> : null}
    </div>
  );
});
