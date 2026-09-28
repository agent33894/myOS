import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  MailX,
  MoreHorizontal,
  Paperclip,
  Reply,
  ScanEye,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import { CATEGORIES, LANES } from '@shared/mail/config';
import { laneItems } from '@shared/mail/select';
import type { MailBody, MailItem, MailLane } from '@shared/mail/types';
import { toItemUrl, toMailUrl, toSettingsUrl } from '../../app/navigation';
import { readMailBody, useMail } from '../../data/mail';
import { useArtifact, useProjects } from '../../data/selectors';
import { Button, Icon, IconButton, Kbd, LoadingState, Menu, MenuContent, MenuTrigger, Pill, cn } from '../../ui';
import { dayLabel } from '../tasks/dates';
import { done, makeTask, moveToLane, openLink } from './actions';
import { DraftEditor, StartReply } from './Composer';
import { counterpart, displayName, dueLabel } from './format';
import { MailMenuItems } from './MailRow';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

const LINK = /(https?:\/\/[^\s<>()"'\]]+)/g;

/** Message text with its links opening in the browser; never HTML, never remote images. */
function MessageText({ text }: { text: string }) {
  const parts = text.split(LINK);
  return (
    <div className="whitespace-pre-wrap break-words text-md text-text">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            onClick={(event) => {
              event.preventDefault();
              openLink(part.replace(/[.,;:!?]+$/, ''));
            }}
            className="text-accent-text underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            {part.length > 60 ? `${part.slice(0, 57)}…` : part}
          </a>
        ) : (
          part
        ),
      )}
    </div>
  );
}

const SOURCE: Record<MailItem['verdict']['source'], { label: string; icon: typeof Bot }> = {
  rule: { label: 'Your rule', icon: SlidersHorizontal },
  assistant: { label: 'Your assistant', icon: Bot },
  heuristic: { label: 'myOS', icon: ScanEye },
  you: { label: 'You', icon: User },
};

const LANE_CHOICES: MailLane[] = ['action', 'reply', 'fyi', 'handled'];

function WhyCard({ item }: { item: MailItem }) {
  const navigate = useNavigate();
  const { verdict } = item;
  const source = SOURCE[verdict.source];
  const waiting = verdict.lane === 'waiting';
  return (
    <section aria-label="Why it’s here" className="flex flex-col gap-3 rounded-lg bg-raised p-4 shadow-raised">
      <p className="text-md text-text">{verdict.summary || item.snippet}</p>
      <div className="flex flex-wrap items-center gap-1">
        <Pill tone={verdict.lane === 'action' || verdict.lane === 'reply' ? 'accent' : 'neutral'}>{LANES[verdict.lane].label}</Pill>
        {verdict.priority === 'high' ? <Pill tone="accent">Important</Pill> : null}
        {verdict.due ? <Pill tone="warning">{dueLabel(verdict.due)}</Pill> : null}
        <Pill>{CATEGORIES[verdict.category].label}</Pill>
        {verdict.reasons.map((reason) => (
          <Pill key={reason}>{reason}</Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <Icon icon={source.icon} size="sm" />
          Decided by {source.label === 'myOS' ? 'myOS' : source.label.toLowerCase()}
        </span>
        {waiting ? null : (
          <>
            <span aria-hidden="true">·</span>
            <span>Not right?</span>
            {LANE_CHOICES.filter((lane) => lane !== verdict.lane).map((lane) => (
              <Button key={lane} variant="ghost" size="sm" onClick={() => moveToLane([item], lane, 'sender')}>
                {LANES[lane].label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" leadingIcon={SlidersHorizontal} onClick={() => navigate(toSettingsUrl('mail'))}>
              Rules
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function Suggested({ item }: { item: MailItem }) {
  const navigate = useNavigate();
  const task = useArtifact(item.taskPath);
  const projects = useProjects();
  const snapshot = useMail();
  const suggestion = item.verdict.task;
  if (snapshot?.config.tasks === 'off' && !task) return null;
  if (task) {
    return (
      <Button variant="secondary" leadingIcon={CheckCircle2} onClick={() => navigate(toItemUrl(task))} className="self-start">
        Open the task · {task.title}
      </Button>
    );
  }
  if (!suggestion) return null;
  const project = suggestion.project ? projects.find((candidate) => candidate.id === suggestion.project) : undefined;
  const detail = [item.verdict.due ? dueLabel(item.verdict.due).toLowerCase() : null, project ? `in ${project.title}` : null].filter(Boolean).join(' · ');
  return (
    <Button variant="secondary" leadingIcon={CheckCircle2} onClick={() => makeTask(item)} className="h-auto min-h-8 justify-start self-start whitespace-normal py-1.5 text-left">
      <span>
        Make task “{suggestion.title}”{detail ? <span className="text-text-tertiary"> · {detail}</span> : null}
      </span>
      <Kbd shortcut="t" />
    </Button>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="w-12 shrink-0 text-text-tertiary">{label}</span>
      <span className="min-w-0 truncate text-text-secondary">{children}</span>
    </div>
  );
}

/** One email in full: why it is here, what to do about it, the text, and the reply. */
export function MailReader({ item, replyOpen }: { item: MailItem; replyOpen: boolean }) {
  const navigate = useNavigate();
  const snapshot = useMail();
  const [body, setBody] = useState<MailBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = snapshot?.drafts.find((candidate) => candidate.itemId === item.id && candidate.status !== 'sent');
  const waiting = item.verdict.lane === 'waiting';
  const who = counterpart(item);

  useEffect(() => {
    setBody(null);
    setError(null);
    readMailBody(item.id).then(setBody, (cause: Error) => setError(cause.message));
  }, [item.id]);

  // After Done, the next email in the same place opens.
  const siblings = useMemo(
    () => (snapshot ? laneItems(snapshot.items, item.verdict.lane === 'action' || item.verdict.lane === 'reply' ? ['action', 'reply'] : [item.verdict.lane]) : []),
    [snapshot, item.verdict.lane],
  );
  // Opened from a notification there is nothing to go back to.
  const back = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate(toMailUrl()));
  const finish = () => {
    const index = siblings.findIndex((candidate) => candidate.id === item.id);
    const next = siblings[index + 1] ?? siblings[index - 1];
    done([item]);
    navigate(next && next.id !== item.id ? toMailUrl({ id: next.id }) : toMailUrl(), { replace: true });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      const action: Record<string, () => void> = {
        Escape: back,
        e: finish,
        t: () => (item.taskPath ? undefined : makeTask(item)),
        r: () => navigate(toMailUrl({ id: item.id, reply: true }), { replace: true }),
      };
      const run = action[event.key];
      if (!run) return;
      event.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const account = snapshot?.accounts.find((candidate) => candidate.id === item.accountId);
  const mine = new Set((snapshot?.accounts ?? []).flatMap((candidate) => [candidate.address, ...candidate.aliases]));
  const date = new Date(item.date);

  return (
    <article className="flex animate-fade-in flex-col gap-6">
      <div className="-ml-2 flex items-center gap-1">
        <Button variant="ghost" leadingIcon={ArrowLeft} onClick={back}>
          Mail
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {item.webLink ? <IconButton icon={ExternalLink} label="Open in Gmail" onClick={() => openLink(item.webLink!)} /> : null}
          {item.unsubscribe ? <IconButton icon={MailX} label="Unsubscribe…" onClick={() => openLink(item.unsubscribe!)} /> : null}
          <Menu>
            <MenuTrigger asChild>
              <IconButton icon={MoreHorizontal} label="More" />
            </MenuTrigger>
            <MenuContent align="end">
              <MailMenuItems item={item} />
            </MenuContent>
          </Menu>
        </div>
      </div>

      <header className="flex flex-col gap-3 px-2">
        <h1 className="text-xl font-semibold text-text">{item.subject}</h1>
        <div className="flex flex-col gap-0.5 text-sm">
          <Meta label={waiting ? 'You' : 'From'}>
            {waiting ? `wrote to ${displayName(who)}` : `${displayName(item.from)} <${item.from.address}>`}
          </Meta>
          <Meta label="To">
            {item.to.map((to) => (mine.has(to.address) ? 'you' : displayName(to))).join(', ') || '—'}
            {item.cc.some((cc) => mine.has(cc.address)) ? ' · you were copied' : ''}
          </Meta>
          <Meta label="When">
            {dayLabel(item.date.slice(0, 10))}, {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {account && (snapshot?.accounts.length ?? 0) > 1 ? ` · ${account.address}` : ''}
          </Meta>
        </div>
      </header>

      <WhyCard item={item} />

      <div className="flex flex-wrap items-center gap-2 px-2">
        <Suggested item={item} />
        <Button leadingIcon={Archive} onClick={finish}>
          Done <Kbd shortcut="e" />
        </Button>
        {draft || replyOpen ? null : (
          <Button leadingIcon={Reply} onClick={() => navigate(toMailUrl({ id: item.id, reply: true }), { replace: true })}>
            {waiting ? 'Follow up' : 'Reply'} <Kbd shortcut="r" />
          </Button>
        )}
      </div>

      {draft ? <DraftEditor key={draft.id} draft={draft} item={item} /> : replyOpen ? <StartReply item={item} autoFocus /> : null}

      <section aria-label="Email text" className={cn('flex flex-col gap-4 px-2', waiting && 'opacity-90')}>
        {error ? (
          <p className="text-sm text-text-secondary">{error}</p>
        ) : body === null ? (
          <LoadingState rows={6} />
        ) : body.text ? (
          <MessageText text={body.text} />
        ) : (
          <p className="text-sm text-text-tertiary">This email has no text to show.</p>
        )}
        {item.attachments.length ? (
          <div className="flex flex-wrap gap-1">
            {item.attachments.map((name) => (
              <Pill key={name} icon={Paperclip}>
                {name}
              </Pill>
            ))}
          </div>
        ) : null}
      </section>
    </article>
  );
}
