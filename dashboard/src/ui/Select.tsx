import { forwardRef, type ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { useFieldControl } from './Field';
import { Icon } from './Icon';
import { floatingSurface, menuItem } from './styles';

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  size?: 'sm' | 'md';
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Styles the trigger. */
  className?: string;
  /** `SelectItem`s. */
  children: ReactNode;
}

/** A single-choice dropdown. Inside a `Field`, it is labelled automatically. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, defaultValue, onValueChange, placeholder, disabled, name, size = 'md', className, children, ...rest },
  ref,
) {
  const control = useFieldControl(rest);
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        ref={ref}
        {...control}
        className={cn(
          'inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-raised text-text transition-colors duration-fast ease-out hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger data-[placeholder]:text-text-tertiary',
          size === 'sm' ? 'h-7 px-2 text-sm' : 'h-8 px-3 text-base',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="text-text-tertiary">
          <Icon icon={ChevronDown} size="sm" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            floatingSurface,
            'max-h-80 min-w-trigger overflow-hidden',
          )}
        >
          <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

interface SelectItemProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

export function SelectItem({ value, disabled, children }: SelectItemProps) {
  return (
    <SelectPrimitive.Item value={value} disabled={disabled} className={cn(menuItem, 'pr-8')}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 text-accent-text">
        <Icon icon={Check} size="sm" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
