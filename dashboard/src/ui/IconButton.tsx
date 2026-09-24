import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'leadingIcon' | 'children' | 'aria-label'> {
  icon: LucideIcon;
  /** Accessible name, also shown as the tooltip. */
  label: string;
  /** Shortcut shown in the tooltip, in `mod+k` form. */
  shortcut?: string;
}

/** A square icon-only button with a required label and tooltip. Ghost by default. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, shortcut, variant = 'ghost', size, ...props },
  ref,
) {
  return (
    <Tooltip content={label} shortcut={shortcut}>
      <Button ref={ref} icon variant={variant} size={size} aria-label={label} {...props}>
        {props.loading ? null : <Icon icon={icon} size={size === 'sm' ? 'sm' : 'md'} />}
      </Button>
    </Tooltip>
  );
});
