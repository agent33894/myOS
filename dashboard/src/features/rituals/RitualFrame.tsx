import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, DialogContent, DialogDescription, DialogTitle, Icon, Kbd, cn } from '../../ui';

interface RitualFrameProps {
  /** "Close the day", "Weekly review". */
  name: string;
  /** Steps before the ending; the ending itself has no step marker. */
  steps: number;
  /** Zero-based; `steps` or more is the ending. */
  step: number;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Primary action (Continue); also Enter anywhere outside a control. */
  onContinue: () => void;
  continueLabel?: string;
  /** Leave the step untouched and move on. */
  onSkip?: () => void;
  busy?: boolean;
  /** Extra actions at the start of the footer. */
  secondary?: ReactNode;
  /** The ending: centered, with `glyph` above the title. */
  finale?: boolean;
  glyph?: LucideIcon;
}

const ACTS_ON_ENTER = new Set(['BUTTON', 'A']);
/** What takes focus when a step opens: its first field or choice, else Continue. */
const FIRST_CONTROL = 'input, textarea, [role="radio"][tabindex="0"]';

/**
 * The shared shape of a ritual: a quiet name and step marker, one question,
 * its content, and Skip / Continue. Enter continues, Escape closes, and every
 * step can be skipped.
 */
export function RitualFrame({
  name,
  steps,
  step,
  title,
  description,
  children,
  onContinue,
  continueLabel = 'Continue',
  onSkip,
  busy = false,
  secondary,
  finale = false,
  glyph,
}: RitualFrameProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const focusFirst = () => {
    const first = bodyRef.current?.querySelector<HTMLElement>(FIRST_CONTROL);
    (first ?? continueRef.current)?.focus();
  };
  // A new step takes focus; on open, the dialog asks (its content mounts a moment later).
  useEffect(focusFirst, [step]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented || event.shiftKey || busy) return;
    const target = event.target as HTMLElement;
    const mod = event.metaKey || event.ctrlKey;
    if (!mod && (ACTS_ON_ENTER.has(target.tagName) || target.getAttribute('role') === 'radio')) return;
    event.preventDefault();
    onContinue();
  };

  return (
    <DialogContent
      size="lg"
      className="max-h-full max-w-3xl gap-0 overflow-hidden p-0"
      onKeyDown={onKeyDown}
      // Each step places focus itself (its first field or choice, else Continue).
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        focusFirst();
      }}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-8 pt-2">
        <span className="text-sm font-medium text-text-secondary">{name}</span>
        {finale ? null : (
          <span className="flex items-center gap-1" aria-label={`Step ${Math.min(step, steps - 1) + 1} of ${steps}`} role="img">
            {Array.from({ length: steps }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 rounded-full transition-all duration-slow ease-out',
                  index === step ? 'w-6 bg-accent' : index < step ? 'w-3 bg-accent-soft' : 'w-3 bg-text/10',
                )}
              />
            ))}
          </span>
        )}
      </div>

      <div key={step} ref={bodyRef} className={cn('flex min-h-0 flex-1 flex-col animate-slide-up', finale && 'items-center text-center')}>
        <div className={cn('flex flex-col gap-1 px-8 pt-4', finale && 'items-center pt-6')}>
          {finale && glyph ? (
            <span className="mb-5 grid size-16 place-items-center rounded-full bg-accent-soft text-accent-text animate-check-pop">
              <Icon icon={glyph} size="lg" />
            </span>
          ) : null}
          <DialogTitle className={cn('text-xl font-semibold text-text', finale && 'text-2xl')}>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="max-w-xl text-md text-text-secondary">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{name}</DialogDescription>
          )}
        </div>
        <div className={cn('min-h-48 flex-1 overflow-y-auto px-8 pb-6 pt-6', finale && 'w-full')}>{children}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2 bg-sunken px-8 py-4">
        {secondary ?? (
          <span className="hidden items-center gap-1.5 text-xs text-text-tertiary sm:flex">
            <Kbd shortcut="enter" /> to continue · <Kbd shortcut="escape" /> to stop here
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onSkip ? (
            <Button variant="ghost" onClick={onSkip} disabled={busy}>
              Skip
            </Button>
          ) : null}
          <Button ref={continueRef} variant="primary" onClick={onContinue} loading={busy}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
