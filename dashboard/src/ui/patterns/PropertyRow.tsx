import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../cn';
import { Icon } from '../Icon';

interface PropertyRowProps {
  /** `Property` chips. */
  children: ReactNode;
  className?: string;
}

/** An inline row of properties, such as a note's frontmatter keys. */
export function PropertyRow({ children, className }: PropertyRowProps) {
  return (
    <div role="group" aria-label="Properties" className={cn('flex flex-wrap items-center gap-1', className)}>
      {children}
    </div>
  );
}

interface PropertyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** What the property is ("Due date"); read by assistive technology before the value. */
  label: string;
  /** The current value; when empty, `placeholder` is shown. */
  children?: ReactNode;
  placeholder?: string;
  tone?: 'default' | 'accent' | 'danger';
}

/**
 * One label-less property chip: icon + value. Use it as the trigger of the
 * editor, e.g. `<DatePicker><Property …/></DatePicker>`.
 */
export const Property = forwardRef<HTMLButtonElement, PropertyProps>(function Property(
  { icon, label, children, placeholder, tone = 'default', className, type = 'button', ...props },
  ref,
) {
  const empty = children === undefined || children === null || children === '' || children === false;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-sm transition-colors duration-fast ease-out hover:bg-text/5 data-[state=open]:bg-text/5',
        empty
          ? 'text-text-tertiary'
          : tone === 'accent'
            ? 'text-accent-text'
            : tone === 'danger'
              ? 'text-danger'
              : 'text-text-secondary hover:text-text',
        className,
      )}
      {...props}
    >
      <Icon icon={icon} size="sm" />
      <span className="sr-only">{label}: </span>
      <span className="truncate">{empty ? (placeholder ?? label) : children}</span>
    </button>
  );
});
