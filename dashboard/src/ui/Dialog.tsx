import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof sizes;
}

/**
 * A modal surface over a blurred scrim. Traps focus, closes on Escape and
 * outside click, restores focus on close, and always offers a close button.
 * Include a `DialogTitle`; add `aria-describedby={undefined}` when there is no description.
 */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { size = 'md', className, children, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-dialog grid place-items-center overflow-y-auto bg-scrim p-6 backdrop-blur-scrim data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'relative flex w-full flex-col gap-4 rounded-xl bg-overlay p-6 text-text shadow-dialog outline-none data-[state=open]:animate-dialog-in data-[state=closed]:animate-fade-out',
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close asChild>
            <IconButton icon={X} label="Close" size="sm" className="absolute right-3 top-3" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
});

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />;
}

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />;
});

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description ref={ref} className={cn('text-base text-text-secondary', className)} {...props} />
  );
});

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-2 flex items-center justify-end gap-2', className)} {...props} />;
}
