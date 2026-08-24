import type { ComponentType } from 'react';
import { ChevronDown, Inbox } from 'lucide-react';
import { getArtifactSpec } from '@shared/spec';
import { ArtifactType, Domain, TodoPriority } from '../../types/artifacts';
import { getTypeIcon } from '../../utils/typeIcons';
import { CAPTURE_TYPE_OPTIONS } from '../layout/quickCaptureUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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

function typeDirGarnish(type: ArtifactType): string | undefined {
  const storage = getArtifactSpec(type).storageRule;
  const dir = storage.fixedDir ?? storage.typeDir;
  return dir ? `${dir}/` : undefined;
}

const UNFILED_VALUE = ArtifactType.INBOX;

/**
 * Destination chip. With `allowUnfiled`, Unfiled leads the menu and is the
 * default; without it (Refine), only real types are offered.
 */
export function TypeFilingSelect({
  value,
  onChange,
  allowUnfiled = false,
}: {
  value: ArtifactType;
  onChange: (type: ArtifactType) => void;
  allowUnfiled?: boolean;
}) {
  const typeOptions = CAPTURE_TYPE_OPTIONS.map((type) => ({
    value: type,
    label: type,
    icon: getTypeIcon(type),
    garnish: typeDirGarnish(type),
  }));
  const isUnfiled = value === UNFILED_VALUE;
  const ChipIcon = isUnfiled ? Inbox : getTypeIcon(value);

  if (!allowUnfiled) {
    return (
      <FilingSelect
        ariaLabel="Artifact type"
        value={value}
        options={typeOptions}
        onChange={onChange}
        filled
        icon={ChipIcon}
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`chronicle-filing-chip ${FOCUS_RING}`}
          data-filled={!isUnfiled || undefined}
          aria-label="Capture destination"
        >
          <ChipIcon className="chronicle-filing-chip-icon" />
          <span className="capitalize">{isUnfiled ? 'Unfiled' : value}</span>
          <ChevronDown className="chronicle-filing-chip-chevron" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[190px]">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ArtifactType)}
        >
          <DropdownMenuRadioItem value={UNFILED_VALUE}>
            <Inbox className="h-3 w-3 text-muted-foreground" />
            <span>Unfiled</span>
            <DropdownMenuShortcut>inbox/</DropdownMenuShortcut>
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {typeOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <OptionIcon className="h-3 w-3 text-muted-foreground" />
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

export function DomainFilingSelect({
  type,
  value,
  onChange,
}: {
  type: ArtifactType;
  value: Domain;
  onChange: (domain: Domain) => void;
}) {
  const allowed = getArtifactSpec(type).allowedDomains as Domain[];
  const options = allowed.map((domain) => ({ value: domain, label: domain }));
  return (
    <FilingSelect ariaLabel="Domain" value={value} options={options} onChange={onChange} filled />
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
