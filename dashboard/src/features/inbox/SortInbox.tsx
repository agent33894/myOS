import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, CheckCircle2, Coffee, FileText, FolderInput, PartyPopper, Trash2 } from 'lucide-react';
import type { ArtifactPatch, ArtifactSummary } from '@shared/types';
import { patch } from '../../data/gateway';
import { useInbox } from '../../data/selectors';
import { Button, DatePicker, EmptyState, Icon, Kbd, Property, Textarea, cn, type ButtonProps } from '../../ui';
import { attempt, deleteItem, toastWithUndo } from '../tasks/actions';
import { createdAt, dayLabel, fromDate, inSentence, relativeTime, toDate } from '../tasks/dates';
import { ProjectPicker } from '../tasks/ProjectPicker';
import { makeNote, makeTask } from './inboxActions';

interface ActionProps extends Pick<ButtonProps, 'variant' | 'onClick'> {
  icon: LucideIcon;
  label: string;
  shortcut: string;
}

function SortAction({ icon, label, shortcut, variant = 'secondary', ...props }: ActionProps) {
  return (
    <Button variant={variant} className="h-auto flex-1 flex-col gap-1 py-3" {...props}>
      <Icon icon={icon} size="lg" />
      <span>{label}</span>
      <Kbd shortcut={shortcut} className={cn(variant === 'primary' && 'bg-accent-on/15 text-accent-on')} />
    </Button>
  );
}

function Celebration({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (
    <div className={cn('transition duration-slow ease-spring', shown ? 'scale-100 opacity-100' : 'scale-90 opacity-0')}>
      {children}
    </div>
  );
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

/**
 * One capture at a time, keyboard first: Task (t), Note (n), Project (p),
 * Delete (⌫), Skip (→), and an optional date (d) for tasks.
 */
export function SortInbox({ onExit }: { onExit: () => void }) {
  const inbox = useInbox();
  const [queue, setQueue] = useState(() => inbox.map((item) => item.filePath));
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [picking, setPicking] = useState<'date' | 'project' | null>(null);

  const path = queue[index];
  const item: ArtifactSummary | undefined = inbox.find((capture) => capture.filePath === path);
  const finished = index >= queue.length;

  // A new card starts from its own title, without a date.
  useEffect(() => {
    setTitle(item?.title ?? '');
    setDue(null);
  }, [path]);

  // Captures sorted or deleted elsewhere are skipped.
  useEffect(() => {
    if (!finished && !item) setIndex((current) => current + 1);
  }, [finished, item]);

  const next = () => setIndex((current) => current + 1);
  const back = () => setIndex((current) => Math.max(0, current - 1));
  const edits = (): ArtifactPatch => (item && title.trim() && title.trim() !== item.title ? { title: title.trim() } : {});

  const act = (write: Promise<unknown>, message: string) => {
    next();
    attempt(write.then(() => toastWithUndo(message, back)));
  };
  const toTask = (project?: string) => {
    if (!item) return;
    act(makeTask(item, { ...edits(), ...(due ? { due } : {}), ...(project ? { project } : {}) }), 'Made a task');
  };
  const toNote = () => item && act(makeNote(item, edits()), 'Made a note');
  const remove = () => {
    if (!item) return;
    next();
    void deleteItem(item, back);
  };
  const skip = () => {
    const changed = edits();
    if (item && changed.title) attempt(patch(item.filePath, changed, `Rename “${item.title}”`));
    next();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || picking) return;
      if (event.key === 'Escape') {
        if (isTyping(event.target)) (event.target as HTMLElement).blur();
        else onExit();
        return;
      }
      if (isTyping(event.target) || finished) return;
      const action: Record<string, () => void> = {
        t: () => toTask(),
        n: toNote,
        p: () => setPicking('project'),
        d: () => setPicking('date'),
        Backspace: remove,
        Delete: remove,
        ArrowRight: skip,
      };
      const run = action[event.key];
      if (!run) return;
      event.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (finished) {
    const left = inbox.length;
    return (
      <div className="grid h-full place-items-center">
        <Celebration>
          {left === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Inbox zero. Nice."
              description="Everything has a place. Enjoy the clear head."
              action={<Button onClick={onExit}>Back to inbox</Button>}
            />
          ) : (
            <EmptyState
              icon={Coffee}
              title="That’s everything for now."
              description={`${left} ${left === 1 ? 'capture is' : 'captures are'} waiting for later.`}
              action={
                <div className="flex gap-2">
                  <Button onClick={onExit}>Back to inbox</Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setQueue(inbox.map((capture) => capture.filePath));
                      setIndex(0);
                    }}
                  >
                    Sort again
                  </Button>
                </div>
              }
            />
          )}
        </Celebration>
      </div>
    );
  }

  const preview = item?.searchText?.trim();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-24 pt-12">
      <div className="flex items-center gap-4">
        <span className="text-sm tabular-nums text-text-secondary">
          {index + 1} of {queue.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-text/5">
          <div
            className="h-full rounded-full bg-accent transition-all duration-base ease-out"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Done
          <Kbd shortcut="escape" />
        </Button>
      </div>

      {item ? (
        <article key={item.filePath} className="flex flex-col rounded-xl bg-raised p-8 shadow-raised animate-slide-up">
          <Textarea
            autosize
            variant="ghost"
            value={title}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              event.currentTarget.blur();
            }}
            aria-label="Title"
            className="px-0 text-xl font-semibold hover:bg-transparent focus-visible:bg-transparent"
          />
          {preview ? (
            <p className="mt-3 line-clamp-6 whitespace-pre-line text-md text-text-secondary">{preview}</p>
          ) : null}
          <div className="-ml-2 mt-6 flex items-center gap-2 text-sm text-text-tertiary">
            <DatePicker
              value={toDate(due)}
              onChange={(date) => setDue(fromDate(date))}
              open={picking === 'date'}
              onOpenChange={(open) => setPicking(open ? 'date' : null)}
            >
              <Property icon={CalendarDays} label="Date for the task" placeholder="Add a date" tone={due ? 'accent' : 'default'}>
                {due ? dayLabel(due) : null}
              </Property>
            </DatePicker>
            <Kbd shortcut="d" />
            <span className="ml-auto">Captured {inSentence(relativeTime(createdAt(item)))}</span>
          </div>
        </article>
      ) : null}

      <div role="group" aria-label="Sort this capture" className="flex gap-2">
        <SortAction icon={CheckCircle2} label="Task" shortcut="t" variant="primary" onClick={() => toTask()} />
        <SortAction icon={FileText} label="Note" shortcut="n" onClick={toNote} />
        <ProjectPicker
          onChange={(id) => id && toTask(id)}
          open={picking === 'project'}
          onOpenChange={(open) => setPicking(open ? 'project' : null)}
        >
          <Button variant="secondary" className="h-auto flex-1 flex-col gap-1 py-3">
            <Icon icon={FolderInput} size="lg" />
            <span>Project</span>
            <Kbd shortcut="p" />
          </Button>
        </ProjectPicker>
        <SortAction icon={Trash2} label="Delete" shortcut="backspace" variant="danger" onClick={remove} />
        <SortAction icon={ArrowRight} label="Skip" shortcut="right" variant="ghost" onClick={skip} />
      </div>
    </div>
  );
}
