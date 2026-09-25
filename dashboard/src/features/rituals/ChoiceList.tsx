import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, Icon, Kbd, Menu, MenuContent, MenuItem, MenuTrigger, SegmentedControl } from '../../ui';

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** One letter that picks this choice for the focused row. */
  key: string;
}

export interface ChoiceRow {
  id: string;
  title: string;
  /** Quiet context under the title (project, date). */
  meta?: ReactNode;
  leading?: ReactNode;
}

interface ChoiceListProps<T extends string> {
  label: string;
  rows: readonly ChoiceRow[];
  choices: readonly Choice<T>[];
  value: Record<string, T>;
  fallback: T;
  onChange: (id: string, choice: T) => void;
}

/**
 * Rows that each take one of a few choices, for re-planning in the rituals.
 * Tab moves between rows, arrows change a row's choice, and a choice's letter
 * picks it for the row in focus.
 */
export function ChoiceList<T extends string>({ label, rows, choices, value, fallback, onChange }: ChoiceListProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-choice-row]')?.dataset.choiceRow;
    const choice = choices.find((option) => option.key === event.key.toLowerCase());
    if (!row || !choice) return;
    event.preventDefault();
    onChange(row, choice.value);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
          {choices.map((choice) => (
            <span key={choice.value} className="flex items-center gap-1">
              <Kbd shortcut={choice.key} /> {choice.label}
            </span>
          ))}
        </span>
        {rows.length > 1 ? (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto">
                Set all
                <Icon icon={ChevronDown} size="sm" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              {choices.map((choice) => (
                <MenuItem key={choice.value} onSelect={() => rows.forEach((row) => onChange(row.id, choice.value))}>
                  {choice.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        ) : null}
      </div>
      <div role="list" aria-label={label} className="flex flex-col gap-1" onKeyDown={onKeyDown}>
        {rows.map((row) => (
          <div
            role="listitem"
            key={row.id}
            data-choice-row={row.id}
            className="flex items-center gap-3 rounded-md bg-raised px-3 py-2 shadow-raised"
          >
            {row.leading ? <span className="flex shrink-0 items-center">{row.leading}</span> : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base text-text">{row.title}</span>
              {row.meta ? <span className="truncate text-sm text-text-tertiary">{row.meta}</span> : null}
            </span>
            <SegmentedControl
              size="sm"
              aria-label={`${row.title}: when`}
              options={choices}
              value={value[row.id] ?? fallback}
              onValueChange={(choice) => onChange(row.id, choice)}
              className="shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
