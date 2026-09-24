import { cn } from '../cn';
import { Spinner } from '../Spinner';

interface LoadingStateProps {
  /** `rows` sketches a list while it loads; `spinner` suits small or unknown shapes. */
  variant?: 'rows' | 'spinner';
  rows?: number;
  label?: string;
  className?: string;
}

// Row sketches vary in width so the placeholder reads as a list, not a grid.
const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'];

/** A quiet placeholder while content loads. It fades in late, so fast loads never flash. */
export function LoadingState({ variant = 'rows', rows = 4, label = 'Loading', className }: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex justify-center py-12 text-text-tertiary animate-fade-in-delayed', className)}>
        <Spinner label={label} />
      </div>
    );
  }
  return (
    <div role="status" className={cn('flex flex-col gap-1 animate-fade-in-delayed', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex h-9 items-center gap-3 px-3">
          <span className="size-4 rounded-full bg-text/5" />
          <span className={cn('h-3 rounded-full bg-text/5', widths[index % widths.length])} />
        </div>
      ))}
    </div>
  );
}
