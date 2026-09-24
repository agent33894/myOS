import { useState, type ReactNode } from 'react';
import { DayPicker } from 'react-day-picker';
import { addDays, addWeeks, format, startOfToday, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';
import { Icon } from './Icon';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { menuItem } from './styles';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** The trigger: one focusable element, such as a `Property` or `Button`. */
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
}

const navButton =
  'inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-text/5 hover:text-text disabled:opacity-50';

/** A date chooser with quick picks (Today, Tomorrow, Next week, Clear) above a month calendar. */
export function DatePicker({ value, onChange, children, align = 'start' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = startOfToday();
  const choose = (date: Date | null) => {
    onChange(date);
    setOpen(false);
  };

  const quickPicks = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next week', date: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <div className="flex flex-col pb-2">
          {quickPicks.map(({ label, date }) => (
            <button key={label} type="button" className={cn(menuItem, 'hover:bg-text/5')} onClick={() => choose(date)}>
              <span className="flex-1 text-left">{label}</span>
              <span className="text-sm text-text-tertiary">{format(date, 'EEE d MMM')}</span>
            </button>
          ))}
          {value ? (
            <button type="button" className={cn(menuItem, 'text-text-secondary hover:bg-text/5')} onClick={() => choose(null)}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="border-t border-border px-1 pt-2">
          <DayPicker
            mode="single"
            selected={value ?? undefined}
            defaultMonth={value ?? today}
            onSelect={(date) => choose(date ?? null)}
            showOutsideDays
            classNames={{
              root: 'text-sm',
              months: 'relative',
              month: 'flex flex-col gap-1',
              month_caption: 'flex h-7 items-center px-1',
              caption_label: 'text-sm font-medium text-text',
              nav: 'absolute right-0 top-0 z-10 flex gap-1',
              button_previous: navButton,
              button_next: navButton,
              month_grid: 'border-collapse',
              weekday: 'size-8 text-xs font-medium text-text-tertiary',
              day: 'p-0 text-center',
              day_button:
                'inline-flex size-8 items-center justify-center rounded-full text-sm text-text transition-colors duration-fast hover:bg-text/5',
              today: '*:font-semibold *:text-accent-text',
              selected: '*:bg-accent *:text-accent-on *:hover:bg-accent-hover',
              outside: '*:text-text-tertiary',
              disabled: '*:opacity-50',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) => (
                <Icon icon={orientation === 'left' ? ChevronLeft : ChevronRight} />
              ),
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
