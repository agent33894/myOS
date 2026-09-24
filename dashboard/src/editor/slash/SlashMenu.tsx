import { useEffect, useId, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { cn, Icon, Popover, PopoverAnchor, PopoverContent } from '../../ui';
import type { SlashItem } from './items';
import { useSlashMenu } from './useSlashMenu';

const GROUPS = [
  { id: 'basic', label: 'Basic blocks' },
  { id: 'more', label: 'More blocks' },
] as const;

interface SlashMenuProps {
  editor: Editor;
  keyHandler: { current: ((event: KeyboardEvent) => boolean) | null };
  onAttachFile: () => void;
}

/**
 * The "/" insert menu: a listbox anchored at the caret. Focus stays in the
 * editor; the editor points at the highlighted option with
 * aria-activedescendant, and arrows, Enter, and Escape drive it.
 */
export function SlashMenu({ editor, keyHandler, onAttachFile }: SlashMenuProps) {
  const menu = useSlashMenu(editor, keyHandler, { attachFile: onAttachFile });
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const optionId = (item: SlashItem) => `${id}-${item.id}`;
  const active = menu.items[menu.activeIndex];
  const anchor = useMemo(() => ({ current: { getBoundingClientRect: menu.anchorRect } }), [menu.anchorRect]);

  useEffect(() => {
    const dom = editor.view.dom;
    const attributes: Record<string, string | null> = {
      'aria-controls': menu.open ? `${id}-list` : null,
      'aria-expanded': menu.open ? 'true' : null,
      'aria-activedescendant': menu.open && active ? optionId(active) : null,
    };
    for (const [name, value] of Object.entries(attributes)) {
      if (value === null) dom.removeAttribute(name);
      else dom.setAttribute(name, value);
    }
  });

  useEffect(() => {
    if (active) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <Popover open={menu.open} onOpenChange={(open) => !open && menu.close()}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-72 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // Keep the caret in the editor while picking with the mouse.
        onMouseDown={(event) => event.preventDefault()}
      >
        <div ref={listRef} id={`${id}-list`} role="listbox" aria-label="Insert block" className="max-h-80 overflow-y-auto">
          {menu.items.length === 0 ? <div className="px-2 py-3 text-sm text-text-tertiary">No blocks match “{menu.query}”</div> : null}
          {GROUPS.map((group) => {
            const items = menu.items.filter((item) => item.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id} role="group" aria-labelledby={`${id}-${group.id}`} className="pb-1">
                <div id={`${id}-${group.id}`} className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary">
                  {group.label}
                </div>
                {items.map((item) => {
                  const selected = item === active;
                  return (
                    <div
                      key={item.id}
                      id={optionId(item)}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => !selected && menu.setActiveIndex(menu.items.indexOf(item))}
                      onClick={() => menu.select(item)}
                      className={cn('flex h-11 cursor-default items-center gap-3 rounded-md px-2', selected && 'bg-text/5')}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-raised text-text-secondary shadow-raised">
                        <Icon icon={item.icon} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-base text-text">{item.label}</span>
                        <span className="truncate text-xs text-text-tertiary">{item.description}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
