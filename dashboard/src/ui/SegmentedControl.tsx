import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { Icon } from './Icon';

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  'aria-label': string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A compact single choice among 2–5 equal-width options, with a sliding thumb.
 * Without a width it sizes every option to the longest label, so none truncates.
 * Keyboard: arrow keys move and select (radio group semantics).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : undefined;
    if (step === undefined && target === undefined) return;
    event.preventDefault();
    const next = target ?? (selectedIndex + step! + options.length) % options.length;
    onValueChange(options[next].value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'relative grid auto-cols-fr grid-flow-col rounded-md bg-text/5 p-0.5',
        size === 'sm' ? 'h-7 text-sm' : 'h-8 text-base',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-sm bg-raised shadow-raised transition-transform duration-base ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative inline-flex min-w-0 items-center justify-center gap-1.5 rounded-sm px-3 font-medium transition-colors duration-fast ease-out',
              selected ? 'text-text' : 'text-text-secondary hover:text-text',
            )}
          >
            {option.icon ? <Icon icon={option.icon} size={size === 'sm' ? 'sm' : 'md'} /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
