import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, BookOpen, CalendarClock, Check, Moon, Sparkles } from 'lucide-react';
import { isCheckEntry } from '@shared/checklist';
import { dayOf, formatLocalDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { paths } from '../../app/navigation';
import { appendToJournal } from '../../data/pages';
import { replan, type ReplanTarget } from '../../data/planning';
import { useToday } from '../../data/selectors';
import { Button, Icon, Input } from '../../ui';
import { ChoiceList, type Choice } from './ChoiceList';
import { DoneList, Finale, ProjectMeta } from './parts';
import { RitualFrame } from './RitualFrame';
import { useRitualStore } from './store';

type Plan = 'tomorrow' | 'none' | 'someday' | 'keep';

const CHOICES: readonly Choice<Plan>[] = [
  { value: 'tomorrow', label: 'Tomorrow', key: 't' },
  { value: 'none', label: 'Later', key: 'l' },
  { value: 'someday', label: 'Someday', key: 's' },
  { value: 'keep', label: 'Keep', key: 'k' },
];

const STEPS = 3;

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function whyToday(task: ArtifactSummary, today: string) {
  if (dayOf(task.planned) === today) return 'Planned for today';
  if (dayOf(task.due) === today) return 'Due today';
  if (task.status === 'in-progress') return 'In progress';
  return 'Flagged';
}

interface Outcome {
  moved: Partial<Record<Plan, number>>;
  noted: boolean;
}

/**
 * Close the day: what got done (the peak), a home for each open task, an
 * optional line for the journal, and a clear ending. Started only by the user;
 * every step can be skipped and leaving early changes nothing.
 */
export function CloseDay() {
  const navigate = useNavigate();
  const close = useRitualStore((state) => state.close);
  const { today: todayEntries, doneToday } = useToday();
  const today = formatLocalDate();
  // The open tasks as the flow began, so rows don't vanish while you choose.
  const [open] = useState(() => todayEntries.filter((entry): entry is ArtifactSummary => !isCheckEntry(entry)));
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ moved: {}, noted: false });

  const next = () => setStep((current) => current + 1);

  async function applyPlans() {
    const groups = new Map<ReplanTarget, ArtifactSummary[]>();
    for (const task of open) {
      const plan = plans[task.filePath] ?? 'keep';
      if (plan !== 'keep') groups.set(plan, [...(groups.get(plan) ?? []), task]);
    }
    setBusy(true);
    try {
      for (const [target, tasks] of groups) await replan(tasks, target);
      setOutcome((current) => ({
        ...current,
        moved: Object.fromEntries([...groups].map(([target, tasks]) => [target, tasks.length])),
      }));
      next();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move those tasks');
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    const line = note.trim();
    if (!line) return next();
    setBusy(true);
    try {
      await appendToJournal(today, 'Evening', line);
      setOutcome((current) => ({ ...current, noted: true }));
      next();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add that to your journal');
    } finally {
      setBusy(false);
    }
  }

  const frame = { name: 'Close the day', steps: STEPS, step, busy };

  if (step === 0) {
    const count = doneToday.length;
    return (
      <RitualFrame
        {...frame}
        title={count > 0 ? `You finished ${plural(count, 'thing')} today.` : 'A quieter day.'}
        description={
          count > 0 ? 'Take a moment with that before you set up tomorrow.' : 'Not every day is for finishing things. Let’s leave tomorrow in good shape.'
        }
        onContinue={next}
      >
        {count > 0 ? (
          <DoneList tasks={doneToday} />
        ) : (
          <div className="grid place-items-center py-8 text-text-tertiary">
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
              <Icon icon={Moon} size="lg" />
            </span>
          </div>
        )}
      </RitualFrame>
    );
  }

  if (step === 1) {
    return (
      <RitualFrame
        {...frame}
        title={open.length > 0 ? 'Where should the rest go?' : 'Nothing left open for today.'}
        description={
          open.length > 0
            ? 'Pick a home for each open task. Keep leaves it on Today.'
            : 'Everything you planned for today is done or already has a home.'
        }
        onContinue={() => void applyPlans()}
        onSkip={open.length > 0 ? next : undefined}
      >
        {open.length > 0 ? (
          <ChoiceList
            label="Open tasks"
            rows={open.map((task) => ({
              id: task.filePath,
              title: task.title,
              meta: <ProjectMeta project={task.project} fallback={whyToday(task, today)} />,
            }))}
            choices={CHOICES}
            value={plans}
            fallback="keep"
            onChange={(id, plan) => setPlans((current) => ({ ...current, [id]: plan }))}
          />
        ) : (
          <div className="grid place-items-center py-8">
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
              <Icon icon={Check} size="lg" />
            </span>
          </div>
        )}
      </RitualFrame>
    );
  }

  if (step === 2) {
    return (
      <RitualFrame
        {...frame}
        title="Anything worth remembering?"
        description="One line for today’s journal, under Evening. Leave it empty to skip."
        onContinue={() => void saveNote()}
        onSkip={next}
      >
        <Input
          autoFocus
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="A small win, a good conversation, a thought for tomorrow…"
          aria-label="A line for your journal"
          className="h-11 text-md"
        />
      </RitualFrame>
    );
  }

  const { moved } = outcome;
  const lines = [
    doneToday.length > 0 ? { icon: Sparkles, text: `${plural(doneToday.length, 'task')} done today` } : null,
    moved.tomorrow ? { icon: ArrowRight, text: `${plural(moved.tomorrow, 'task')} set for tomorrow` } : null,
    moved.none ? { icon: CalendarClock, text: `${plural(moved.none, 'task')} saved for later` } : null,
    moved.someday ? { icon: Moon, text: `${plural(moved.someday, 'task')} parked in Someday` } : null,
    outcome.noted ? { icon: BookOpen, text: 'A line in your journal' } : null,
  ].filter((line) => line !== null);

  return (
    <RitualFrame
      {...frame}
      finale
      glyph={Moon}
      title="That’s a wrap."
      description="The day is closed. Tomorrow can start fresh."
      continueLabel="Done"
      onContinue={close}
      secondary={
        <Button
          variant="ghost"
          leadingIcon={BookOpen}
          onClick={() => {
            close();
            navigate(paths.journal);
          }}
        >
          Open journal
        </Button>
      }
    >
      <Finale lines={lines} />
    </RitualFrame>
  );
}
