import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { useFieldControl } from './Field';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** An on/off toggle for settings that apply immediately. Needs an accessible name. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, onClick, ...rest },
  ref,
) {
  const props = useFieldControl(rest);
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cn(
        'inline-flex h-5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-base ease-out disabled:pointer-events-none disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-text/15',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-4 rounded-full bg-white shadow-raised transition-transform duration-base ease-spring',
          checked && 'translate-x-3',
        )}
      />
    </button>
  );
});
