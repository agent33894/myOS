import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { useFieldControl } from './Field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'ghost';
  /** Grow with the content instead of scrolling. Bound it with `max-h-*` if needed. */
  autosize?: boolean;
}

/** A multi-line text field. Inside a `Field`, it is labelled automatically. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variant = 'default', autosize = false, rows = autosize ? 1 : 3, className, ...rest },
  ref,
) {
  const props = useFieldControl(rest);
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full min-w-0 resize-none text-base text-text transition-colors duration-fast ease-out placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'default'
          ? 'rounded-md border border-border bg-raised px-3 py-2 hover:border-border-strong focus-visible:border-accent aria-[invalid=true]:border-danger'
          : 'rounded-sm bg-transparent px-1 hover:bg-text/5 focus-visible:bg-text/5 focus-visible:outline-none',
        autosize && 'field-sizing-content',
        className,
      )}
      {...props}
    />
  );
});
