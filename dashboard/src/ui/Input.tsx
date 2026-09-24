import { forwardRef, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { useFieldControl } from './Field';
import { Icon } from './Icon';

export const inputVariants = cva(
  'w-full min-w-0 text-text transition-colors duration-fast ease-out placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-md border border-border bg-raised hover:border-border-strong focus-visible:border-accent aria-[invalid=true]:border-danger',
        /** Chrome-free, for inline title and row editing. */
        ghost: 'rounded-sm bg-transparent hover:bg-text/5 focus-visible:bg-text/5 focus-visible:outline-none',
      },
      size: {
        sm: 'h-7 text-sm',
        md: 'h-8 text-base',
      },
    },
    compoundVariants: [
      { variant: 'default', size: 'sm', className: 'px-2' },
      { variant: 'default', size: 'md', className: 'px-3' },
      { variant: 'ghost', className: 'px-1' },
    ],
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Leading icon. With an icon, `className` styles the wrapper (width, margins). */
  icon?: LucideIcon;
}

/** A single-line text field. Inside a `Field`, it is labelled automatically. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant, size, icon, className, type = 'text', ...rest },
  ref,
) {
  const props = useFieldControl(rest);
  const input = (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ variant, size }), icon && (size === 'sm' ? 'pl-7' : 'pl-8'), !icon && className)}
      {...props}
    />
  );
  if (!icon) return input;
  return (
    <span className={cn('relative flex w-full items-center', className)}>
      <span className={cn('pointer-events-none absolute text-text-tertiary', size === 'sm' ? 'left-2' : 'left-3')}>
        <Icon icon={icon} size={size === 'sm' ? 'sm' : 'md'} />
      </span>
      {input}
    </span>
  );
});
