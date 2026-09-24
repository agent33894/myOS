import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from './cn';

const sizes = { sm: 14, md: 16, lg: 20 } as const;

export type IconSize = keyof typeof sizes;

interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  /** sm 14 (dense metadata) · md 16 (interface) · lg 20 (empty states). */
  size?: IconSize;
}

/** A Lucide icon at the design system's stroke and sizes. Decorative by default. */
export function Icon({ icon: Glyph, size = 'md', className, ...props }: IconProps) {
  const labelled = props['aria-label'] !== undefined;
  return (
    <Glyph
      size={sizes[size]}
      strokeWidth={1.75}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      {...props}
      className={cn('shrink-0', className)}
    />
  );
}
