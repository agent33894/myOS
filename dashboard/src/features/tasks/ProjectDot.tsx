import { cn } from '../../ui';

/** A project's color as a small dot. */
export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
  );
}
