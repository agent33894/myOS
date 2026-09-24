import type { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Kbd } from './Kbd';

/** Mount once near the app root so tooltips share one short warm-up delay. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

interface TooltipProps {
  content: ReactNode;
  /** Optional shortcut in `mod+k` form, shown after the content. */
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** A single focusable element (the trigger). */
  children: ReactNode;
}

/** A short hint on hover and keyboard focus. Supplements a label; never replaces one. */
export function Tooltip({ content, shortcut, side = 'bottom', children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-popover flex max-w-xs items-center gap-2 rounded-sm bg-text px-2 py-1 text-xs font-medium text-canvas shadow-overlay animate-fade-in"
        >
          {content}
          {shortcut ? <Kbd shortcut={shortcut} className="h-4 bg-canvas/15 text-canvas" /> : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
