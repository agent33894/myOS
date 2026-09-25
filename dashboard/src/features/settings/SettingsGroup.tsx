import { useId, type ReactNode } from 'react';
import { cn } from '../../ui';

interface SettingsGroupProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** A titled card of settings rows. */
export function SettingsGroup({ title, description, children }: SettingsGroupProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-1">
        <h2 id={id} className="text-sm font-medium text-text-secondary">
          {title}
        </h2>
        {description ? <p className="text-sm text-text-tertiary">{description}</p> : null}
      </div>
      <div className="flex flex-col divide-y divide-border rounded-lg bg-sunken">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: ReactNode;
  description?: ReactNode;
  /** The control. As a function it receives an `id`, and the label points at it. */
  control?: ReactNode | ((id: string) => ReactNode);
  /** Content below the label line (previews, lists). */
  children?: ReactNode;
  className?: string;
}

/** Label and description on the left, the control on the right. */
export function SettingsRow({ label, description, control, children, className }: SettingsRowProps) {
  const id = useId();
  const labelled = typeof control === 'function';
  const Label = labelled ? 'label' : 'span';
  return (
    <div className={cn('flex flex-col gap-4 px-4 py-4', className)}>
      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Label htmlFor={labelled ? id : undefined} className="text-base font-medium text-text">
            {label}
          </Label>
          {description ? <div className="text-sm text-text-secondary">{description}</div> : null}
        </div>
        {control ? (
          <div className="flex shrink-0 items-center gap-2">{labelled ? control(id) : control}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
