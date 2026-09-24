// Class recipes shared by the floating primitives (Menu, Select, Popover, DatePicker).

/** Menus, popovers, and select lists: one surface, one entrance. */
export const floatingSurface =
  'z-popover rounded-lg bg-overlay p-1 text-base text-text shadow-overlay data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out';

/** A row inside a menu or select list. */
export const menuItem =
  'relative flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-base text-text outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-text/5 data-[disabled]:opacity-50';
