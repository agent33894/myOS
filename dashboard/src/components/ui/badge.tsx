import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('chronicle-stamp-label transition-colors', {
  variants: {
    variant: {
      default: 'text-foreground',
      secondary: 'text-muted-foreground',
      outline: 'text-foreground',
      tag: 'text-muted-foreground',
      success: 'ed-text-success',
      error: 'ed-text-error',
      warning: 'ed-text-warning',
      info: 'ed-text-info',
      neutral: 'text-muted-foreground',
      accent: 'accent-text',
      domain: 'accent-text',
    },
    size: {
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-2',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, ...props }, ref) => {
  return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />;
});
Badge.displayName = 'Badge';

export { Badge };
