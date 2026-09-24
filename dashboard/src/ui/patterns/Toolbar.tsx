import { useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../cn';

const ITEMS = 'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"])';

interface ToolbarProps {
  'aria-label': string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: ReactNode;
}

/**
 * A group of controls that is one Tab stop; arrow keys, Home, and End move
 * between its buttons (roving tabindex).
 */
export function Toolbar({ 'aria-label': ariaLabel, orientation = 'horizontal', className, children }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []);

  // Keep exactly one item tabbable: the last focused one, else the first.
  useLayoutEffect(() => {
    const all = items();
    const current = all.find((item) => item.tabIndex === 0) ?? all[0];
    all.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
    });
  });

  // Focus by click or programmatically also moves the Tab stop.
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const all = items();
    if (!all.includes(event.target as HTMLElement)) return;
    all.forEach((item) => {
      item.tabIndex = item === event.target ? 0 : -1;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    const [prev, next] = orientation === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    const target =
      event.key === next ? (index + 1) % all.length
      : event.key === prev ? (index - 1 + all.length) % all.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? all.length - 1
      : -1;
    if (target === -1) return;
    event.preventDefault();
    all[target].focus();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1', orientation === 'vertical' && 'flex-col', className)}
    >
      {children}
    </div>
  );
}
