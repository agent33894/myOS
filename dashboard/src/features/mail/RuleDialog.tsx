import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORIES, LANES, filingLabel } from '@shared/mail/config';
import type { MailCategory, MailFiling, MailLane, MailRule, MailRuleCondition, RuleField } from '@shared/mail/types';
import { useProjects } from '../../data/selectors';
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
  IconButton,
  Input,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from '../../ui';

const FIELDS: Record<RuleField, string> = {
  from: 'Sender contains',
  domain: 'Sender’s domain is',
  subject: 'Subject contains',
  body: 'Text contains',
  to: 'Sent to (contains)',
  category: 'Kind is',
  list: 'Mailing list',
};

const DECIDED = 'decided';

export function describeRule(rule: MailRule): string {
  const when = rule.when
    .map(({ field, value }) =>
      field === 'category'
        ? `kind is ${CATEGORIES[value as MailCategory]?.label.toLowerCase() ?? value}`
        : field === 'list'
          ? value === 'yes'
            ? 'from a mailing list'
            : 'not from a mailing list'
          : `${FIELDS[field].toLowerCase()} “${value}”`,
    )
    .join(' and ');
  const { then } = rule;
  const does = [
    then.lane ? LANES[then.lane].label : null,
    then.filing ? filingLabel(then.filing) : null,
    then.markRead ? 'mark read' : null,
    then.task ? 'make a task' : null,
    then.draft ? 'draft a reply' : null,
    then.priority === 'high' ? 'important' : null,
    then.notify === false ? 'no notification' : then.notify ? 'notify' : null,
  ].filter(Boolean);
  return `When ${when || '…'} → ${does.join(', ') || 'no change'}`;
}

const filingValue = (filing?: MailFiling) => (!filing ? DECIDED : filing === 'keep' || filing === 'archive' ? filing : 'folder');

/** Add or edit one rule: all conditions must match; the actions override what myOS decided. */
export function RuleDialog({ rule, onSave, trigger }: { rule?: MailRule; onSave: (rule: MailRule) => void; trigger: (open: () => void) => ReactNode }) {
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(rule?.name ?? '');
  const [when, setWhen] = useState<MailRuleCondition[]>(rule?.when ?? [{ field: 'from', value: '' }]);
  const [lane, setLane] = useState<string>(rule?.then.lane ?? DECIDED);
  const [filing, setFiling] = useState<string>(filingValue(rule?.then.filing));
  const [folder, setFolder] = useState(rule?.then.filing && typeof rule.then.filing === 'object' ? rule.then.filing.folder : '');
  const [markRead, setMarkRead] = useState(rule?.then.markRead ?? false);
  const [task, setTask] = useState(rule?.then.task ?? false);
  const [project, setProject] = useState(rule?.then.project ?? DECIDED);
  const [important, setImportant] = useState(rule?.then.priority === 'high');
  const [draft, setDraft] = useState(rule?.then.draft ?? '');

  const setCondition = (index: number, change: Partial<MailRuleCondition>) =>
    setWhen((current) => current.map((condition, at) => (at === index ? { ...condition, ...change } : condition)));

  const valid = when.length > 0 && when.every((condition) => condition.value.trim()) && (filing !== 'folder' || folder.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const chosenFiling: MailFiling | undefined =
      filing === DECIDED ? undefined : filing === 'folder' ? { folder: folder.trim().replace(/[/\\]/g, ' ') } : (filing as 'keep' | 'archive');
    const next: MailRule = {
      id: rule?.id ?? crypto.randomUUID(),
      name: name.trim() || describeRule({ id: '', name: '', enabled: true, when, then: {} }).replace(/^When /, '').replace(/ → .*$/, ''),
      enabled: rule?.enabled ?? true,
      when: when.map((condition) => ({ ...condition, value: condition.value.trim() })),
      then: {
        ...(lane !== DECIDED ? { lane: lane as MailLane } : {}),
        ...(chosenFiling ? { filing: chosenFiling } : {}),
        ...(markRead ? { markRead } : {}),
        ...(task ? { task } : {}),
        ...(project !== DECIDED ? { project } : {}),
        ...(important ? { priority: 'high' as const } : {}),
        ...(draft.trim() ? { draft: draft.trim() } : {}),
      },
    };
    onSave(next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <DialogContent size="lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{rule ? 'Edit rule' : 'New rule'}</DialogTitle>
            <DialogDescription>When every condition matches, these choices win over what myOS or your assistant decided.</DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="School" />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">When</span>
            {when.map((condition, index) => (
              <div key={index} className="flex gap-2">
                <Select aria-label="Condition" className="w-52" value={condition.field} onValueChange={(field) => setCondition(index, { field: field as RuleField, value: field === 'list' ? 'yes' : field === 'category' ? 'newsletter' : '' })}>
                  {(Object.keys(FIELDS) as RuleField[]).map((field) => (
                    <SelectItem key={field} value={field}>
                      {FIELDS[field]}
                    </SelectItem>
                  ))}
                </Select>
                {condition.field === 'category' ? (
                  <Select aria-label="Kind" value={condition.value} onValueChange={(value) => setCondition(index, { value })}>
                    {(Object.keys(CATEGORIES) as MailCategory[]).map((category) => (
                      <SelectItem key={category} value={category}>
                        {CATEGORIES[category].label}
                      </SelectItem>
                    ))}
                  </Select>
                ) : condition.field === 'list' ? (
                  <Select aria-label="Mailing list" value={condition.value} onValueChange={(value) => setCondition(index, { value })}>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </Select>
                ) : (
                  <Input aria-label="Value" value={condition.value} onChange={(event) => setCondition(index, { value: event.target.value })} placeholder={condition.field === 'domain' ? 'school.org' : 'text'} />
                )}
                <IconButton icon={X} label="Remove condition" disabled={when.length === 1} onClick={() => setWhen((current) => current.filter((_, at) => at !== index))} />
              </div>
            ))}
            <Button variant="ghost" size="sm" leadingIcon={Plus} className="self-start" onClick={() => setWhen((current) => [...current, { field: 'subject', value: '' }])}>
              Add condition
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-text">Then</span>
            <div className="flex gap-3">
              <Field label="Show it as" className="flex-1">
                <Select value={lane} onValueChange={setLane}>
                  <SelectItem value={DECIDED}>As myOS decides</SelectItem>
                  {(['action', 'reply', 'fyi', 'handled'] as MailLane[]).map((choice) => (
                    <SelectItem key={choice} value={choice}>
                      {LANES[choice].label}
                    </SelectItem>
                  ))}
                </Select>
              </Field>
              <Field label="In the mailbox" className="flex-1">
                <Select value={filing} onValueChange={setFiling}>
                  <SelectItem value={DECIDED}>As myOS decides</SelectItem>
                  <SelectItem value="keep">Leave in the inbox</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="folder">File in a folder…</SelectItem>
                </Select>
              </Field>
            </div>
            {filing === 'folder' ? (
              <Field label="Folder" hint="Created under myOS in your mailbox (a label in Gmail).">
                <Input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="School" />
              </Field>
            ) : null}
            <div className="flex gap-3">
              <Field label="Tasks go in" className="flex-1">
                <Select value={project} onValueChange={setProject}>
                  <SelectItem value={DECIDED}>No project</SelectItem>
                  {projects.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </SelectItem>
                  ))}
                </Select>
              </Field>
            </div>
            <label className="flex items-center justify-between gap-4 text-base text-text">
              Make a task automatically
              <Switch checked={task} onCheckedChange={setTask} />
            </label>
            <label className="flex items-center justify-between gap-4 text-base text-text">
              Mark it important
              <Switch checked={important} onCheckedChange={setImportant} />
            </label>
            <label className="flex items-center justify-between gap-4 text-base text-text">
              Mark it read
              <Switch checked={markRead} onCheckedChange={setMarkRead} />
            </label>
            <Field label="Draft a reply" hint="Needs an assistant. The draft waits in your Outbox; nothing is sent until you send it.">
              <Textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Thank them and say I’m not looking right now." />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={!valid}>
              {rule ? 'Save rule' : 'Add rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
