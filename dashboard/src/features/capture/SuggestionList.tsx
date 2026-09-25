import { useId, useMemo, type ReactNode } from 'react';
import { Hash } from 'lucide-react';
import { Icon, ListRow, Popover, PopoverAnchor, PopoverContent } from '../../ui';
import { ProjectDot } from '../tasks/ProjectDot';
import { caretRect } from './caret';
import type { SuggestionOption } from './useSuggestions';

interface SuggestionListProps {
  open: boolean;
  options: SuggestionOption[];
  active: number;
  trigger: '@' | '#';
  onHover: (index: number) => void;
  onChoose: (option: SuggestionOption) => void;
  onClose: () => void;
  /** The field being completed, and where the `@` or `#` sits in it; the list opens under it. */
  field: HTMLInputElement | HTMLTextAreaElement | null;
  start: number;
  /** The field the list completes. */
  children: ReactNode;
}

/** Projects or tags under a capture field. Focus stays in the field; the field's keys drive the list. */
export function SuggestionList({ open, options, active, trigger, onHover, onChoose, onClose, field, start, children }: SuggestionListProps) {
  const id = useId();
  const caret = useMemo(
    () => ({ current: { getBoundingClientRect: () => (field ? caretRect(field, start) : new DOMRect()) } }),
    [field, start],
  );
  return (
    <Popover open={open} onOpenChange={(next) => !next && onClose()}>
      <PopoverAnchor virtualRef={caret} />
      <div className="min-w-0 flex-1" data-suggest-anchor={id}>
        {children}
      </div>
      <PopoverContent
        align="start"
        alignOffset={-12}
        className="w-72 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if ((event.target as HTMLElement | null)?.closest(`[data-suggest-anchor="${id}"]`)) event.preventDefault();
        }}
      >
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-text-tertiary">{trigger === '@' ? 'Projects' : 'Tags'}</p>
        <div role="listbox" aria-label={trigger === '@' ? 'Projects' : 'Tags'} className="flex flex-col">
          {options.map((option, index) => (
            <ListRow
              key={option.key}
              role="option"
              selected={index === active}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onActivate={() => onChoose(option)}
              leading={option.color ? <ProjectDot color={option.color} /> : <Icon icon={Hash} size="sm" className="text-text-tertiary" />}
              className="min-h-8 px-2"
            >
              {trigger === '#' ? option.label.slice(1) : option.label}
            </ListRow>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
