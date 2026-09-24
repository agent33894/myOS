import { cn } from './cn';

interface SpinnerProps {
  size?: 'sm' | 'md';
  /** Announced to assistive technology. */
  label?: string;
  className?: string;
}

/** An indeterminate progress ring in the current text color. */
export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex shrink-0', className)}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn('animate-spin', size === 'sm' ? 'size-3' : 'size-4')}
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.75" />
        <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
