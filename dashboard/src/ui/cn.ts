import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the token names from tailwind.config.mjs so that, for
// example, `shadow-overlay` replaces `shadow-raised` instead of both surviving.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['raised', 'overlay', 'dialog'],
      ease: ['out', 'spring'],
      animate: ['fade-in', 'fade-in-delayed', 'fade-out', 'scale-in', 'dialog-in', 'slide-up', 'check-pop'],
    },
    classGroups: {
      z: [{ z: ['sticky', 'dialog', 'popover', 'toast'] }],
      duration: [{ duration: ['fast', 'base', 'slow'] }],
    },
  },
});

/** Join class names; later Tailwind utilities win over conflicting earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
