import type { ComponentType } from 'react';
import { ChevronDown } from 'lucide-react';
import { ARTIFACT_TYPES } from '@shared/spec';
import { ArtifactType, TodoPriority } from '@shared/types';
import { getTypeIcon } from '../../utils/typeIcons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/** Types an Inbox capture can become. */
const FILING_TYPES = [ArtifactType.TODO, ArtifactType.MEMO, ArtifactType.PROJECT];

interface FilingOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Mono garnish shown right-aligned in the menu — a machine fact, e.g. the vault dir. */
  garnish?: string;
}

interface FilingSelectProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: FilingOption<T>[];
  onChange: (value: T) => void;
  /** Marks the chip as carrying a non-default choice (rendered in full ink). */
  filled?: boolean;
  icon?: ComponentType<{ className?: string }>;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function FilingSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  filled,
  icon: Icon,
}: FilingSelectProps<T>) {
  const current = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`chronicle-filing-chip ${FOCUS_RING}`}
          data-filled={filled || undefined}
          aria-label={ariaLabel}
        >
          {Icon ? <Icon className="chronicle-filing-chip-icon" /> : null}
          <span className="capitalize">{current?.label ?? value}</span>
          <ChevronDown className="chronicle-filing-chip-chevron" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[190px]">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {OptionIcon ? <OptionIcon className="h-3 w-3 text-muted-foreground" /> : null}
                <span className="capitalize">{option.label}</span>
                {option.garnish ? <DropdownMenuShortcut>{option.garnish}</DropdownMenuShortcut> : null}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Destination chip for filing an Inbox capture. */
export function TypeFilingSelect({ value, onChange }: { value: ArtifactType; onChange: (type: ArtifactType) => void }) {
  const options = FILING_TYPES.map((type) => ({
    value: type,
    label: type,
    icon: getTypeIcon(type),
    garnish: `${ARTIFACT_TYPES[type].dir}/`,
  }));
  return (
    <FilingSelect
      ariaLabel="Artifact type"
      value={value}
      options={options}
      onChange={onChange}
      filled
      icon={getTypeIcon(value)}
    />
  );
}

export function PriorityFilingSelect({
  value,
  onChange,
}: {
  value: TodoPriority;
  onChange: (priority: TodoPriority) => void;
}) {
  const options = Object.values(TodoPriority).map((priority) => ({
    value: priority,
    label: `${priority} priority`,
  }));
  return (
    <FilingSelect
      ariaLabel="Priority"
      value={value}
      options={options}
      onChange={onChange}
      filled={value !== TodoPriority.MEDIUM}
    />
  );
}
