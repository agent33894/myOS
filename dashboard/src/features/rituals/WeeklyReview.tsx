import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, BookOpen, Check, CheckCircle2, FileEdit, FolderKanban, Inbox, Leaf, Moon, Sparkles, Undo2 } from 'lucide-react';
import { isCheckEntry } from '@shared/checklist';
import { dayOf, formatLocalDate } from '@shared/date';
import { PROJECT_CLOSED_STATUSES } from '@shared/spec';
import { ArtifactStatus, type ArtifactSummary } from '@shared/types';
import { toInboxSortUrl, toWeekUrl } from '../../app/navigation';
import { patch, patchMany } from '../../data/gateway';
import { appendToJournal } from '../../data/pages';
import { replan, type ReplanTarget } from '../../data/planning';
import { useInbox, useProjects, useTasks, useToday, useWeek } from '../../data/selectors';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, Input, Textarea } from '../../ui';
import { dayLabel } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor } from '../tasks/projectRefs';
import { ChoiceList, type Choice } from './ChoiceList';
import { Finale, ProjectMeta } from './parts';
import { RitualFrame } from './RitualFrame';
import { useRitualStore } from './store';
import { isQuiet, weekStartOf } from './weekly';

type Carry = ReplanTarget | 'keep';
type Fate = 'keep' | 'someday' | 'done';

const CARRY: readonly Choice<Carry>[] = [
  { value: 'keep', label: 'Keep', key: 'k' },
  { value: 'today', label: 'Today', key: 't' },
  { value: 'next-week', label: 'Next week', key: 'w' },
  { value: 'someday', label: 'Someday', key: 's' },
  { value: 'none', label: 'No date', key: 'n' },
];

const FATES: readonly Choice<Fate>[] = [
  { value: 'keep', label: 'Keep', key: 'k' },
  { value: 'someday', label: 'Someday', key: 's' },
  { value: 'done', label: 'Done', key: 'd' },
];

const STEPS = 6;
const PREVIEW = 6;

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);

/** Active projects (not finished, not parked in Someday). */
const isActive = (project: ArtifactSummary) => !PROJECT_CLOSED_STATUSES.has(project.status) && project.status !== ArtifactStatus.DRAFT;

function Glyph({ icon }: { icon: typeof Check }) {
  return (
    <div className="grid place-items-center py-8">
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Icon icon={icon} size="lg" />
      </span>
    </div>
  );
}

function Preview({ items, more }: { items: readonly { key: string; title: string; meta?: string }[]; more: number }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 rounded-md bg-raised px-3 py-2 shadow-raised">
          <span className="min-w-0 flex-1 truncate text-base text-text">{item.title}</span>
          {item.meta ? <span className="shrink-0 text-sm text-text-tertiary">{item.meta}</span> : null}
        </li>
      ))}
      {more > 0 ? <li className="px-3 pt-1 text-sm text-text-tertiary">and {more} more</li> : null}
    </ul>
  );
}

/** One project without a next step, with an inline field to give it one. */
function NextStepRow({
  project,
  saved,
  onSave,
  onDraft,
}: {
  project: ArtifactSummary;
  saved?: string;
  onSave: (next: string) => void;
  onDraft: (next: string) => void;
}) {
  const [value, setValue] = useState('');
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    if (value.trim()) onSave(value.trim());
    // Enter moves on to the next project, so the list is one keyboard pass.
    const rows = [...document.querySelectorAll<HTMLInputElement>('[data-next-step]')];
    rows[rows.indexOf(event.currentTarget) + 1]?.focus();
  };
  return (
    <li className="flex min-h-12 items-center gap-3 rounded-md bg-raised px-3 py-2 shadow-raised">
      <ProjectDot color={projectColor(project)} />
      <span className="w-40 shrink-0 truncate text-base font-medium text-text">{project.title}</span>
      {saved ? (
        <span className="flex min-w-0 flex-1 items-center gap-2 text-base text-text-secondary animate-fade-in">
          <Icon icon={Check} size="sm" className="text-accent-text" />
          <span className="truncate">{saved}</span>
        </span>
      ) : (
        <Input
          data-next-step
          variant="ghost"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => value.trim() && onSave(value.trim())}
          placeholder="What’s the next step?"
          aria-label={`Next step for ${project.title}`}
          className="min-w-0 flex-1"
        />
      )}
    </li>
  );
}

/**
 * The weekly review: a fresh start in five short steps, an optional
 * reflection, and an ending that looks at what moved. Leaving part-way keeps
 * your place; nothing is required.
 */
export function WeeklyReview() {
  const navigate = useNavigate();
  const { close, weeklyStep: step, setWeeklyStep: setStep } = useRitualStore();
  const setSetting = useSettingsStore((state) => state.setSetting);
  const inbox = useInbox();
  const { carriedOver } = useToday();
  const projects = useProjects();
  const { someday } = useTasks();
  const today = formatLocalDate();
  const week = useWeek(weekStartOf(today));

  // Each list as the review began, so rows stay put while you decide.
  const [carried] = useState(() => carriedOver.filter((entry): entry is ArtifactSummary => !isCheckEntry(entry)));
  const [needsNext] = useState(() =>
    projects.filter((project) => isActive(project) && !project.next?.trim()).sort((a, b) => a.title.localeCompare(b.title)),
  );
  const [quiet] = useState(() =>
    projects.filter((project) => isActive(project) && isQuiet(project, today)).sort((a, b) => a.title.localeCompare(b.title)),
  );
  const [carry, setCarry] = useState<Record<string, Carry>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [nextSteps, setNextSteps] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [did, setDid] = useState({ replanned: 0, nextSteps: 0, settled: 0, reflected: false });

  // A review closed at its ending starts from the top next time.
  useEffect(
    () => () => {
      if (useRitualStore.getState().weeklyStep >= STEPS) useRitualStore.getState().setWeeklyStep(0);
    },
    [],
  );

  const next = () => setStep(step + 1);
  const finish = () => {
    setSetting('lastWeeklyReview', today);
    setStep(STEPS);
  };
  const run = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      failed(fallback)(error);
    } finally {
      setBusy(false);
    }
  };

  const savedNext = useRef(new Map<string, string>());
  const draftNext = useRef(new Map<string, string>());
  const saveNext = (project: ArtifactSummary, value: string) => {
    // Enter moves focus on, which also blurs the field: save once.
    if (savedNext.current.get(project.filePath) === value) return;
    savedNext.current.set(project.filePath, value);
    setNextSteps((current) => ({ ...current, [project.filePath]: value }));
    setDid((current) => ({ ...current, nextSteps: current.nextSteps + 1 }));
    patch(project.filePath, { next: value }, `Set the next step for “${project.title}”`).catch(failed('Could not save that next step'));
  };

  const frame = { name: 'Weekly review', steps: STEPS, step, busy, onSkip: next };

  if (step === 0) {
    const count = inbox.length;
    return (
      <RitualFrame
        {...frame}
        title={count > 0 ? 'Start with the Inbox.' : 'Your Inbox is clear.'}
        description={
          count > 0
            ? `${plural(count, 'capture is', 'captures are')} waiting. Sorting takes one key per item, and this review keeps your place.`
            : 'Nothing is waiting to be sorted. On to the rest of the week.'
        }
        onContinue={next}
        onSkip={count > 0 ? next : undefined}
      >
        {count > 0 ? (
          <div className="flex flex-col gap-4">
            <Preview
              items={inbox.slice(0, PREVIEW).map((item) => ({ key: item.filePath, title: item.title, meta: dayLabel(item.created.slice(0, 10)) }))}
              more={count - PREVIEW}
            />
            <Button
              leadingIcon={Inbox}
              className="self-start"
              onClick={() => {
                close();
                navigate(toInboxSortUrl());
              }}
            >
              Sort the Inbox now
            </Button>
          </div>
        ) : (
          <Glyph icon={Inbox} />
        )}
      </RitualFrame>
    );
  }

  if (step === 1) {
    const apply = () =>
      run(async () => {
        const groups = new Map<ReplanTarget, ArtifactSummary[]>();
        for (const task of carried) {
          const target = carry[task.filePath] ?? 'keep';
          if (target !== 'keep') groups.set(target, [...(groups.get(target) ?? []), task]);
        }
        for (const [target, tasks] of groups) await replan(tasks, target);
        const count = [...groups.values()].reduce((sum, tasks) => sum + tasks.length, 0);
        setDid((current) => ({ ...current, replanned: count }));
        next();
      }, 'Could not re-plan those tasks');
    return (
      <RitualFrame
        {...frame}
        title={carried.length > 0 ? 'Give carried-over tasks a new home.' : 'Nothing is carried over.'}
        description={
          carried.length > 0
            ? 'Plans change. Choose a day that fits now, or park a task in Someday.'
            : 'Every dated task is still ahead of you.'
        }
        onContinue={() => void apply()}
        onSkip={carried.length > 0 ? next : undefined}
      >
        {carried.length > 0 ? (
          <ChoiceList
            label="Carried over"
            rows={carried.map((task) => ({
              id: task.filePath,
              title: task.title,
              meta: <ProjectMeta project={task.project} fallback={task.due ? `From ${dayLabel(dayOf(task.due)!)}` : undefined} />,
            }))}
            choices={CARRY}
            value={carry}
            fallback="keep"
            onChange={(id, target) => setCarry((current) => ({ ...current, [id]: target }))}
          />
        ) : (
          <Glyph icon={CheckCircle2} />
        )}
      </RitualFrame>
    );
  }

  if (step === 2) {
    return (
      <RitualFrame
        {...frame}
        title={needsNext.length > 0 ? 'What’s next for these projects?' : 'Every project has a next step.'}
        description={
          needsNext.length > 0
            ? 'A single concrete step makes a project easier to pick up. Leave any of them blank.'
            : 'Each active project already knows where it’s going.'
        }
        onContinue={() => {
          // Save steps typed but not yet entered.
          for (const project of needsNext) {
            const draft = draftNext.current.get(project.filePath)?.trim();
            if (draft) saveNext(project, draft);
          }
          next();
        }}
        onSkip={needsNext.length > 0 ? next : undefined}
      >
        {needsNext.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Projects without a next step">
            {needsNext.map((project) => (
              <NextStepRow
                key={project.filePath}
                project={project}
                saved={nextSteps[project.filePath]}
                onSave={(value) => saveNext(project, value)}
                onDraft={(value) => draftNext.current.set(project.filePath, value)}
              />
            ))}
          </ul>
        ) : (
          <Glyph icon={FolderKanban} />
        )}
      </RitualFrame>
    );
  }

  if (step === 3) {
    const apply = () =>
      run(async () => {
        const changes = quiet.flatMap((project) => {
          const fate = fates[project.filePath] ?? 'keep';
          if (fate === 'keep') return [];
          return [{ path: project.filePath, fields: { status: fate === 'done' ? ArtifactStatus.DONE : ArtifactStatus.DRAFT } }];
        });
        if (changes.length > 0) await patchMany(changes, `Settle ${plural(changes.length, 'quiet project')}`);
        setDid((current) => ({ ...current, settled: changes.length }));
        next();
      }, 'Could not update those projects');
    return (
      <RitualFrame
        {...frame}
        title={quiet.length > 0 ? 'A few projects have been quiet.' : 'No quiet projects.'}
        description={
          quiet.length > 0
            ? 'Nothing has changed in these for three weeks. That’s fine. Keep them, park them in Someday, or call them done.'
            : 'Every active project has moved in the last three weeks.'
        }
        onContinue={() => void apply()}
        onSkip={quiet.length > 0 ? next : undefined}
      >
        {quiet.length > 0 ? (
          <ChoiceList
            label="Quiet projects"
            rows={quiet.map((project) => ({
              id: project.filePath,
              title: project.title,
              leading: <ProjectDot color={projectColor(project)} />,
              meta: `Last touched ${dayLabel(dayOf(project.lastActivity ?? project.updated)!)}`,
            }))}
            choices={FATES}
            value={fates}
            fallback="keep"
            onChange={(id, fate) => setFates((current) => ({ ...current, [id]: fate }))}
          />
        ) : (
          <Glyph icon={Leaf} />
        )}
      </RitualFrame>
    );
  }

  if (step === 4) {
    const shown = someday.slice(0, 8);
    return (
      <RitualFrame
        {...frame}
        title={someday.length > 0 ? 'A glance at Someday.' : 'Someday is empty.'}
        description={
          someday.length > 0
            ? 'Nothing to do here unless something feels ready. Bring it back and it waits in Tasks, undated.'
            : 'When you park a task for later, it waits here without a date.'
        }
        onContinue={next}
        onSkip={undefined}
      >
        {someday.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Someday">
            {shown.map((task) => (
              <li key={task.filePath} className="group flex items-center gap-3 rounded-md px-3 py-1.5 hover:bg-text/5">
                <Icon icon={Moon} size="sm" className="text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate text-base text-text">{task.title}</span>
                <span className="shrink-0 text-sm text-text-tertiary">
                  <ProjectMeta project={task.project} />
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={Undo2}
                  className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() =>
                    replan([task], 'none')
                      .then(() => toast.success(`“${task.title}” is back in Tasks`))
                      .catch(failed('Could not bring that back'))
                  }
                >
                  Bring back
                </Button>
              </li>
            ))}
            {someday.length > shown.length ? (
              <li className="px-3 pt-1 text-sm text-text-tertiary">and {someday.length - shown.length} more in Tasks</li>
            ) : null}
          </ul>
        ) : (
          <Glyph icon={Moon} />
        )}
      </RitualFrame>
    );
  }

  if (step === 5) {
    const save = () =>
      run(async () => {
        const text = reflection.trim().replace(/\s*\n+\s*/g, ' ');
        if (text) {
          await appendToJournal(today, 'Weekly review', text);
          setDid((current) => ({ ...current, reflected: true }));
        }
        finish();
      }, 'Could not add that to your journal');
    return (
      <RitualFrame
        {...frame}
        title="Anything to carry forward?"
        description="A few words for today’s journal, under Weekly review. Leave it empty to skip."
        onContinue={() => void save()}
        onSkip={finish}
      >
        <Textarea
          autoFocus
          autosize
          rows={3}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="What went well, what felt heavy, what you want more of next week…"
          aria-label="Reflection for your journal"
          className="min-h-24 text-md"
        />
      </RitualFrame>
    );
  }

  const finished = week.groups.reduce((sum, group) => sum + group.finished.length, 0);
  const written = week.groups.reduce((sum, group) => sum + group.written.length + group.edited.length, 0);
  const lines = [
    finished > 0 ? { icon: Sparkles, text: `${plural(finished, 'task')} finished this week` } : null,
    written > 0 ? { icon: FileEdit, text: `${plural(written, 'note')} written or edited` } : null,
    did.replanned > 0 ? { icon: ArrowRight, text: `${plural(did.replanned, 'task')} re-planned` } : null,
    did.nextSteps > 0 ? { icon: FolderKanban, text: `${plural(did.nextSteps, 'next step')} set` } : null,
    did.settled > 0 ? { icon: Leaf, text: `${plural(did.settled, 'quiet project')} settled` } : null,
    did.reflected ? { icon: BookOpen, text: 'A reflection in your journal' } : null,
  ].filter((line) => line !== null);
  const done = () => {
    setStep(0);
    close();
  };

  return (
    <RitualFrame
      {...frame}
      onSkip={undefined}
      finale
      glyph={Sparkles}
      title="Ready for a fresh week."
      description="Here’s what moved this week, and what the review settled."
      continueLabel="Done"
      onContinue={done}
      secondary={
        <Button
          variant="ghost"
          leadingIcon={ArrowRight}
          onClick={() => {
            done();
            navigate(toWeekUrl());
          }}
        >
          See what moved
        </Button>
      }
    >
      <Finale lines={lines} />
    </RitualFrame>
  );
}
