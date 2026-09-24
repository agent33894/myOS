import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Icon } from './Icon';

const pillVariants = cva('inline-flex h-6 max-w-full items-center gap-1 rounded-full px-2 text-sm font-medium', {
  variants: {
    tone: {
      neutral: 'bg-text/5 text-text-secondary',
      accent: 'bg-accent-soft text-accent-text',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

interface PillProps extends VariantProps<typeof pillVariants> {
  icon?: LucideIcon;
  /** Shows a remove button. */
  onRemove?: () => void;
  /** Accessible name for the remove button. */
  removeLabel?: string;
  className?: string;
  children: ReactNode;
}

/** A compact chip for tags, statuses, and property values. */
export function Pill({ tone, icon, onRemove, removeLabel = 'Remove', className, children }: PillProps) {
  return (
    <span className={cn(pillVariants({ tone }), onRemove && 'pr-0.5', className)}>
      {icon ? <Icon icon={icon} size="sm" /> : null}
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="inline-flex size-5 items-center justify-center rounded-full opacity-70 transition-opacity duration-fast hover:bg-text/10 hover:opacity-100"
        >
          <Icon icon={X} size="sm" />
        </button>
      ) : null}
    </span>
  );
}
