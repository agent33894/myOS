import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ExternalLink, KeyRound } from 'lucide-react';
import { PROVIDERS, providerFor } from '@shared/mail/config';
import type { MailProvider } from '@shared/mail/types';
import { addMailAccount } from '../../data/mail';
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
  SegmentedControl,
} from '../../ui';
import { openLink } from './actions';

const HELP: Record<MailProvider, ReactNode> = {
  icloud: 'At account.apple.com, open Sign-In and Security → App-Specific Passwords and create one named myOS.',
  gmail: 'Turn on 2-Step Verification for your Google account, then create an app password named myOS.',
  imap: 'Use the app password or mail password your provider gives mail apps, and its IMAP and SMTP servers.',
};

/** "imap.example.com" or "imap.example.com:1143". */
function server(text: string, port: number) {
  const [host, custom] = text.trim().split(':');
  return { host, port: Number(custom) || port };
}

const PROVIDER_OPTIONS = (['icloud', 'gmail', 'imap'] as const).map((value) => ({ value, label: PROVIDERS[value].label }));

/** Connect a mailbox with an app-specific password. It is checked with the server before it is kept. */
export function AddAccountDialog({ trigger }: { trigger: (open: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<MailProvider>('icloud');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setAddress('');
    setPassword('');
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const account = await addMailAccount({
        provider,
        address,
        name,
        password,
        ...(provider === 'imap' ? { imap: server(imapHost, 993), smtp: server(smtpHost, 465) } : {}),
      });
      toast.success(`Connected ${account.address}. myOS is having a first look.`);
      setOpen(false);
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect that account.');
    } finally {
      setBusy(false);
    }
  };

  const help = PROVIDERS[provider].passwordHelp;
  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : setOpen(next))}>
      {trigger(() => setOpen(true))}
      <DialogContent size="md">
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Connect a mail account</DialogTitle>
            <DialogDescription>
              myOS signs in with an app password, keeps it encrypted by your system keychain, and talks only to your mail provider.
            </DialogDescription>
          </DialogHeader>
          <SegmentedControl aria-label="Provider" options={PROVIDER_OPTIONS} value={provider} onValueChange={setProvider} />
          <Field label="Email address">
            <Input
              type="email"
              autoFocus
              required
              placeholder={provider === 'gmail' ? 'you@gmail.com' : 'you@me.com'}
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                const guess = providerFor(event.target.value);
                if (guess !== 'imap') setProvider(guess);
              }}
            />
          </Field>
          <Field label="Your name" hint="Shown on replies you send.">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jamie Appleseed" />
          </Field>
          <Field label="App password" hint={HELP[provider]} error={error ?? undefined}>
            <Input type="password" icon={KeyRound} required autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" />
          </Field>
          {provider === 'imap' ? (
            <div className="flex gap-3">
              <Field label="Incoming (IMAP) server" className="flex-1">
                <Input required value={imapHost} onChange={(event) => setImapHost(event.target.value)} placeholder="imap.example.com" />
              </Field>
              <Field label="Outgoing (SMTP) server" className="flex-1">
                <Input required value={smtpHost} onChange={(event) => setSmtpHost(event.target.value)} placeholder="smtp.example.com" />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            {help ? (
              <Button variant="ghost" leadingIcon={ExternalLink} className="mr-auto" onClick={() => openLink(help)}>
                Create an app password
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button disabled={busy}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={busy}>
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
