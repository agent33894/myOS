import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from './cn';
import { Icon } from './Icon';
import { formatShortcut } from './Kbd';
import { floatingSurface, menuItem } from './styles';

/*
 * One set of item components for both dropdown and context menus. The content
 * component records which Radix primitive family is active, and every item
 * renders from that family.
 */
type Primitives = typeof DropdownMenuPrimitive | typeof ContextMenuPrimitive;
const PrimitivesContext = createContext<Primitives>(DropdownMenuPrimitive);

// Dropdown menu

export const Menu = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;

type MenuContentProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { className, sideOffset = 4, collisionPadding = 8, ...props },
  ref,
) {
  return (
    <DropdownMenuPrimitive.Portal>
      <PrimitivesContext.Provider value={DropdownMenuPrimitive}>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(floatingSurface, 'min-w-48', className)}
          {...props}
        />
      </PrimitivesContext.Provider>
    </DropdownMenuPrimitive.Portal>
  );
});

// Context menu

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

type ContextMenuContentProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>;

export const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(function ContextMenuContent(
  { className, collisionPadding = 8, ...props },
  ref,
) {
  return (
    <ContextMenuPrimitive.Portal>
      <PrimitivesContext.Provider value={ContextMenuPrimitive}>
        <ContextMenuPrimitive.Content
          ref={ref}
          collisionPadding={collisionPadding}
          className={cn(floatingSurface, 'min-w-48', className)}
          {...props}
        />
      </PrimitivesContext.Provider>
    </ContextMenuPrimitive.Portal>
  );
});

// Shared items

interface ItemDecoration {
  icon?: LucideIcon;
  /** Shortcut hint in `mod+k` form. The menu does not bind it. */
  shortcut?: string;
}

function Trailing({ shortcut }: { shortcut?: string }) {
  if (!shortcut) return null;
  return <span className="ml-auto pl-4 font-mono text-xs text-text-tertiary">{formatShortcut(shortcut)}</span>;
}

interface MenuItemProps extends ItemDecoration {
  onSelect?: (event: Event) => void;
  disabled?: boolean;
  /** Destructive action: shown in the danger color. */
  danger?: boolean;
  className?: string;
  children: ReactNode;
}

export function MenuItem({ icon, shortcut, danger = false, className, children, ...props }: MenuItemProps) {
  const { Item } = useContext(PrimitivesContext);
  return (
    <Item className={cn(menuItem, danger && 'text-danger data-[highlighted]:bg-danger-soft', className)} {...props}>
      {icon ? <Icon icon={icon} className={danger ? undefined : 'text-text-secondary'} /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <Trailing shortcut={shortcut} />
    </Item>
  );
}

interface MenuCheckboxItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  shortcut?: string;
  children: ReactNode;
}

/** A toggle row; the check sits in the leading slot. */
export function MenuCheckboxItem({ shortcut, children, ...props }: MenuCheckboxItemProps) {
  const { CheckboxItem, ItemIndicator } = useContext(PrimitivesContext);
  return (
    <CheckboxItem className={cn(menuItem, 'pl-8')} {...props}>
      <ItemIndicator className="absolute left-2 inline-flex text-accent-text">
        <Icon icon={Check} />
      </ItemIndicator>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <Trailing shortcut={shortcut} />
    </CheckboxItem>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  const { Label } = useContext(PrimitivesContext);
  return <Label className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary">{children}</Label>;
}

export function MenuSeparator() {
  const { Separator } = useContext(PrimitivesContext);
  return <Separator className="mx-2 my-1 h-px bg-border" />;
}

interface MenuSubProps {
  label: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  /** The submenu's items. */
  children: ReactNode;
}

/** A nested menu opened from a row. */
export function MenuSub({ label, icon, disabled, children }: MenuSubProps) {
  const { Sub, SubTrigger, SubContent, Portal } = useContext(PrimitivesContext);
  return (
    <Sub>
      <SubTrigger disabled={disabled} className={cn(menuItem, 'data-[state=open]:bg-text/5')}>
        {icon ? <Icon icon={icon} className="text-text-secondary" /> : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Icon icon={ChevronRight} size="sm" className="ml-auto text-text-tertiary" />
      </SubTrigger>
      <Portal>
        <SubContent sideOffset={4} collisionPadding={8} className={cn(floatingSurface, 'min-w-48')}>
          {children}
        </SubContent>
      </Portal>
    </Sub>
  );
}
