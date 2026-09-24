import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-fast ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-on hover:bg-accent-hover',
        secondary: 'bg-text/5 text-text hover:bg-text/10 active:bg-text/15',
        ghost: 'text-text-secondary hover:bg-text/5 hover:text-text active:bg-text/10',
        danger: 'bg-danger-soft text-danger hover:bg-danger/20',
      },
      size: {
        sm: 'h-7 gap-1.5 px-2 text-sm',
        md: 'h-8 gap-2 px-3 text-base',
      },
      icon: { true: 'px-0', false: '' },
    },
    compoundVariants: [
      { icon: true, size: 'sm', className: 'w-7' },
      { icon: true, size: 'md', className: 'w-8' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md', icon: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'icon'> {
  /** Square button holding only an icon. Prefer `IconButton`, which adds the label and tooltip. */
  icon?: boolean;
  /** Icon shown before the label. */
  leadingIcon?: LucideIcon;
  /** Shows a spinner in place of the leading icon and blocks interaction. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon = false, leadingIcon, loading = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, icon }), className)}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" label="Working" />
      ) : leadingIcon ? (
        <Icon icon={leadingIcon} size={size === 'sm' ? 'sm' : 'md'} />
      ) : null}
      {children}
    </button>
  );
});
