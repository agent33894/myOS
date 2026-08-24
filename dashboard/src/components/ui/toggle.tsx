import { cn } from '../../lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ enabled, onChange, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        !enabled && 'bg-[var(--rule-strong)]',
        enabled && 'accent-bg',
        disabled && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full border border-[var(--rule-standard)] bg-card transition duration-200 ease-in-out',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
