import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Chronicle control voice: compact native-Mac density (28px default), 13px
// type, --radius-control corners, stamp focus, restrained press.
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:brightness-105',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-transparent text-foreground hover:bg-secondary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
        link: 'text-[var(--ds2-stamp)] underline-offset-4 hover:underline',
        accent: 'bg-accent text-accent-foreground hover:brightness-105',
        icon: 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
      },
      size: {
        default: 'h-7 px-3',
        sm: 'h-6 px-2 text-xs',
        lg: 'h-9 px-5',
        icon: 'h-7 w-7 p-1.5',
      },
      shape: {
        default: 'rounded-md',
        square: 'rounded-none',
        pill: 'rounded-full',
      },
    },
    compoundVariants: [
      { variant: 'icon', size: 'sm', class: 'h-6 w-6 p-1' },
      { variant: 'icon', size: 'lg', class: 'h-9 w-9 p-2' },
    ],
    defaultVariants: { variant: 'default', size: 'default', shape: 'default' },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, shape, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
