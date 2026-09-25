import { format } from 'date-fns';
import { CalendarPlus, PenLine, X } from 'lucide-react';
import { dayOf, formatLocalDate, parseLocalDate } from '@shared/date';
import { describeRule, formatRule, parseRule, type RepeatRule } from '@shared/recurrence';
import { MenuCheckboxItem, MenuItem, MenuSeparator } from '../../ui';
import { formatEstimate, quickDates, toDate } from './dates';
import { ESTIMATES } from './fields';
import { ProjectDot } from './ProjectDot';
import { useProjectRefs } from './projectRefs';

/** Estimate ▸ ~15m … ~3h · Custom… · Clear */
interface EstimateItemsProps {
  value?: number | null;
  onChange: (minutes: number | null) => void;
  /** Opens a field for any other estimate. */
  onCustom?: () => void;
}

export function EstimateMenuItems({ value, onChange, onCustom }: EstimateItemsProps) {
  const custom = value && !(ESTIMATES as readonly number[]).includes(value) ? value : null;
  return (
    <>
      {[...ESTIMATES, ...(custom ? [custom] : [])].map((minutes) => (
        <MenuCheckboxItem key={minutes} checked={value === minutes} onCheckedChange={() => onChange(minutes)}>
          {formatEstimate(minutes)}
        </MenuCheckboxItem>
      ))}
      {onCustom ? (
        <MenuItem icon={PenLine} onSelect={onCustom}>
          Custom…
        </MenuItem>
      ) : null}
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

/** The usual rules, anchored on the task's date (or today): "Every Tue", "Every month on the 15th". */
export function repeatPresets(due?: string | null): RepeatRule[] {
  const anchor = parseLocalDate(dayOf(due) ?? formatLocalDate());
  return [
    { unit: 'day', every: 1 },
    { unit: 'weekday' },
    { unit: 'week', every: 1, days: [anchor.getDay()] },
    { unit: 'week', every: 2 },
    { unit: 'month', every: 1, day: anchor.getDate() },
    { unit: 'year', every: 1 },
  ];
}

interface RepeatItemsProps {
  value?: string | null;
  due?: string | null;
  onChange: (rule: RepeatRule | null) => void;
  /** Opens a field for any other rule ("every mon, thu"). */
  onCustom: () => void;
}

/** Repeat ▸ Every day · Every weekday · Every Tue · … · Custom… · Don't repeat */
export function RepeatMenuItems({ value, due, onChange, onCustom }: RepeatItemsProps) {
  const current = parseRule(value);
  const currentText = current ? formatRule(current) : null;
  const presets = repeatPresets(due);
  const custom = current && !presets.some((rule) => formatRule(rule) === currentText) ? current : null;
  return (
    <>
      {[...presets, ...(custom ? [custom] : [])].map((rule) => (
        <MenuCheckboxItem key={formatRule(rule)} checked={formatRule(rule) === currentText} onCheckedChange={() => onChange(rule)}>
          {describeRule(rule)}
        </MenuCheckboxItem>
      ))}
      <MenuItem icon={PenLine} onSelect={onCustom}>
        Custom…
      </MenuItem>
      {current ? (
        <>
          <MenuSeparator />
          <MenuItem icon={X} onSelect={() => onChange(null)}>
            Don’t repeat
          </MenuItem>
        </>
      ) : null}
    </>
  );
}

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
