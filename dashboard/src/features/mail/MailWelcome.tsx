import type { LucideIcon } from 'lucide-react';
import { Eye, Mail, Plus, Send, ShieldCheck, Undo2 } from 'lucide-react';
import { Button, Icon } from '../../ui';
import { AddAccountDialog } from './AddAccountDialog';

const PROMISES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Send, title: 'Nothing is sent without your OK', body: 'Replies wait in your Outbox until you read them and press Send.' },
  { icon: Undo2, title: 'Nothing is deleted', body: 'Filing only moves mail, and every move can be put back.' },
  { icon: Eye, title: 'It starts by watching', body: 'See what myOS would file before you let it sort for you.' },
  { icon: ShieldCheck, title: 'Your mail stays yours', body: 'myOS talks only to your mail provider. No servers in between.' },
];

/** Before any account is connected: what Mail does, and what it will never do. */
export function MailWelcome() {
  return (
    <div className="flex flex-col items-center gap-10 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
          <Icon icon={Mail} size="lg" />
        </span>
        <h2 className="text-balance text-lg font-semibold text-text">Let myOS keep an eye on your mail</h2>
        <p className="max-w-md text-balance text-base text-text-secondary">
          It reads what arrives, shows you only what needs an action, a reply, or a glance, files the rest, and turns mail into tasks.
        </p>
        <AddAccountDialog
          trigger={(open) => (
            <Button variant="primary" leadingIcon={Plus} className="mt-2" onClick={open}>
              Connect iCloud or Gmail
            </Button>
          )}
        />
      </div>
      <ul className="grid w-full max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {PROMISES.map((promise) => (
          <li key={promise.title} className="flex gap-3 rounded-lg bg-raised p-4 shadow-raised">
            <span className="mt-0.5 text-accent-text">
              <Icon icon={promise.icon} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-medium text-text">{promise.title}</span>
              <span className="text-sm text-text-secondary">{promise.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
