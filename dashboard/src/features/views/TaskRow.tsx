import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, CalendarDays, CheckCheck, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, MoreHorizontal, Hourglass, PanelRight, PlaneTakeoff, Repeat, Tag, type LucideIcon } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import type { Priority, Task, TaskDateField } from '@shared/tasks';
import { useNotes } from '../../data/selectors';
import { hasPrimaryModifier } from '../../lib/platform';
import {
  Checkbox,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  DatePicker,
  Icon,
  IconButton,
  Input,
  ListRow,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '../../ui';
import { addTag, dayLabel, openTask, quickDates, setDate, toggle } from './taskActions';

/*
 * One task, the same everywhere (Today, Tasks, views, and view blocks in
 * notes). Keys on a focused row: j/k or arrows move, x or space checks,
 * Enter opens (⌘Enter to the side), d sets the due date, s the scheduled
 * date, t adds a tag. Right-click has the same actions.
 */

type Picker = 'due' | 'scheduled' | 'tag' | null;

const ROW = '[data-task-row]';
const SCOPE = '[data-task-scope]';

const rowsNear = (element: Element) => [...(element.closest(SCOPE) ?? document).querySelectorAll<HTMLElement>(ROW)];

function focusRow(element: HTMLElement, step: number) {
  const rows = rowsNear(element);
  rows[rows.indexOf(element) + step]?.focus();
}

/** After a change that may remove the row (checked off Today), keep focus at the same place. */
function keepFocus(element: HTMLElement) {
  const scope = element.closest(SCOPE);
  const index = rowsNear(element).indexOf(element);
  window.setTimeout(() => {
    if (element.isConnected || !scope?.isConnected) return;
    const rows = [...scope.querySelectorAll<HTMLElement>(ROW)];
    rows[Math.min(index, rows.length - 1)]?.focus();
  }, 150);
}

const PRIORITY: Record<Priority, { icon: LucideIcon; label: string; className: string }> = {
  highest: { icon: ChevronsUp, label: 'Highest priority', className: 'text-warning' },
  high: { icon: ChevronUp, label: 'High priority', className: 'text-warning' },
  medium: { icon: ChevronUp, label: 'Medium priority', className: 'text-text-tertiary' },
  low: { icon: ChevronDown, label: 'Low priority', className: 'text-text-tertiary' },
  lowest: { icon: ChevronsDown, label: 'Lowest priority', className: 'text-text-tertiary' },
};

const TAG = /(^|\s)(#[^\s#]*[^\s#\d][^\s#]*)/gu;

/** The description with each #tag as a quiet chip. */
/** Links and emphasis as they read: `[[Note|label]]` → label, `[x](url)` → x, `**b**` → b. */
const readable = (text: string) =>
  text
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/!?\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|~~|\*)(?=\S)(.+?)(?<=\S)\1/g, '$2');

/** A task's words with `#tags` as pills and `code` in mono; everything else as it reads. */
function TaskText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  // Code spans first, so a `#` or `*` inside code stays as written.
  text.split(/(`+[^`]+?`+)/).forEach((segment, index) => {
    const code = /^(`+)([^`]+?)\1$/.exec(segment);
    if (code) {
      parts.push(
        <code key={`c${index}`} className="rounded-sm bg-text/5 px-1 font-mono text-sm">
          {code[2]}
        </code>,
      );
      return;
    }
    const plain = readable(segment);
    let last = 0;
    for (const match of plain.matchAll(TAG)) {
      const start = (match.index ?? 0) + match[1].length;
      if (start > last) parts.push(plain.slice(last, start));
      parts.push(
        <span key={`t${index}-${start}`} className="mx-0.5 inline-flex h-5 items-center rounded-sm bg-accent-soft px-1.5 align-middle text-sm text-accent-text">
          {match[2]}
        </span>,
      );
      last = start + match[2].length;
    }
    if (last < plain.length) parts.push(plain.slice(last));
  });
  return <>{parts}</>;
}

function DateChip({ icon, label, tone = 'quiet', title }: { icon: LucideIcon; label: string; tone?: 'quiet' | 'today' | 'late'; title: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 text-xs font-medium tabular-nums',
        tone === 'late' ? 'bg-warning-soft text-warning' : tone === 'today' ? 'bg-accent-soft text-accent-text' : 'bg-text/5 text-text-secondary',
      )}
    >
      <Icon icon={icon} size="sm" />
      {label}
    </span>
  );
}

/** Due, scheduled, and start dates as soft chips; late and today are tinted, never alarming. */
function TaskDates({ task, today }: { task: Task; today: string }) {
  if (task.status !== 'open') {
    return task.done ? <DateChip icon={CheckCheck} label={dayLabel(task.done, today)} title={`Done ${task.done}`} /> : null;
  }
  const chips: ReactNode[] = [];
  if (task.start && task.start > today) chips.push(<DateChip key="start" icon={PlaneTakeoff} label={dayLabel(task.start, today)} title={`Starts ${task.start}`} />);
  if (task.scheduled) {
    const tone = task.scheduled <= today ? 'today' : 'quiet';
    chips.push(<DateChip key="scheduled" icon={Hourglass} label={dayLabel(task.scheduled, today)} tone={tone} title={`Scheduled ${task.scheduled}`} />);
  }
  if (task.due) {
    const tone = task.due < today ? 'late' : task.due === today ? 'today' : 'quiet';
    chips.push(<DateChip key="due" icon={CalendarDays} label={dayLabel(task.due, today)} tone={tone} title={task.due < today ? `Was due ${task.due}` : `Due ${task.due}`} />);
  }
  return <>{chips}</>;
}

const where = (task: Task, showPath: boolean) => {
  const line = task.line > 0 ? `:${task.line}` : '';
  return showPath ? `${task.path.replace(/\.md$/i, '')}${line}` : line;
};

/** Known tags that start with what's typed, for the tag popover. */
function useTagSuggestions(typed: string, own: readonly string[]): string[] {
  const notes = useNotes();
  return useMemo(() => {
    const wanted = typed.trim().replace(/^#+/, '').toLowerCase();
    const mine = new Set(own.map((tag) => tag.toLowerCase()));
    const counts = new Map<string, number>();
    for (const note of notes) for (const task of note.tasks) for (const tag of task.tags) counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([tag]) => !mine.has(tag) && tag.startsWith(wanted) && tag !== wanted)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [notes, typed, own]);
}

function TagForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [text, setText] = useState('');
  const suggestions = useTagSuggestions(text, task.tags);
  const submit = (tag: string) => {
    onDone();
    void addTag(task, tag);
  };
  return (
    <div className="flex w-64 flex-col gap-2">
      <Input
        autoFocus
        size="sm"
        aria-label="Tag"
        placeholder="release"
        icon={Tag}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && text.trim()) {
            event.preventDefault();
            submit(text);
          }
        }}
      />
      {suggestions.length ? (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((tag) => (
            <MenuLikeChip key={tag} onSelect={() => submit(tag)}>
              {tag}
            </MenuLikeChip>
          ))}
        </div>
      ) : (
        <p className="px-1 text-xs text-text-tertiary">Press Enter to add it to the line.</p>
      )}
    </div>
  );
}

function MenuLikeChip({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className="inline-flex h-6 cursor-default items-center rounded-sm bg-text/5 px-2 text-sm text-text-secondary transition-colors duration-fast hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2"
    >
      #{children}
    </span>
  );
}

/** The date and tag items, shared by the right-click menu and the ⋯ menu. */
function TaskMenuItems({ task, onPick }: { task: Task; onPick: (picker: Picker) => void }) {
  const today = formatLocalDate();
  const dateMenu = (field: TaskDateField, label: string, icon: LucideIcon, key: string) => (
    <MenuSub label={label} icon={icon}>
      {quickDates(today).map((pick) => (
        <MenuItem key={pick.label} onSelect={() => void setDate(task, field, pick.date)}>
          <span className="flex items-center justify-between gap-4">
            {pick.label}
            <span className="text-sm text-text-tertiary">{format(parseLocalDate(pick.date), 'EEE MMM d')}</span>
          </span>
        </MenuItem>
      ))}
      <MenuItem shortcut={key} onSelect={() => onPick(field === 'due' ? 'due' : 'scheduled')}>
        Pick a date…
      </MenuItem>
      {task[field] ? (
        <>
          <MenuSeparator />
          <MenuItem onSelect={() => void setDate(task, field, null)}>Clear</MenuItem>
        </>
      ) : null}
    </MenuSub>
  );
  return (
    <>
      <MenuItem icon={ArrowUpRight} shortcut="enter" onSelect={() => openTask(task)}>
        Open at this line
      </MenuItem>
      <MenuItem icon={PanelRight} shortcut="mod+enter" onSelect={() => openTask(task, { beside: true })}>
        Open to the side
      </MenuItem>
      <MenuSeparator />
      <MenuItem shortcut="x" onSelect={() => void toggle(task)}>
        {task.status === 'open' ? 'Check off' : 'Uncheck'}
      </MenuItem>
      {dateMenu('due', 'Due date', CalendarDays, 'd')}
      {dateMenu('scheduled', 'Scheduled date', Hourglass, 's')}
      <MenuItem icon={Tag} shortcut="t" disabled={task.line === 0} onSelect={() => onPick('tag')}>
        Add a tag…
      </MenuItem>
    </>
  );
}

interface TaskRowProps {
  task: Task;
  /** Show the file path (off inside a group that is already the file). */
  showPath?: boolean;
}

/** A task line: check it, open it at its line, reschedule it, or tag it. */
export function TaskRow({ task, showPath = true }: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const today = formatLocalDate();
  const done = task.status !== 'open';
  const priority = task.priority ? PRIORITY[task.priority] : null;

  // Open a picker after a menu has closed and handed focus back.
  const pick = (next: Picker) => window.setTimeout(() => setPicker(next), 0);
  const closePicker = () => {
    setPicker(null);
    rowRef.current?.focus();
  };
  const runToggle = () => {
    if (rowRef.current && document.activeElement === rowRef.current) keepFocus(rowRef.current);
    void toggle(task);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.nativeEvent.isComposing) return;
    const modified = hasPrimaryModifier(event);
    if (event.key === 'Enter' && modified) {
      event.preventDefault();
      openTask(task, { beside: true });
      return;
    }
    if (modified) return;
    const action: Record<string, () => void> = {
      j: () => focusRow(event.currentTarget, 1),
      ArrowDown: () => focusRow(event.currentTarget, 1),
      k: () => focusRow(event.currentTarget, -1),
      ArrowUp: () => focusRow(event.currentTarget, -1),
      x: runToggle,
      ' ': runToggle,
      d: () => setPicker('due'),
      s: () => setPicker('scheduled'),
      t: () => task.line > 0 && setPicker('tag'),
    };
    const run = action[event.key];
    if (!run) return;
    event.preventDefault();
    run();
  };

  const datePicker = (field: 'due' | 'scheduled') => (
    <DatePicker
      align="end"
      value={task[field] ? parseLocalDate(task[field]) : null}
      open={picker === field}
      onOpenChange={(open) => (open ? setPicker(field) : closePicker())}
      onChange={(date) => void setDate(task, field, date ? formatLocalDate(date) : null)}
    >
      <span aria-hidden="true" className="block size-0" />
    </DatePicker>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ListRow
          ref={rowRef}
          data-task-row=""
          aria-label={`${done ? 'Done: ' : ''}${task.text}`}
          onKeyDown={onKeyDown}
          onClick={(event) => {
            if (!hasPrimaryModifier(event)) return;
            event.preventDefault();
            openTask(task, { beside: true });
          }}
          onActivate={() => openTask(task)}
          className="focus-visible:bg-text/5"
          leading={
            <Checkbox
              checked={done}
              aria-label={done ? `Uncheck “${task.text}”` : `Check “${task.text}”`}
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={runToggle}
            />
          }
          meta={
            <span className="flex min-w-0 items-center gap-2">
              <TaskDates task={task} today={today} />
              {task.recurrence ? (
                <span title={`Repeats ${task.recurrence}`} className="flex text-text-tertiary">
                  <Icon icon={Repeat} size="sm" />
                </span>
              ) : null}
              {where(task, showPath) ? <span className="min-w-0 max-w-56 truncate font-mono text-xs text-text-tertiary">{where(task, showPath)}</span> : null}
            </span>
          }
          trailing={
            <span className="flex items-center" onClick={(event) => event.stopPropagation()}>
              {datePicker('due')}
              {datePicker('scheduled')}
              <Popover open={picker === 'tag'} onOpenChange={(open) => (open ? setPicker('tag') : closePicker())}>
                <PopoverTrigger asChild>
                  <span aria-hidden="true" className="block size-0" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-2">
                  <TagForm task={task} onDone={closePicker} />
                </PopoverContent>
              </Popover>
              <Menu>
                <MenuTrigger asChild>
                  <IconButton
                    icon={MoreHorizontal}
                    label="Task actions"
                    size="sm"
                    tabIndex={-1}
                    className="opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100 data-[state=open]:opacity-100"
                  />
                </MenuTrigger>
                <MenuContent align="end">
                  <TaskMenuItems task={task} onPick={pick} />
                </MenuContent>
              </Menu>
            </span>
          }
        >
          <span className={cn(done && 'text-text-tertiary line-through')}>
            {priority ? (
              <span title={priority.label} className={cn('mr-1 inline-flex align-middle', priority.className)}>
                <Icon icon={priority.icon} size="sm" />
              </span>
            ) : null}
            <TaskText text={task.text} />
          </span>
        </ListRow>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <TaskMenuItems task={task} onPick={pick} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
