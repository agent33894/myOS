import type { ReactNode } from 'react';
import { HelpCircle, Info, Search } from 'lucide-react';
import type { ViewKind } from '@shared/query';
import { Icon, IconButton, Input, Popover, PopoverContent, PopoverTrigger, SegmentedControl, Select, SelectItem } from '../../ui';
import { GROUPS, optionOf, SORTS, withOption } from './queryText';

// Geist Mono draws <= as ≤; a view is typed text, so show exactly what was typed.
const NO_LIGATURES = { fontVariantLigatures: 'none' } as const;

const TERMS: Array<{ terms: string[]; meaning: string; tasksOnly?: boolean }> = [
  { terms: ['open', 'done'], meaning: 'Open or done tasks', tasksOnly: true },
  { terms: ['overdue'], meaning: 'Open tasks due before today', tasksOnly: true },
  { terms: ['due<=today', 'due=tomorrow', 'scheduled=today', 'done>=today-7', 'due=none'], meaning: 'Dates, with < <= = >= >', tasksOnly: true },
  { terms: ['#work', '-#someday'], meaning: 'With, or without, a tag' },
  { terms: ['path:projects/', 'file:api'], meaning: 'Files in a folder, or by name' },
  { terms: ['parser', '"rate limit"'], meaning: 'Words in the text' },
  { terms: ['group:file', 'sort:priority', 'limit:20'], meaning: 'Grouping, order, and count' },
];

const EXAMPLES: Record<ViewKind, string[]> = {
  tasks: ['open due<=today+7 #work', 'open -#someday path:projects/ sort:priority', 'done done>=today-7 group:date'],
  notes: ['#meeting sort:modified limit:10', 'path:projects/ group:folder', '"rate limit" -#archive'],
};

function Term({ children, onPick }: { children: string; onPick: (text: string) => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onPick(children)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick(children);
        }
      }}
      style={NO_LIGATURES}
      className="inline-flex h-6 cursor-default items-center rounded-sm bg-sunken px-1.5 font-mono text-xs text-text transition-colors duration-fast hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2"
    >
      {children}
    </span>
  );
}

/** The terms a view understands, with examples. Picking one adds it to the view. */
function QueryHelp({ kind, onAdd, onReplace }: { kind: ViewKind; onAdd: (term: string) => void; onReplace: (query: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton icon={HelpCircle} label="How views work" size="sm" />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-96 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">One line, any order</h2>
          <p className="text-sm text-text-secondary">Every term must match. Put - in front of a term to leave those out. Dates can be today, tomorrow, yesterday, today+7, or 2026-10-01.</p>
        </div>
        <dl className="flex flex-col gap-2">
          {TERMS.filter((row) => kind === 'tasks' || !row.tasksOnly).map((row) => (
            <div key={row.meaning} className="flex flex-col gap-1">
              <dt className="text-sm text-text-secondary">{row.meaning}</dt>
              <dd className="flex flex-wrap gap-1">
                {row.terms.map((term) => (
                  <Term key={term} onPick={onAdd}>
                    {term}
                  </Term>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <h3 className="text-sm text-text-secondary">Try</h3>
          <div className="flex flex-col items-start gap-1">
            {EXAMPLES[kind].map((example) => (
              <Term key={example} onPick={onReplace}>
                {example}
              </Term>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface QueryBarProps {
  kind: ViewKind;
  value: string;
  onChange: (query: string) => void;
  /** Terms the view could not use, from `ViewResult.errors`. */
  errors: readonly string[];
  /** Shown at the end of the controls line, e.g. the result count. */
  summary?: ReactNode;
  /** Enter in the box (for saving a view's text). */
  onCommit?: () => void;
  autoFocus?: boolean;
}

/** The view text, its help, and grouping and sort controls that edit the same text. */
export function QueryBar({ kind, value, onChange, errors, summary, onCommit, autoFocus }: QueryBarProps) {
  const group = optionOf(value, 'group') ?? 'none';
  const sort = optionOf(value, 'sort') ?? (kind === 'tasks' ? 'due' : 'file');
  const add = (term: string) => onChange(`${value.trim()}${value.trim() ? ' ' : ''}${term}`);

  return (
    <div className="flex flex-col gap-3 px-2">
      <div className="flex items-center gap-1">
        <Input
          icon={Search}
          autoFocus={autoFocus}
          aria-label={kind === 'tasks' ? 'Filter tasks' : 'Filter notes'}
          placeholder={kind === 'tasks' ? 'open due<=today #work' : '#meeting sort:modified'}
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) onCommit?.();
            if (event.key === 'ArrowDown') {
              const first = event.currentTarget.closest('[data-task-scope]')?.querySelector<HTMLElement>('[data-task-row], [data-note-row]');
              if (first) {
                event.preventDefault();
                first.focus();
              }
            }
          }}
          style={NO_LIGATURES}
          className="flex-1 font-mono"
        />
        <QueryHelp kind={kind} onAdd={add} onReplace={onChange} />
      </div>
      {errors.length ? (
        <div role="status" className="flex items-start gap-2 text-sm text-text-secondary">
          <Icon icon={Info} size="sm" className="mt-0.5 shrink-0 text-accent-text" />
          <span>
            {errors.length === 1 ? 'One term was left out: ' : 'Some terms were left out: '}
            {errors.join(' ')}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="Group by"
          size="sm"
          options={GROUPS[kind]}
          value={group}
          onValueChange={(next) => onChange(withOption(value, 'group', next === 'none' ? null : next))}
        />
        <Select
          aria-label="Sort by"
          size="sm"
          value={sort}
          onValueChange={(next) => onChange(withOption(value, 'sort', next === (kind === 'tasks' ? 'due' : 'file') ? null : next))}
          className="w-36"
        >
          {SORTS[kind].map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
        {summary ? <span className="ml-auto text-sm tabular-nums text-text-tertiary">{summary}</span> : null}
      </div>
    </div>
  );
}
