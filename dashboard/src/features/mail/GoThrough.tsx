import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AlarmClock, Archive, ArrowRight, BellOff, CheckCircle2, Coffee, Eye, PartyPopper, Reply } from 'lucide-react';
import { LANES } from '@shared/mail/config';
import type { MailItem } from '@shared/mail/types';
import { toMailUrl } from '../../app/navigation';
import { useMail } from '../../data/mail';
import { Button, EmptyState, Icon, ariaShortcut, Pill, cn, type ButtonProps } from '../../ui';
import { done, makeTask, moveToLane, mute, snooze, snoozeTimes } from './actions';
import { counterpart, displayName, dueLabel, views, when } from './format';

interface ActionProps extends Pick<ButtonProps, 'variant' | 'onClick'> {
  icon: LucideIcon;
  label: string;
  shortcut: string;
}

function Action({ icon, label, shortcut, variant = 'secondary', ...props }: ActionProps) {
  return (
    <Button variant={variant} aria-keyshortcuts={ariaShortcut(shortcut)} className="h-auto flex-1 flex-col gap-1 py-3" {...props}>
      <Icon icon={icon} size="lg" />
      <span>{label}</span>
    </Button>
  );
}

function Celebration({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return <div className={cn('transition duration-slow ease-spring', shown ? 'scale-100 opacity-100' : 'scale-90 opacity-0')}>{children}</div>;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

/**
 * Everything that needs you, then what is worth a glance, one at a time:
 * Done (e), Task (t), Reply (r), For your eyes (f), Snooze (s), Mute (m), Skip (→).
 */
export function GoThrough({ onExit }: { onExit: () => void }) {
  const navigate = useNavigate();
  const snapshot = useMail();
  const [queue] = useState(() => (snapshot ? [...views(snapshot).needs, ...views(snapshot).fyi].map((item) => item.id) : []));
  const [index, setIndex] = useState(0);
  const byId = new Map((snapshot?.items ?? []).map((item) => [item.id, item]));
  const id = queue[index];
  const item: MailItem | undefined = id ? byId.get(id) : undefined;
  const finished = index >= queue.length;

  // Mail dealt with elsewhere (another device, a rule) is skipped.
  useEffect(() => {
    if (!finished && (!item || item.state !== 'open')) setIndex((current) => current + 1);
  }, [finished, item]);

  const next = () => setIndex((current) => current + 1);
  const tomorrow = snoozeTimes().find((choice) => choice.label === 'Tomorrow morning')!;
  const actions: Record<string, () => void> = item
    ? {
        e: () => {
          done([item]);
          next();
        },
        t: () => {
          if (!item.taskPath) makeTask(item);
          done([item]);
          next();
        },
        r: () => navigate(toMailUrl({ id: item.id, reply: true })),
        f: () => {
          moveToLane([item], 'fyi');
          next();
        },
        s: () => {
          snooze([item], tomorrow.until, tomorrow.label);
          next();
        },
        m: () => {
          mute(item, 'sender');
          next();
        },
        ArrowRight: next,
      }
    : {};

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') return onExit();
      if (isTyping(event.target) || finished) return;
      const run = actions[event.key] as (() => void) | undefined;
      if (!run) return;
      event.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (finished) {
    const left = snapshot ? views(snapshot).needs.length : 0;
    return (
      <div className="grid h-full place-items-center">
        <Celebration>
          {left === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Nothing needs you. Nice."
              description="myOS keeps watching and will tell you when something does."
              action={<Button onClick={onExit}>Back to mail</Button>}
            />
          ) : (
            <EmptyState
              icon={Coffee}
              title="That’s everything for now."
              description={`${left} ${left === 1 ? 'email is' : 'emails are'} waiting for later.`}
              action={<Button onClick={onExit}>Back to mail</Button>}
            />
          )}
        </Celebration>
      </div>
    );
  }

  const needsYou = item ? item.verdict.lane === 'action' || item.verdict.lane === 'reply' : false;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-24 pt-12">
      <div className="flex items-center gap-4">
        <span className="text-sm tabular-nums text-text-secondary">
          {index + 1} of {queue.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-text/5">
          <div className="h-full rounded-full bg-accent transition-all duration-base ease-out" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Done
        </Button>
      </div>

      {item ? (
        <article key={item.id} className="flex flex-col gap-4 rounded-xl bg-raised p-8 shadow-raised animate-slide-up">
          <div className="flex items-baseline gap-2 text-sm text-text-secondary">
            <span className="font-medium text-text">{displayName(counterpart(item))}</span>
            <span className="text-text-tertiary">{when(item)}</span>
          </div>
          <h2 className="text-xl font-semibold text-text">{item.subject}</h2>
          <p className="text-md text-text-secondary">{item.verdict.summary || item.snippet}</p>
          <div className="flex flex-wrap gap-1">
            <Pill tone={needsYou ? 'accent' : 'neutral'}>{LANES[item.verdict.lane].label}</Pill>
            {item.verdict.due ? <Pill tone="warning">{dueLabel(item.verdict.due)}</Pill> : null}
            {item.verdict.reasons.slice(0, 2).map((reason) => (
              <Pill key={reason}>{reason}</Pill>
            ))}
          </div>
          {item.verdict.task && !item.taskPath ? (
            <p className="text-sm text-text-tertiary">
              Task: <span className="text-text-secondary">{item.verdict.task.title}</span>
            </p>
          ) : null}
        </article>
      ) : null}

      <div role="group" aria-label="Deal with this email" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        <Action icon={Archive} label="Done" shortcut="e" variant="primary" onClick={actions.e} />
        <Action icon={CheckCircle2} label="Task" shortcut="t" onClick={actions.t} />
        <Action icon={Reply} label="Reply" shortcut="r" onClick={actions.r} />
        <Action icon={Eye} label="Just FYI" shortcut="f" onClick={actions.f} />
        <Action icon={AlarmClock} label="Tomorrow" shortcut="s" onClick={actions.s} />
        <Action icon={BellOff} label="Mute" shortcut="m" variant="ghost" onClick={actions.m} />
        <Action icon={ArrowRight} label="Skip" shortcut="right" variant="ghost" onClick={actions.ArrowRight} />
      </div>
    </div>
  );
}
