import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  title?: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** sm = 24px options (default), md = 28px. */
  size?: 'sm' | 'md';
  'aria-label': string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('chronicle-segmented', size === 'md' && 'chronicle-segmented--md', className)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            title={option.title}
            disabled={option.disabled}
            className={cn('chronicle-segmented-option', option.value === value && 'is-active')}
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
