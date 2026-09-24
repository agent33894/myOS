import { forwardRef, useState, type ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';

interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `circle` is the task checkbox; `square` is for settings lists. */
  shape?: 'circle' | 'square';
}

/**
 * A checkbox. The circle form completes tasks: checking it fills with the
 * accent and springs the check in. Needs an accessible name (`aria-label`
 * or `aria-labelledby`).
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, onCheckedChange, shape = 'circle', className, onClick, ...props },
  ref,
) {
  // Only animate a check the user just made, not rows that load already done.
  const [justChecked, setJustChecked] = useState(false);

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        setJustChecked(!checked);
        onCheckedChange(!checked);
      }}
      className={cn(
        'group inline-grid size-6 shrink-0 place-items-center disabled:pointer-events-none disabled:opacity-50',
        shape === 'circle' ? 'rounded-full' : 'rounded-sm',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'grid place-items-center border-1.5 transition-colors duration-fast ease-out',
          shape === 'circle' ? 'size-4.5 rounded-full' : 'size-4 rounded-sm',
          checked
            ? 'border-accent bg-accent text-accent-on'
            : 'border-text-tertiary text-transparent group-hover:border-accent',
          checked && justChecked && 'animate-check-pop',
        )}
      >
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </span>
    </button>
  );
});
