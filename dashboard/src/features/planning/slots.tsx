import { useState } from 'react';
import { Repeat, Signpost, Timer } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { completionSummary, describeRule, parseRule } from '@shared/recurrence';
import type { ArtifactSummary } from '@shared/types';
import { useSettingsStore } from '../../store/settings';
import {
  Input,
  Menu,
  MenuContent,
  MenuTrigger,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Property,
  Select,
  SelectItem,
  Switch,
} from '../../ui';
import { SettingsGroup, SettingsRow } from '../settings/SettingsGroup';
import { attempt } from '../tasks/actions';
import { formatEstimate } from '../tasks/dates';
import { parseEstimate, repeatLabel, setEstimate, setRepeat, setWhen } from '../tasks/fields';
import { EstimateMenuItems, RepeatMenuItems } from '../tasks/menus';

/** A small popover with one text field: ⏎ saves, Esc closes. */
function TextPopoverBody({
  initial,
  label,
  placeholder,
  hint,
  onSave,
  preview,
}: {
  initial: string;
  label: string;
  placeholder: string;
  hint: string;
  onSave: (value: string) => boolean;
  preview?: (value: string) => string | null;
}) {
  const [value, setValue] = useState(initial);
  const shown = preview?.(value);
  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        size="sm"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSave(value);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
      />
      <p className="px-1 text-xs text-text-tertiary">{shown ?? hint}</p>
    </div>
  );
}

function RepeatProperty({ task }: { task: ArtifactSummary }) {
  const [custom, setCustom] = useState(false);
  const label = repeatLabel(task);
  return (
    <Popover open={custom} onOpenChange={setCustom}>
      <Menu>
        <PopoverAnchor asChild>
          <MenuTrigger asChild>
            <Property icon={Repeat} label="Repeat" placeholder="Repeat">
              {label}
            </Property>
          </MenuTrigger>
        </PopoverAnchor>
        <MenuContent align="start" className="min-w-52" onCloseAutoFocus={(event) => custom && event.preventDefault()}>
          <RepeatMenuItems
            value={task.repeatRule}
            due={task.due}
            onChange={(rule) => attempt(setRepeat(task, rule))}
            onCustom={() => window.requestAnimationFrame(() => setCustom(true))}
          />
        </MenuContent>
      </Menu>
      <PopoverContent align="start" className="w-72">
        <TextPopoverBody
          initial={task.repeatRule ?? ''}
          label="Repeat rule"
          placeholder="every mon, thu"
          hint="Try “every 3 days”, “every mon, thu”, or “every month on 15”."
          preview={(value) => {
            if (!value.trim()) return null;
            const rule = parseRule(value);
            return rule ? `${describeRule(rule)} · press Enter` : 'Not a rule myOS knows yet.';
          }}
          onSave={(value) => {
            const rule = parseRule(value);
            if (!rule) return false;
            attempt(setRepeat(task, rule));
            setCustom(false);
            return true;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function WhenProperty({ task }: { task: ArtifactSummary }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Property icon={Signpost} label="When" placeholder="When">
          {task.when}
        </Property>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <TextPopoverBody
          initial={task.when ?? ''}
          label="When"
          placeholder="after standup, at the café…"
          hint="A cue for when or where you’ll do it. There are no reminders."
          onSave={(value) => {
            attempt(setWhen(task, value));
            setOpen(false);
            return true;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function EstimateProperty({ task }: { task: ArtifactSummary }) {
  const [custom, setCustom] = useState(false);
  return (
    <Popover open={custom} onOpenChange={setCustom}>
      <Menu>
        <PopoverAnchor asChild>
          <MenuTrigger asChild>
            <Property icon={Timer} label="Estimate" placeholder="Estimate">
              {task.estimatedMinutes ? formatEstimate(task.estimatedMinutes) : null}
            </Property>
          </MenuTrigger>
        </PopoverAnchor>
        <MenuContent align="start" onCloseAutoFocus={(event) => custom && event.preventDefault()}>
          <EstimateMenuItems
            value={task.estimatedMinutes}
            onChange={(minutes) => attempt(setEstimate(task, minutes))}
            onCustom={() => window.requestAnimationFrame(() => setCustom(true))}
          />
        </MenuContent>
      </Menu>
      <PopoverContent align="start" className="w-60">
        <TextPopoverBody
          initial={task.estimatedMinutes ? formatEstimate(task.estimatedMinutes).slice(1) : ''}
          label="Estimate"
          placeholder="45m, 1h 30m"
          hint="Minutes or hours, like 20m or 1.5h."
          preview={(value) => {
            const minutes = parseEstimate(value);
            return value.trim() ? (minutes ? `${formatEstimate(minutes)} · press Enter` : 'Try 20m or 1.5h.') : null;
          }}
          onSave={(value) => {
            const minutes = parseEstimate(value);
            if (value.trim() && !minutes) return false;
            attempt(setEstimate(task, minutes));
            setCustom(false);
            return true;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** "Done 9 of the last 10 times": honest, and never a streak. */
function CompletionLine({ task }: { task: ArtifactSummary }) {
  const rule = parseRule(task.repeatRule);
  if (!rule || !task.completions?.length) return null;
  const { done, of } = completionSummary(task.completions, rule, formatLocalDate());
  if (of === 0) return null;
  const text = of === 1 ? (done ? 'Done the first time' : null) : `Done ${done} of the last ${of} times`;
  return text ? <span className="px-2 text-sm text-text-tertiary">{text}</span> : null;
}

/** Extra task properties (repeat, when, estimate), after the built-in ones. */
export function PlanningTaskProperties({ task }: { task: ArtifactSummary }) {
  return (
    <>
      <RepeatProperty task={task} />
      <CompletionLine task={task} />
      <WhenProperty task={task} />
      <EstimateProperty task={task} />
    </>
  );
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

/** Planning settings (capacity). */
export function PlanningSettings() {
  const show = useSettingsStore((state) => state.showCapacity);
  const hours = useSettingsStore((state) => state.availableHours);
  const setSetting = useSettingsStore((state) => state.setSetting);
  // A value set some other way stays selectable.
  const options = (HOURS as readonly number[]).includes(hours) ? HOURS : [...HOURS, hours].sort((a, b) => a - b);

  return (
    <SettingsGroup
      title="Planning"
      description="An honest look at how much is planned for today, next to the time you have. It never stops you adding more."
    >
      <SettingsRow
        label="Show planned time on Today"
        description="Adds up the estimates of today’s tasks, like “About 3 h planned · 6 h available”."
        control={(id) => <Switch id={id} checked={show} onCheckedChange={(value) => setSetting('showCapacity', value)} />}
      />
      <SettingsRow
        label="Hours available on a typical day"
        description="For focused work, not your whole day."
        control={(id) => (
          <Select
            id={id}
            size="sm"
            value={String(hours)}
            disabled={!show}
            onValueChange={(value) => setSetting('availableHours', Number(value))}
            className="w-24"
          >
            {options.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} h
              </SelectItem>
            ))}
          </Select>
        )}
      />
    </SettingsGroup>
  );
}
