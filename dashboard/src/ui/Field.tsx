import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from './cn';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface ControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}

/**
 * Wires a control to its enclosing Field: id (for the label), hint/error
 * description, and invalid state. Explicit props win.
 */
export function useFieldControl<P extends ControlProps>(props: P): P {
  const field = useContext(FieldContext);
  if (!field) return props;
  const describedBy = [field.describedBy, props['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  };
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Replaces the hint and marks the control invalid. */
  error?: ReactNode;
  className?: string;
  /** One Input, Textarea, or Select. */
  children: ReactNode;
}

/** A labelled form control with an optional hint or error message. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <FieldContext.Provider value={{ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) }}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        {children}
        {message ? (
          <p id={messageId} className={cn('text-sm', error ? 'text-danger' : 'text-text-secondary')}>
            {message}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
