import { format } from 'date-fns';
import { CalendarPlus, X } from 'lucide-react';
import { MenuItem, MenuSeparator } from '../../ui';
import { quickDates, toDate } from './dates';
import { ProjectDot } from './ProjectDot';
import { useProjectRefs } from './projectRefs';

interface DateItemsProps {
  value?: string | null;
  onChange: (date: string | null) => void;
  /** Opens the calendar for any other day. */
  onPick: () => void;
}

const shortDay = (stamp: string) => format(toDate(stamp)!, 'EEE d MMM');

function DateItems({ value, onChange, onPick, withToday }: DateItemsProps & { withToday: boolean }) {
  const { today, tomorrow, nextWeek } = quickDates();
  const picks = [
    ...(withToday ? [{ label: 'Today', date: today }] : []),
    { label: 'Tomorrow', date: tomorrow },
    { label: 'Next week', date: nextWeek },
  ];
  return (
    <>
      {picks.map(({ label, date }) => (
        <MenuItem key={label} onSelect={() => onChange(date)}>
          <span className="flex items-center justify-between gap-4">
            {label}
            <span className="text-sm text-text-tertiary">{shortDay(date)}</span>
          </span>
        </MenuItem>
      ))}
      <MenuItem icon={CalendarPlus} onSelect={onPick}>
        Pick a date…
      </MenuItem>
      {value ? (
        <>
          <MenuSeparator />
          <MenuItem icon={X} onSelect={() => onChange(null)}>
            Clear
          </MenuItem>
        </>
      ) : null}
    </>
  );
}

/** Due ▸ Today · Tomorrow · Next week · Pick a date… · Clear */
export const DueMenuItems = (props: DateItemsProps) => <DateItems {...props} withToday />;

/** Defer ▸ Tomorrow · Next week · Pick a date… · Clear */
export const DeferMenuItems = (props: DateItemsProps) => <DateItems {...props} withToday={false} />;

/** Move to project ▸ every open project, then No project. */
export function ProjectMenuItems({ value, onChange }: { value?: string | null; onChange: (projectId: string | null) => void }) {
  const projects = useProjectRefs();
  const current = projects.find(value);
  return (
    <>
      {projects.open.length === 0 ? <MenuItem disabled>No projects yet</MenuItem> : null}
      {projects.open.map((project) => (
        <MenuItem key={project.id} onSelect={() => onChange(project.id)}>
          <span className="flex items-center gap-2">
            <ProjectDot color={project.color} />
            <span className="truncate">{project.title}</span>
            {project.id === current?.id ? <span className="text-sm text-text-tertiary">Current</span> : null}
          </span>
        </MenuItem>
      ))}
      {value ? (
        <>
          <MenuSeparator />
          <MenuItem icon={X} onSelect={() => onChange(null)}>
            No project
          </MenuItem>
        </>
      ) : null}
    </>
  );
}
