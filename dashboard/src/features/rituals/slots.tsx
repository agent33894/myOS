import { useEffect, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { useSettingsStore } from '../../store/settings';
import { Button, Dialog, Icon, IconButton, Select, SelectItem, Switch, Tooltip } from '../../ui';
import { SettingsGroup, SettingsRow } from '../settings/SettingsGroup';
import { CloseDay } from './CloseDay';
import { useRitualStore, type Ritual } from './store';
import { showsWeeklyNudge, weekStartOf } from './weekly';
import { WeeklyReview } from './WeeklyReview';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Listed Monday first, the way the week reads. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * @public Where the rituals open. It lives with the sidebar, which is always
 * mounted; it could equally sit in the app shell.
 */
export function RitualHost() {
  const open = useRitualStore((state) => state.open);
  const close = useRitualStore((state) => state.close);
  // Keep the last ritual rendered while the dialog fades out.
  const [shown, setShown] = useState<Ritual | null>(open);
  useEffect(() => {
    if (open) setShown(open);
  }, [open]);
  const ritual = open ?? shown;
  return (
    <Dialog open={open !== null} onOpenChange={(next) => (next ? undefined : close())}>
      {ritual === 'close-day' ? <CloseDay /> : ritual === 'weekly-review' ? <WeeklyReview /> : null}
    </Dialog>
  );
}

function useWeeklyNudge() {
  const reviewDay = useSettingsStore((state) => state.weeklyReviewDay);
  const lastReview = useSettingsStore((state) => state.lastWeeklyReview);
  const enabled = useRitualStore((state) => state.weeklyNudge);
  const dismissedWeek = useRitualStore((state) => state.dismissedWeek);
  const today = formatLocalDate();
  return {
    visible: showsWeeklyNudge({ today, reviewDay, lastReview, dismissedWeek, enabled }),
    why: `${WEEKDAYS[reviewDay]} is your weekly review day: a few minutes to tidy up and start next week fresh.`,
    dismiss: () => useRitualStore.getState().setPrefs({ dismissedWeek: weekStartOf(today) }),
  };
}

/** The gentle weekly-review item under the sidebar sections, on the chosen day only. */
export function RitualSidebarItem({ rail }: { rail: boolean }) {
  const { visible, why, dismiss } = useWeeklyNudge();
  const start = useRitualStore((state) => state.start);
  const open = () => start('weekly-review');

  return (
    <>
      <RitualHost />
      {!visible ? null : rail ? (
        <Tooltip content={`Weekly review · ${why}`} side="right">
          <Button variant="ghost" icon aria-label="Weekly review" onClick={open} className="relative mx-auto w-9 text-accent-text">
            <Icon icon={CalendarCheck} />
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />
          </Button>
        </Tooltip>
      ) : (
        <div className="group/ritual relative animate-fade-in">
          <Tooltip content={why} side="right">
            <Button
              variant="ghost"
              onClick={open}
              className="h-8 w-full justify-start gap-3 px-2 pr-3 font-normal"
            >
              <Icon icon={CalendarCheck} className="text-accent-text" />
              <span className="min-w-0 flex-1 truncate text-left">Weekly review</span>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent transition-opacity duration-fast group-hover/ritual:opacity-0" />
            </Button>
          </Tooltip>
          <IconButton
            icon={X}
            label="Not this week"
            size="sm"
            onClick={dismiss}
            className="absolute right-0.5 top-0.5 opacity-0 focus-visible:opacity-100 group-hover/ritual:opacity-100"
          />
        </div>
      )}
    </>
  );
}

/** Ritual settings (weekly review day, journal in search). */
export function RitualSettings() {
  const reviewDay = useSettingsStore((state) => state.weeklyReviewDay);
  const includeJournal = useSettingsStore((state) => state.includeJournalInSearch);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const nudge = useRitualStore((state) => state.weeklyNudge);
  const setPrefs = useRitualStore((state) => state.setPrefs);

  return (
    <SettingsGroup
      title="Rituals and journal"
      description="Close the day and the weekly review only start when you open them, from the palette or the sidebar."
    >
      <SettingsRow
        label="Weekly review day"
        description="The day a Weekly review item appears in the sidebar."
        control={(id) => (
          <Select id={id} value={String(reviewDay)} onValueChange={(value) => setSetting('weeklyReviewDay', Number(value))} className="w-36">
            {WEEKDAY_ORDER.map((day) => (
              <SelectItem key={day} value={String(day)}>
                {WEEKDAYS[day]}
              </SelectItem>
            ))}
          </Select>
        )}
      />
      <SettingsRow
        label="Show the weekly review in the sidebar"
        description="It appears on your review day and goes away once you’ve reviewed or dismissed it."
        control={(id) => <Switch id={id} checked={nudge} onCheckedChange={(weeklyNudge) => setPrefs({ weeklyNudge })} />}
      />
      <SettingsRow
        label="Include journal pages in search"
        description="Journal pages stay out of Notes and search unless you turn this on."
        control={(id) => (
          <Switch id={id} checked={includeJournal} onCheckedChange={(value) => setSetting('includeJournalInSearch', value)} />
        )}
      />
    </SettingsGroup>
  );
}
