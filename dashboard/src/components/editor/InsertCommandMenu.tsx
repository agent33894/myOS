import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InsertCommandOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
}

interface InsertCommandMenuProps {
  isOpen: boolean;
  top: number;
  left: number;
  query: string;
  options: InsertCommandOption[];
  selectedIndex: number;
  onSelect: (option: InsertCommandOption) => void;
  onHighlight: (index: number) => void;
  onQueryChange: (query: string) => void;
  onQueryKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}

export default function InsertCommandMenu({
  isOpen,
  top,
  left,
  query,
  options,
  selectedIndex,
  onSelect,
  onHighlight,
  onQueryChange,
  onQueryKeyDown,
}: InsertCommandMenuProps) {
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isOpen || options.length === 0) {
      return;
    }

    const container = optionsContainerRef.current;
    const activeOption = optionRefs.current[selectedIndex];
    if (!container || !activeOption) {
      return;
    }

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const containerRect = container.getBoundingClientRect();
    const optionRect = activeOption.getBoundingClientRect();
    const optionTop = optionRect.top - containerRect.top + container.scrollTop;
    const optionBottom = optionTop + optionRect.height;

    if (optionTop < containerTop) {
      container.scrollTop = optionTop;
      return;
    }

    if (optionBottom > containerBottom) {
      container.scrollTop = optionBottom - container.clientHeight;
    }
  }, [isOpen, options, selectedIndex]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-[230] w-[340px] border border-border bg-card shadow-chronicle-overlay"
      style={{ top, left }}
      role="listbox"
      aria-label="Insert blocks menu"
      data-insert-command-menu="true"
    >
      <div className="border-b border-border/70 px-3 py-2 text-2xs uppercase tracking-[0.08em] text-muted-foreground">
        Insert block
      </div>
      <div className="border-b border-border/60 px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onQueryKeyDown}
          placeholder="Search blocks..."
          aria-label="Search insert blocks"
          className="h-8 w-full border border-border/70 bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
        />
      </div>
      <div ref={optionsContainerRef} className="max-h-[280px] overflow-y-auto">
        {options.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No blocks match your slash query.
          </div>
        ) : (
          options.map((option, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={option.id}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(option)}
                onMouseEnter={() => onHighlight(index)}
                className={cn(
                  'w-full border-b border-border/60 px-3 py-3 text-left last:border-b-0 transition-colors',
                  active ? 'bg-secondary text-foreground' : 'hover:bg-secondary/50 text-muted-foreground'
                )}
              >
                <div className="flex items-start gap-3">
                  <option.icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
                  <div>
                    <div className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-foreground/90')}>
                      {option.label}
                    </div>
                    <p className="mt-0.5 text-xs">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
