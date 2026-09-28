import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, Eye, Hourglass, ListChecks, MailQuestion, RefreshCw, Send, Settings2, Sparkles } from 'lucide-react';
import type { MailDraft, MailItem, MailSnapshot } from '@shared/mail/types';
import { toMailUrl, toSettingsUrl, type MailView } from '../../app/navigation';
import { checkMail, useMail, useMailSync } from '../../data/mail';
import { Button, EmptyState, Icon, IconButton, LoadingState, PageHeader, PageLayout, Pill, SectionHeader, SegmentedControl } from '../../ui';
import { relativeTime } from '../tasks/dates';
import { GoThrough } from './GoThrough';
import { Handled } from './Handled';
import { MailReader } from './MailReader';
import { MailRow } from './MailRow';
import { MailWelcome } from './MailWelcome';
import { briefing, checkedLabel, displayName, views } from './format';

const VIEWS: MailView[] = ['needs', 'fyi', 'waiting', 'handled', 'outbox'];
const isView = (value: string | null): value is MailView => VIEWS.includes(value as MailView);

function Rows({ items, label, multiAccount }: { items: MailItem[]; label: string; multiAccount: boolean }) {
  return (
    <div role="list" aria-label={label} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <MailRow key={item.id} item={item} showAccount={multiAccount} />
      ))}
    </div>
  );
}

function Outbox({ drafts, snapshot }: { drafts: MailDraft[]; snapshot: MailSnapshot }) {
  const navigate = useNavigate();
  if (drafts.length === 0) {
    return <EmptyState icon={Send} title="No drafts waiting." description="Replies you start, or have drafted for you, wait here until you send them." className="py-16" />;
  }
  return (
    <div role="list" aria-label="Drafts" className="flex flex-col gap-0.5">
      {drafts.map((draft) => {
        const item = snapshot.items.find((candidate) => candidate.id === draft.itemId);
        return (
          <div
            key={draft.id}
            role="listitem"
            tabIndex={0}
            onClick={() => item && navigate(toMailUrl({ id: item.id }))}
            onKeyDown={(event) => event.key === 'Enter' && item && navigate(toMailUrl({ id: item.id }))}
            className="flex cursor-default flex-col gap-0.5 rounded-md px-2 py-2 outline-none hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base text-text">To {draft.to.map((to) => displayName(to)).join(', ') || 'nobody yet'}</span>
              <span className="truncate text-base text-text-secondary">{draft.subject}</span>
              {draft.source === 'assistant' ? <Pill icon={Sparkles}>Drafted for you</Pill> : null}
              {draft.status === 'failed' ? <Pill tone="danger">Not sent</Pill> : null}
              <span className="ml-auto shrink-0 text-xs text-text-tertiary">{relativeTime(draft.createdAt)}</span>
            </div>
            <p className="truncate text-sm text-text-tertiary">{draft.body.trim().split('\n')[0] || 'Empty draft'}</p>
          </div>
        );
      })}
    </div>
  );
}

function StatusLine({ snapshot }: { snapshot: MailSnapshot }) {
  const navigate = useNavigate();
  const failing = snapshot.accounts.filter((account) => account.status === 'error');
  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-tertiary">
        <span>{snapshot.accounts.filter((account) => account.enabled).map((account) => account.address).join(' · ')}</span>
        <span aria-hidden="true">·</span>
        <span>{checkedLabel(snapshot)}</span>
        <Pill tone={snapshot.config.automation === 'sort' ? 'accent' : 'neutral'} icon={snapshot.config.automation === 'sort' ? Sparkles : Eye}>
          {snapshot.config.automation === 'sort' ? 'Sorting for you' : 'Watching only'}
        </Pill>
        {snapshot.config.assistant.enabled ? <Pill icon={Sparkles}>Assistant on</Pill> : null}
      </div>
      {failing.map((account) => (
        <div key={account.id} role="alert" className="flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <Icon icon={AlertCircle} size="sm" />
          <span className="min-w-0 flex-1">
            {account.address}: {account.error}
          </span>
          <Button size="sm" variant="ghost" onClick={() => navigate(toSettingsUrl('mail'))}>
            Fix
          </Button>
        </div>
      ))}
      {snapshot.status.error && !failing.length ? <p className="text-sm text-warning">{snapshot.status.error}</p> : null}
    </div>
  );
}

/**
 * Mail: what needs an action or a reply, what is worth a glance, what you are
 * waiting on, what myOS handled (with undo), and drafts awaiting your OK.
 */
export default function MailPage() {
  useMailSync();
  const snapshot = useMail();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('view');
  const view: MailView = isView(requested) ? requested : 'needs';
  const id = params.get('id');

  if (!snapshot) return <PageLayout><LoadingState rows={6} /></PageLayout>;

  if (params.get('go') === '1') {
    return (
      <div className="scrollbar-stable h-full overflow-y-auto bg-canvas">
        <GoThrough onExit={() => navigate(toMailUrl(), { replace: true })} />
      </div>
    );
  }

  if (id) {
    const item = snapshot.items.find((candidate) => candidate.id === id);
    return (
      <PageLayout className="gap-6">
        {item ? (
          <MailReader key={item.id} item={item} replyOpen={params.get('reply') === '1'} />
        ) : (
          <EmptyState
            icon={MailQuestion}
            title="That email is no longer here."
            description="It was dealt with, or it left the inbox in another app."
            action={<Button onClick={() => navigate(toMailUrl())}>Back to mail</Button>}
            className="py-16"
          />
        )}
      </PageLayout>
    );
  }

  if (snapshot.accounts.length === 0) {
    return (
      <PageLayout className="gap-6">
        <PageHeader title="Mail" className="px-2" />
        <MailWelcome />
      </PageLayout>
    );
  }

  const lists = views(snapshot);
  const action = lists.needs.filter((item) => item.verdict.lane === 'action');
  const reply = lists.needs.filter((item) => item.verdict.lane === 'reply');
  const multiAccount = snapshot.accounts.length > 1;
  const count = (value: number) => (value ? ` ${value}` : '');
  const options = [
    { value: 'needs', label: `Needs you${count(lists.needs.length)}` },
    { value: 'fyi', label: `FYI${count(lists.fyi.length)}` },
    { value: 'waiting', label: `Waiting${count(lists.waiting.length)}` },
    { value: 'handled', label: 'Handled' },
    { value: 'outbox', label: `Outbox${count(lists.outbox.length)}` },
  ] as const;
  const check = () =>
    checkMail()
      .then((status) => toast(status.lastSummary ?? 'Checked'))
      .catch((error: Error) => toast.error(error.message));

  return (
    <PageLayout className="gap-6">
      <PageHeader
        title="Mail"
        subtitle={briefing(snapshot)}
        actions={
          <>
            <IconButton icon={RefreshCw} label="Check now" loading={snapshot.status.running} onClick={() => void check()} />
            <IconButton icon={Settings2} label="Mail settings" onClick={() => navigate(toSettingsUrl('mail'))} />
            {lists.needs.length + lists.fyi.length > 0 ? (
              <Button variant="primary" leadingIcon={ListChecks} onClick={() => navigate(toMailUrl({ go: true }))}>
                Go through
              </Button>
            ) : null}
          </>
        }
        className="px-2"
      />
      <StatusLine snapshot={snapshot} />
      <SegmentedControl
        aria-label="Mail view"
        className="self-start"
        options={options}
        value={view}
        onValueChange={(next) => navigate(toMailUrl({ view: next }), { replace: true })}
      />

      <div key={view} className="flex animate-fade-in flex-col gap-6">
        {view === 'needs' ? (
          lists.needs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nothing needs you."
              description={lists.fyi.length ? `${lists.fyi.length} ${lists.fyi.length === 1 ? 'email is' : 'emails are'} worth a glance when you have a minute.` : 'myOS is watching and will let you know.'}
              action={lists.fyi.length ? <Button onClick={() => navigate(toMailUrl({ view: 'fyi' }))}>Show FYI</Button> : undefined}
              className="py-16"
            />
          ) : (
            <>
              {action.length ? (
                <section aria-label="Needs action">
                  <SectionHeader title="Needs action" count={action.length} className="px-2" />
                  <Rows items={action} label="Needs action" multiAccount={multiAccount} />
                </section>
              ) : null}
              {reply.length ? (
                <section aria-label="Needs a reply">
                  <SectionHeader title="Needs a reply" count={reply.length} className="px-2" />
                  <Rows items={reply} label="Needs a reply" multiAccount={multiAccount} />
                </section>
              ) : null}
            </>
          )
        ) : null}

        {view === 'fyi' ? (
          lists.fyi.length === 0 ? (
            <EmptyState icon={Eye} title="Nothing to glance at." description="Mail worth knowing about, with nothing to do, shows up here." className="py-16" />
          ) : (
            <Rows items={lists.fyi} label="For your eyes" multiAccount={multiAccount} />
          )
        ) : null}

        {view === 'waiting' ? (
          lists.waiting.length === 0 ? (
            <EmptyState
              icon={Hourglass}
              title="You’re not waiting on anyone."
              description={`When you ask someone something and ${snapshot.config.followUpDays} days pass without an answer, it shows up here.`}
              className="py-16"
            />
          ) : (
            <Rows items={lists.waiting} label="Waiting on others" multiAccount={multiAccount} />
          )
        ) : null}

        {view === 'handled' ? <Handled snapshot={snapshot} toFile={lists.toFile} /> : null}
        {view === 'outbox' ? <Outbox drafts={lists.outbox} snapshot={snapshot} /> : null}
      </div>
    </PageLayout>
  );
}
