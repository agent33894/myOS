import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Icon, Input, ListRow, Popover, PopoverContent, PopoverTrigger } from '../../ui';
import { ProjectDot } from './ProjectDot';
import { useProjectRefs } from './projectRefs';

interface ProjectPickerProps {
  /** The item's current `project:` value. */
  value?: string | null;
  onChange: (projectId: string | null) => void;
  /** One focusable trigger, such as a `Property` or `Button`. */
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
}

/** Choose a project by typing a few letters; ↑↓ and ⏎ work in the list. */
export function ProjectPicker({ value, onChange, children, open: openProp, onOpenChange, align = 'start' }: ProjectPickerProps) {
  const projects = useProjectRefs();
  const [openState, setOpenState] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
    if (next) {
      setQuery('');
      setActive(0);
    }
  };

  const current = projects.find(value);
  const options = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    const matches = projects.open.filter((project) => project.title.toLowerCase().includes(wanted));
    const rows: Array<{ id: string | null; title: string; color?: string }> = matches;
    return value && !wanted ? [...rows, { id: null, title: 'No project' }] : rows;
  }, [projects.open, query, value]);

  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + options.length) % Math.max(options.length, 1));
    } else if (event.key === 'Enter' && options[active]) {
      event.preventDefault();
      choose(options[active].id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="flex w-72 flex-col gap-1 p-1">
        <Input
          autoFocus
          size="sm"
          icon={Search}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Find a project…"
          aria-label="Find a project"
          aria-controls="project-picker-options"
          className="mb-1"
        />
        <div id="project-picker-options" role="listbox" aria-label="Projects" className="flex max-h-72 flex-col overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-tertiary">
              {projects.open.length === 0 ? 'No projects yet.' : 'No matching projects.'}
            </p>
          ) : null}
          {options.map((option, index) => (
            <ListRow
              key={option.id ?? 'none'}
              role="option"
              selected={index === active}
              aria-selected={option.id === (current?.id ?? null)}
              onMouseEnter={() => setActive(index)}
              onActivate={() => choose(option.id)}
              tabIndex={-1}
              className="min-h-8"
              leading={option.color ? <ProjectDot color={option.color} /> : <Icon icon={X} size="sm" className="text-text-tertiary" />}
            >
              {option.title}
            </ListRow>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
