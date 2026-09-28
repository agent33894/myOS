import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  ArrowUpRight,
  AtSign,
  BellOff,
  CheckCircle2,
  Archive,
  ExternalLink,
  FolderInput,
  MailX,
  MoreHorizontal,
  Reply,
  Star,
} from 'lucide-react';
import type { MailItem, MailLane } from '@shared/mail/types';
import { LANES } from '@shared/mail/config';
import { toItemUrl, toMailUrl } from '../../app/navigation';
import { useArtifact } from '../../data/selectors';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuTrigger,
  Pill,
  cn,
} from '../../ui';
import { alwaysShow, done, makeTask, moveToLane, mute, openLink, snooze, snoozeTimes } from './actions';
import { counterpart, displayName, dueLabel, when } from './format';
import { dueTone } from '../tasks/dates';

const hoverOnly = 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 data-[state=open]:opacity-100';
const MOVE_TO: MailLane[] = ['action', 'reply', 'fyi', 'handled'];

/** The row's menu, shared by ⋯ and right-click. */
export function MailMenuItems({ item, onOpen }: { item: MailItem; onOpen?: () => void }) {
  const navigate = useNavigate();
  const task = useArtifact(item.taskPath);
  const waiting = item.verdict.lane === 'waiting';
  return (
    <>
      {onOpen ? (
        <MenuItem icon={ArrowUpRight} onSelect={onOpen}>
          Open
        </MenuItem>
      ) : null}
      {item.webLink ? (
        <MenuItem icon={ExternalLink} onSelect={() => openLink(item.webLink!)}>
          Open in Gmail
        </MenuItem>
      ) : null}
      <MenuSeparator />
      <MenuItem icon={Archive} shortcut="e" onSelect={() => done([item])}>
        Done
      </MenuItem>
      {task ? (
        <MenuItem icon={CheckCircle2} onSelect={() => navigate(toItemUrl(task))}>
          Open the task
        </MenuItem>
      ) : (
        <MenuItem icon={CheckCircle2} shortcut="t" onSelect={() => makeTask(item)}>
          Make task
        </MenuItem>
      )}
      <MenuItem icon={Reply} shortcut="r" onSelect={() => navigate(toMailUrl({ id: item.id, reply: true }))}>
        {waiting ? 'Write a follow-up' : 'Reply'}
      </MenuItem>
      <MenuSub label="Snooze" icon={AlarmClock}>
        {snoozeTimes().map((choice) => (
          <MenuItem key={choice.label} onSelect={() => snooze([item], choice.until, choice.label)}>
            {choice.label}
          </MenuItem>
        ))}
      </MenuSub>
      {waiting ? null : (
        <>
          <MenuSub label="Move to" icon={FolderInput}>
            {MOVE_TO.filter((lane) => lane !== item.verdict.lane).map((lane) => (
              <MenuItem key={lane} onSelect={() => moveToLane([item], lane)}>
                {LANES[lane].label}
              </MenuItem>
            ))}
            <MenuSeparator />
            {MOVE_TO.filter((lane) => lane !== item.verdict.lane).map((lane) => (
              <MenuItem key={`always-${lane}`} onSelect={() => moveToLane([item], lane, 'sender')}>
                Always {LANES[lane].label.toLowerCase()} from {displayName(item.from).split(' ')[0]}
              </MenuItem>
            ))}
          </MenuSub>
          <MenuSeparator />
          <MenuItem icon={Star} onSelect={() => alwaysShow(item, 'sender')}>
            Always show {displayName(item.from).split(' ')[0]}
          </MenuItem>
          <MenuItem icon={BellOff} onSelect={() => mute(item, 'sender')}>
            Mute {displayName(item.from).split(' ')[0]}
          </MenuItem>
          {item.unsubscribe ? (
            <MenuItem icon={MailX} onSelect={() => openLink(item.unsubscribe!)}>
              Unsubscribe…
            </MenuItem>
          ) : null}
        </>
      )}
    </>
  );
}

interface MailRowProps {
  item: MailItem;
  /** Show which account it came to (more than one connected). */
  showAccount?: boolean;
}

/** One email: who, what, why, and quick ways to deal with it. */
export function MailRow({ item, showAccount = false }: MailRowProps) {
  const navigate = useNavigate();
  const open = () => navigate(toMailUrl({ id: item.id }));
  const who = counterpart(item);
  const waiting = item.verdict.lane === 'waiting';
  const due = item.verdict.due;
  const tone = due ? dueTone(due) : null;

  const menu = <MailMenuItems item={item} onOpen={open} />;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="listitem"
          tabIndex={0}
          aria-label={`${displayName(who)}: ${item.subject}`}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey) return;
            const action: Record<string, () => void> = {
              Enter: open,
              e: () => done([item]),
              t: () => makeTask(item),
              r: () => navigate(toMailUrl({ id: item.id, reply: true })),
            };
            const run = action[event.key];
            if (!run) return;
            event.preventDefault();
            run();
          }}
          className="group/row flex items-start gap-3 rounded-md py-2 pl-2 pr-1 outline-none transition-colors duration-fast hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-text/5"
        >
          <span aria-hidden="true" className="mt-2 flex size-2 shrink-0 items-center justify-center">
            {item.unread && !waiting ? <span className="size-2 rounded-full bg-accent" /> : null}
          </span>
          <div className="min-w-0 flex-1 cursor-default" onClick={open}>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className={cn('shrink-0 truncate text-base text-text', item.unread && !waiting && 'font-semibold')}>
                {waiting ? `To ${displayName(who)}` : displayName(who)}
              </span>
              <span className="min-w-0 truncate text-base text-text-secondary">{item.subject}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-text-tertiary">
              {waiting ? item.verdict.reasons[0] : item.verdict.summary || item.snippet}
            </p>
            {due || item.verdict.priority === 'high' || item.taskPath || showAccount ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {item.verdict.priority === 'high' ? <Pill tone="accent">Important</Pill> : null}
                {due ? <Pill tone={tone === 'overdue' ? 'danger' : tone === 'today' ? 'warning' : 'neutral'}>{dueLabel(due)}</Pill> : null}
                {item.taskPath ? <Pill icon={CheckCircle2}>Task made</Pill> : null}
                {showAccount ? <Pill icon={AtSign}>{item.accountId.split('@')[1]}</Pill> : null}
              </div>
            ) : null}
          </div>
          <div className="relative -my-1 flex shrink-0 items-center">
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center whitespace-nowrap text-xs text-text-tertiary transition-opacity duration-fast group-hover/row:opacity-0 group-focus-within/row:opacity-0 group-data-[state=open]/row:opacity-0">
              {when(item)}
            </span>
            <IconButton icon={Archive} label="Done" shortcut="e" size="sm" tabIndex={-1} onClick={() => done([item])} className={hoverOnly} />
            {item.taskPath ? null : (
              <IconButton icon={CheckCircle2} label="Make task" shortcut="t" size="sm" tabIndex={-1} onClick={() => makeTask(item)} className={hoverOnly} />
            )}
            <Menu>
              <MenuTrigger asChild>
                <IconButton icon={MoreHorizontal} label="More" size="sm" tabIndex={-1} className={hoverOnly} />
              </MenuTrigger>
              <MenuContent align="end">{menu}</MenuContent>
            </Menu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  );
}
