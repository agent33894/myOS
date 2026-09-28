import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2, X, Zap } from 'lucide-react';
import { ASSISTANT_PRESETS, PROVIDERS } from '@shared/mail/config';
import type { AssistantTestResult, MailAccount, MailConfig, MailRule } from '@shared/mail/types';
import { removeMailAccount, setMailConfig, testAssistant, updateMailAccount, useMail, useMailSync } from '../../data/mail';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  IconButton,
  Input,
  LoadingState,
  SegmentedControl,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from '../../ui';
import { SettingsGroup, SettingsRow } from '../settings/SettingsGroup';
import { relativeTime } from '../tasks/dates';
import { AddAccountDialog } from './AddAccountDialog';
import { RuleDialog, describeRule } from './RuleDialog';

const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);
const set = (patch: Partial<MailConfig>) => void setMailConfig(patch).catch(failed('Could not save that setting'));

function accountStatus(account: MailAccount): string {
  if (!account.enabled) return 'Paused';
  if (account.status === 'error') return account.error ?? 'Could not check';
  if (account.status === 'syncing') return 'Checking…';
  if (!account.lastSync) return 'Not checked yet';
  return `Checked ${relativeTime(account.lastSync).replace(/^Just now$/, 'just now')}`;
}

function RemoveAccount({ account }: { account: MailAccount }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconButton icon={Trash2} label={`Disconnect ${account.address}`} onClick={() => setOpen(true)} />
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Disconnect {account.address}?</DialogTitle>
          <DialogDescription>
            myOS forgets the password and what it knows about this mailbox. Nothing on the server changes, and tasks you made stay.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant="danger"
            onClick={() =>
              void removeMailAccount(account.id)
                .then(() => {
                  setOpen(false);
                  toast.success('Disconnected');
                })
                .catch(failed('Could not disconnect'))
            }
          >
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A comma-separated list of addresses or @domains, saved when the field loses focus. */
function PeopleList({ label, description, value, onChange }: { label: string; description: string; value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = (event: FormEvent) => {
    event.preventDefault();
    const entries = draft.split(/[,\s]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean);
    if (entries.length) onChange([...new Set([...value, ...entries])]);
    setDraft('');
  };
  return (
    <SettingsRow label={label} description={description}>
      {value.length ? (
        <ul className="flex flex-wrap gap-1">
          {value.map((entry) => (
            <li key={entry} className="flex h-7 items-center gap-1 rounded-md bg-sunken pl-2 pr-0.5 text-sm text-text">
              {entry}
              <IconButton icon={X} size="sm" label={`Remove ${entry}`} onClick={() => onChange(value.filter((item) => item !== entry))} />
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={add} className="flex gap-2">
        <Input aria-label={label} placeholder="name@example.com or @example.com" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <Button type="submit" disabled={!draft.trim()}>
          Add
        </Button>
      </form>
    </SettingsRow>
  );
}

/** Long text that saves on blur, so typing is never interrupted by a round trip. */
function SavedText({ label, value, placeholder, rows, onSave }: { label: string; value: string; placeholder: string; rows: number; onSave: (next: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Textarea
      aria-label={label}
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => text !== value && onSave(text)}
    />
  );
}

function AssistantSettings({ config }: { config: MailConfig }) {
  const [command, setCommand] = useState(config.assistant.command);
  const [result, setResult] = useState<AssistantTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  useEffect(() => setCommand(config.assistant.command), [config.assistant.command]);
  const preset = ASSISTANT_PRESETS.find((candidate) => candidate.command === command)?.id ?? 'custom';
  const save = (next: string) => set({ assistant: { ...config.assistant, command: next } });
  const test = () => {
    setTesting(true);
    setResult(null);
    testAssistant(command)
      .then(setResult, failed('Could not run the assistant'))
      .finally(() => setTesting(false));
  };

  return (
    <SettingsGroup
      title="Assistant"
      description="Optional. myOS sorts mail on its own; an assistant adds summaries, better judgement, and reply drafts. It is a command on your computer that you choose, such as Claude Code or Ollama."
    >
      <SettingsRow
        label="Use an assistant"
        description="The text of new mail is passed to this command. Choose one you trust: a local model keeps everything on this computer; Claude Code or Codex sends it to that provider under your own account."
        control={(id) => <Switch id={id} checked={config.assistant.enabled} onCheckedChange={(enabled) => set({ assistant: { ...config.assistant, enabled } })} />}
      />
      <SettingsRow label="Command" description="Reads a prompt on standard input and prints JSON.">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Select
              aria-label="Preset"
              className="w-48"
              value={preset}
              onValueChange={(id) => {
                const chosen = ASSISTANT_PRESETS.find((candidate) => candidate.id === id);
                if (!chosen) return;
                setCommand(chosen.command);
                save(chosen.command);
              }}
            >
              {ASSISTANT_PRESETS.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </Select>
            <Input
              aria-label="Assistant command"
              className="font-mono text-sm"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onBlur={() => command !== config.assistant.command && save(command)}
            />
            <Button leadingIcon={Zap} loading={testing} disabled={!command.trim()} onClick={test}>
              Test
            </Button>
          </div>
          {result ? (
            <p role="status" className={result.ok ? 'text-sm text-success' : 'text-sm text-danger'}>
              {result.ok ? `Works. It answered in ${(result.ms / 1000).toFixed(1)} seconds.` : `Did not work: ${result.output || 'no answer'}`}
            </p>
          ) : null}
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
}

function Rules({ config }: { config: MailConfig }) {
  const rules = config.rules;
  const save = (next: MailRule[]) => set({ rules: next });
  const move = (index: number, by: number) => {
    const next = [...rules];
    const [rule] = next.splice(index, 1);
    next.splice(index + by, 0, rule);
    save(next);
  };
  return (
    <SettingsGroup title="Rules" description="Your rules come first, top to bottom; the first one that matches decides. Choosing “Always …” on an email adds one here.">
      {rules.length ? (
        rules.map((rule, index) => (
          <SettingsRow
            key={rule.id}
            label={rule.name}
            description={describeRule(rule)}
            control={
              <>
                <IconButton icon={ArrowUp} label="Move up" size="sm" disabled={index === 0} onClick={() => move(index, -1)} />
                <IconButton icon={ArrowDown} label="Move down" size="sm" disabled={index === rules.length - 1} onClick={() => move(index, 1)} />
                <RuleDialog rule={rule} onSave={(next) => save(rules.map((candidate) => (candidate.id === rule.id ? next : candidate)))} trigger={(open) => <Button size="sm" variant="ghost" onClick={open}>Edit</Button>} />
                <IconButton icon={Trash2} label={`Delete ${rule.name}`} size="sm" onClick={() => save(rules.filter((candidate) => candidate.id !== rule.id))} />
                <Switch aria-label={`${rule.name} on`} checked={rule.enabled} onCheckedChange={(enabled) => save(rules.map((candidate) => (candidate.id === rule.id ? { ...candidate, enabled } : candidate)))} />
              </>
            }
          />
        ))
      ) : (
        <SettingsRow label="No rules yet" description="For example: mail from your kids’ school always needs action, or receipts from one shop are archived and marked read." />
      )}
      <div className="px-4 py-3">
        <RuleDialog onSave={(rule) => save([...rules, rule])} trigger={(open) => <Button leadingIcon={Plus} onClick={open}>Add rule</Button>} />
      </div>
    </SettingsGroup>
  );
}

/** Settings → Mail: accounts, how much myOS may do, the assistant, your brief, people, and rules. */
export function MailSettings() {
  useMailSync();
  const snapshot = useMail();
  if (!snapshot) return <LoadingState rows={6} />;
  const { config, accounts } = snapshot;

  return (
    <>
      <SettingsGroup title="Accounts" description="iCloud and Gmail both work with an app-specific password. myOS never sees your main password.">
        {accounts.map((account) => (
          <SettingsRow
            key={account.id}
            label={account.address}
            description={
              <span className={account.status === 'error' ? 'text-danger' : undefined}>
                {PROVIDERS[account.provider].label} · {accountStatus(account)}
              </span>
            }
            control={
              <>
                <Switch aria-label={`Check ${account.address}`} checked={account.enabled} onCheckedChange={(enabled) => void updateMailAccount(account.id, { enabled }).catch(failed('Could not update the account'))} />
                <RemoveAccount account={account} />
              </>
            }
          />
        ))}
        {snapshot.secureStorage ? null : (
          <div className="flex gap-2 px-4 py-3 text-sm text-warning">
            <Icon icon={AlertTriangle} size="sm" className="mt-0.5" />
            No system keyring is available, so app passwords are stored unencrypted in a file only your user can read. Unlock or install a keyring (GNOME Keyring or KWallet), then reconnect the account.
          </div>
        )}
        <div className="px-4 py-3">
          <AddAccountDialog trigger={(open) => <Button leadingIcon={Plus} onClick={open}>Connect an account</Button>} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="What myOS may do">
        <SettingsRow
          label="Handling"
          description={
            config.automation === 'sort'
              ? 'myOS files mail that needs no attention as it arrives. Every move is listed under Handled and can be undone.'
              : 'myOS decides what each email is, but changes nothing in your mailbox. Handled shows what it would file.'
          }
          control={
            <SegmentedControl
              aria-label="Handling"
              options={[
                { value: 'watch', label: 'Watch only' },
                { value: 'sort', label: 'Sort for me' },
              ]}
              value={config.automation}
              onValueChange={(automation) => set({ automation })}
            />
          }
        />
        <SettingsRow
          label="Filing"
          description="Folders show up in every mail app (as labels in Gmail). Archive keeps things plain."
          control={
            <Select aria-label="Filing" className="w-56" value={config.filing} onValueChange={(filing) => set({ filing: filing as MailConfig['filing'] })}>
              <SelectItem value="folders">Into myOS folders by kind</SelectItem>
              <SelectItem value="archive">Archive</SelectItem>
            </Select>
          }
        />
        <SettingsRow
          label="Archive mail I mark done"
          description="Done in myOS takes the email out of your inbox too."
          control={(id) => <Switch id={id} checked={config.archiveOnDone} onCheckedChange={(archiveOnDone) => set({ archiveOnDone })} />}
        />
        <SettingsRow
          label="Tasks from mail"
          description="Suggested puts a one-click task on each email that needs you. Automatic makes it for you."
          control={
            <Select aria-label="Tasks from mail" className="w-44" value={config.tasks} onValueChange={(tasks) => set({ tasks: tasks as MailConfig['tasks'] })}>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="suggest">Suggested</SelectItem>
              <SelectItem value="auto">Automatic</SelectItem>
            </Select>
          }
        />
        <SettingsRow
          label="Check every"
          control={
            <Select aria-label="Check every" className="w-44" value={String(config.interval)} onValueChange={(value) => set({ interval: Number(value) })}>
              {[2, 5, 10, 15, 30, 60].map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {minutes < 60 ? `${minutes} minutes` : 'Hour'}
                </SelectItem>
              ))}
            </Select>
          }
        />
        <SettingsRow
          label="Waiting on others"
          description="Show a question you sent once this many days pass without an answer."
          control={
            <Select aria-label="Days before waiting" className="w-44" value={String(config.followUpDays)} onValueChange={(value) => set({ followUpDays: Number(value) })}>
              {[1, 2, 3, 5, 7, 14].map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {days} {days === 1 ? 'day' : 'days'}
                </SelectItem>
              ))}
            </Select>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Always on">
        <SettingsRow
          label="Keep checking when myOS is closed"
          description="Closing the window leaves myOS in the tray, still watching. Quit from the tray."
          control={(id) => <Switch id={id} checked={config.background} onCheckedChange={(background) => set({ background })} />}
        />
        <SettingsRow
          label="Start at login"
          description="myOS starts in the tray when you log in, so mail is handled before you open it."
          control={(id) => <Switch id={id} checked={config.startAtLogin} onCheckedChange={(startAtLogin) => set({ startAtLogin })} />}
        />
        <SettingsRow
          label="Notify me"
          description="A desktop notification when new mail needs an action or a reply."
          control={(id) => <Switch id={id} checked={config.notify} onCheckedChange={(notify) => set({ notify })} />}
        />
      </SettingsGroup>

      <AssistantSettings config={config} />

      <SettingsGroup title="Your brief" description="In your own words: who matters, what can wait, how you like to reply. The assistant reads this with every email.">
        <SettingsRow label="What matters to me">
          <SavedText
            label="What matters to me"
            rows={5}
            value={config.brief}
            placeholder={'Anything from Sam or my kids’ school is important.\nRecruiters and sales pitches can wait.\nI’m buying a house: the lender and agent come first.'}
            onSave={(brief) => set({ brief })}
          />
        </SettingsRow>
        <SettingsRow label="Sign-off for replies">
          <SavedText label="Sign-off" rows={2} value={config.signature} placeholder={'Thanks,\nAlex'} onSave={(signature) => set({ signature })} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="People">
        <PeopleList label="Always show" description="Never filed away, always important." value={config.vips} onChange={(vips) => set({ vips })} />
        <PeopleList label="Muted" description="Always filed; never shown or notified." value={config.muted} onChange={(muted) => set({ muted })} />
      </SettingsGroup>

      <Rules config={config} />
    </>
  );
}
