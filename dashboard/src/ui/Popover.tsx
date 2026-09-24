import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from './cn';
import { floatingSurface } from './styles';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

/** A floating panel anchored to its trigger. Owns focus, Escape, and outside clicks. */
export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent(
  { className, align = 'start', sideOffset = 6, collisionPadding = 8, ...props },
  ref,
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(floatingSurface, 'p-3 outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
