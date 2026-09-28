import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PenLine, Send, Sparkles, Trash2 } from 'lucide-react';
import type { MailAddress, MailDraft, MailItem } from '@shared/mail/types';
import { composeReply, discardMailDraft, saveMailDraft, sendApprovedDraft, useMail } from '../../data/mail';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Pill,
  Textarea,
} from '../../ui';
import { displayName } from './format';

const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);

const formatAddresses = (list: MailAddress[]) => list.map((entry) => (entry.name ? `${entry.name} <${entry.address}>` : entry.address)).join(', ');

function parseAddresses(text: string): MailAddress[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)<([^>]+)>$/);
      return match ? { ...(match[1].trim() ? { name: match[1].trim().replace(/^"|"$/g, '') } : {}), address: match[2].trim() } : { address: part };
    });
}

/**
 * Start a reply: write it yourself, or have the assistant draft it. Either
 * way it is a draft in the Outbox until you press Send and confirm.
 */
export function StartReply({ item, autoFocus = false }: { item: MailItem; autoFocus?: boolean }) {
  const snapshot = useMail();
  const assistant = snapshot?.config.assistant.enabled && snapshot.config.assistant.command;
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState<'blank' | 'assistant' | null>(null);
  const waiting = item.verdict.lane === 'waiting';

  const start = (withAssistant: boolean) => {
    setBusy(withAssistant ? 'assistant' : 'blank');
    composeReply(item.id, { assistant: withAssistant, instruction: instruction.trim() || undefined })
      .catch(failed('Could not start the reply'))
      .finally(() => setBusy(null));
  };

  return (
    <section aria-label="Reply" className="flex flex-col gap-3 rounded-lg bg-raised p-4 shadow-raised">
      <h2 className="text-sm font-medium text-text-secondary">{waiting ? 'Follow up' : 'Reply'}</h2>
      {assistant ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            start(true);
          }}
        >
          <Input
            autoFocus={autoFocus}
            aria-label="How to reply"
            placeholder={waiting ? 'A gentle nudge, or say what to ask again' : 'How to reply, e.g. “yes to Saturday, suggest noon”'}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <Button type="submit" variant="primary" leadingIcon={Sparkles} loading={busy === 'assistant'} disabled={busy !== null}>
            Draft it
          </Button>
        </form>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant={assistant ? 'ghost' : 'primary'} leadingIcon={PenLine} loading={busy === 'blank'} disabled={busy !== null} onClick={() => start(false)}>
          Write it myself
        </Button>
        {assistant ? null : (
          <span className="text-sm text-text-tertiary">Set up an assistant in Settings → Mail to have replies drafted for you.</span>
        )}
      </div>
    </section>
  );
}

/** A draft under review. Nothing leaves until Send is confirmed. */
export function DraftEditor({ draft, item }: { draft: MailDraft; item?: MailItem }) {
  const snapshot = useMail();
  const account = snapshot?.accounts.find((candidate) => candidate.id === draft.accountId);
  const assistant = snapshot?.config.assistant.enabled && snapshot.config.assistant.command;
  const [to, setTo] = useState(() => formatAddresses(draft.to));
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [instruction, setInstruction] = useState(draft.instruction ?? '');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [redrafting, setRedrafting] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // A redraft (or a change from another window) replaces what is shown.
  useEffect(() => {
    setTo(formatAddresses(draft.to));
    setSubject(draft.subject);
    setBody(draft.body);
  }, [draft.createdAt]);

  const current = (): MailDraft => ({ ...draft, to: parseAddresses(to), subject, body });
  const save = () => saveMailDraft(current()).catch(failed('Could not save the draft'));
  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void save(), 800);
  };
  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  const redraft = () => {
    if (!item) return;
    setRedrafting(true);
    composeReply(item.id, { assistant: true, instruction: instruction.trim() || undefined })
      .catch(failed('Could not redraft'))
      .finally(() => setRedrafting(false));
  };

  const send = async () => {
    setSending(true);
    try {
      await saveMailDraft(current());
      await sendApprovedDraft(draft.id);
      setConfirming(false);
      toast.success(`Sent to ${parseAddresses(to).map((entry) => displayName(entry)).join(', ')}`);
    } catch (error) {
      failed('The email was not sent')(error);
    } finally {
      setSending(false);
    }
  };

  const recipients = parseAddresses(to);
  const ready = recipients.length > 0 && body.trim().length > 0;

  return (
    <section aria-label="Draft" className="flex flex-col gap-4 rounded-lg bg-raised p-4 shadow-raised">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-text-secondary">Draft for your review</h2>
        {draft.source === 'assistant' ? <Pill icon={Sparkles}>Drafted for you</Pill> : null}
        {draft.status === 'failed' ? <Pill tone="danger">Not sent</Pill> : null}
      </div>
      {draft.error ? <p className="text-sm text-danger">{draft.error}</p> : null}
      <Field label="To">
        <Input value={to} onChange={(event) => { setTo(event.target.value); scheduleSave(); }} />
      </Field>
      <Field label="Subject">
        <Input value={subject} onChange={(event) => { setSubject(event.target.value); scheduleSave(); }} />
      </Field>
      <Field label="Message" hint={item && item.verdict.lane !== 'waiting' ? 'Their message is quoted below yours when it is sent.' : undefined}>
        <Textarea
          autosize
          className="min-h-40 text-md"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            scheduleSave();
          }}
        />
      </Field>
      {assistant && item ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            redraft();
          }}
        >
          <Input aria-label="What to change" placeholder="What to change, e.g. “shorter, and warmer”" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          <Button type="submit" leadingIcon={Sparkles} loading={redrafting}>
            Redraft
          </Button>
        </form>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          leadingIcon={Trash2}
          onClick={() => discardMailDraft(draft.id).then(() => toast('Draft discarded')).catch(failed('Could not discard the draft'))}
        >
          Discard
        </Button>
        <Button className="ml-auto" onClick={() => void save().then(() => toast.success('Saved to your Outbox'))}>
          Save for later
        </Button>
        <Button variant="primary" leadingIcon={Send} disabled={!ready} onClick={() => setConfirming(true)}>
          Send…
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={(open) => (sending ? undefined : setConfirming(open))}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Send this email?</DialogTitle>
            <DialogDescription>
              It goes out from {account?.address ?? 'your account'} as soon as you press Send. myOS never sends anything without this step.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col gap-1 text-base">
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-text-tertiary">To</dt>
              <dd className="min-w-0 truncate text-text">{recipients.map((entry) => entry.address).join(', ')}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-16 shrink-0 text-text-tertiary">Subject</dt>
              <dd className="min-w-0 truncate text-text">{subject}</dd>
            </div>
          </dl>
          <p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md bg-sunken p-3 text-base text-text">{body}</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={sending}>Keep editing</Button>
            </DialogClose>
            <Button variant="primary" leadingIcon={Send} loading={sending} onClick={() => void send()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
