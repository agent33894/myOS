import { BrowserWindow, Notification, dialog, powerMonitor } from 'electron';
import { randomUUID } from 'crypto';
import type { ImapFlow } from 'imapflow';
import { parseReply, parseTriage, replyPrompt, triagePrompt, extractJson, type AssistantEmail } from '../../shared/mail/assistant';
import { asksSomething, displayName, filingFor, heuristicVerdict, snippetOf, triage, type MailFacts, type TriageContext } from '../../shared/mail/classify';
import { LANES, PROVIDERS, normalizeMailConfig } from '../../shared/mail/config';
import { taskDraftFor } from '../../shared/mail/task';
import type {
  AssistantTestResult,
  MailAccount,
  MailAccountDraft,
  MailAction,
  MailActivity,
  MailBody,
  MailConfig,
  MailDraft,
  MailItem,
  MailLane,
  MailRule,
  MailRunStatus,
  MailSnapshot,
} from '../../shared/mail/types';
import { formatLocalDate } from '../../shared/date';
import { PROJECT_CLOSED_STATUSES } from '../../shared/spec';
import { ArtifactType } from '../../shared/types';
import { createArtifact, deleteArtifact, listArtifacts } from '../documents/artifacts';
import { DomainError } from '../errors';
import { currentWorkspace } from '../workspace/root';
import { runAssistant } from './assistant';
import { closeAll, ensureFolder, fetchMessages, findByMessageId, forget, itemIdFor, verifyLogin, withClient, type FetchedMail, type Folders } from './imap';
import { capBody, flush, mail, persist, publicAccount, sealSecret, secureStorageAvailable, type StoredAccount } from './store';

/** The newest messages the first check of an account reads. */
const FIRST_LOOK = 300;
/** At most this many new messages per check; the rest wait for the next one. */
const PER_CHECK = 200;
/** Assistant prompts carry this many emails, and one check asks about at most this many. */
const ASSISTANT_BATCH = 8;
const ASSISTANT_PER_CHECK = 48;
const SENT_SCAN_HOURS = 6;
const WAITING_MAX_DAYS = 21;
const GMAIL_TABS = ['promotions', 'social', 'updates', 'forums'] as const;

interface Hooks {
  /** Tell the renderer the snapshot changed. */
  changed: () => void;
  /** Open the window at a message (a notification was clicked). */
  open: (itemId?: string) => void;
  /** Keep the tray and login item in step with the config. */
  configured: (config: MailConfig) => void;
}

let hooks: Hooks = { changed: () => undefined, open: () => undefined, configured: () => undefined };
let timer: NodeJS.Timeout | null = null;
let running: Promise<MailRunStatus> | null = null;
const status: MailRunStatus = { running: false };
let changeTimer: NodeJS.Timeout | null = null;

function changed(): void {
  if (changeTimer) return;
  changeTimer = setTimeout(() => {
    changeTimer = null;
    hooks.changed();
  }, 120);
}

const now = () => new Date().toISOString();
const store = () => mail();
const accountOf = (id: string) => store().accounts.find((account) => account.id === id);

function itemOf(id: string): MailItem {
  const item = store().items.find((candidate) => candidate.id === id);
  if (!item) throw new DomainError('NOT_FOUND', 'That email is no longer here.');
  return item;
}

function requireAccount(id: string): StoredAccount {
  const account = accountOf(id);
  if (!account) throw new DomainError('NOT_FOUND', 'That mail account is no longer connected.');
  return account;
}

function log(entry: Omit<MailActivity, 'id' | 'at'>): MailActivity {
  const activity: MailActivity = { id: randomUUID(), at: now(), ...entry };
  store().activity.unshift(activity);
  return activity;
}

// ─── Snapshot and setup ─────────────────────────────────────────────────────

export function snapshot(): MailSnapshot {
  const file = store();
  return {
    accounts: file.accounts.map(publicAccount),
    config: file.config,
    items: [...file.items].sort((a, b) => b.date.localeCompare(a.date)),
    drafts: file.drafts,
    activity: file.activity.slice(0, 300),
    status: { ...status },
    secureStorage: secureStorageAvailable(),
  };
}

export function startMail(next: Hooks): void {
  hooks = next;
  hooks.configured(store().config);
  powerMonitor.on('resume', () => void runSync());
  // Give the window a moment to paint before the first check.
  schedule(4_000);
}

export function stopMail(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  flush();
  closeAll();
}

function schedule(delay?: number): void {
  if (timer) clearTimeout(timer);
  timer = null;
  const file = store();
  if (!file.accounts.some((account) => account.enabled)) {
    status.nextRun = undefined;
    return;
  }
  const wait = delay ?? file.config.interval * 60_000;
  status.nextRun = new Date(Date.now() + wait).toISOString();
  timer = setTimeout(() => void runSync(), wait);
}

/**
 * The assistant is a shell command, so the main process asks the user itself,
 * in a native dialog the renderer cannot answer, before running a new one.
 */
async function approveCommand(command: string): Promise<boolean> {
  const file = store();
  if (!command.trim()) return false;
  if (file.approvedCommand === command) return true;
  const options = {
    type: 'question' as const,
    buttons: ['Allow', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Let myOS run this assistant command?',
    detail: `${command}\n\nmyOS will start it on this computer and pass it the text of your email, so it can sort mail and draft replies. It can never send mail.`,
  };
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const { response } = window ? await dialog.showMessageBox(window, options) : await dialog.showMessageBox(options);
  if (response !== 0) return false;
  file.approvedCommand = command;
  persist();
  return true;
}

/** Only the command the user allowed runs; anything else fails without starting a process. */
function assistantRun(prompt: string): Promise<string> {
  const { assistant } = store().config;
  if (!assistant.command || assistant.command !== store().approvedCommand) {
    return Promise.reject(new Error('Allow the assistant command in Settings → Mail first.'));
  }
  return runAssistant(assistant.command, prompt, assistant.timeoutSeconds);
}

export async function setConfig(patch: Partial<MailConfig>): Promise<MailConfig> {
  const file = store();
  const before = file.config;
  const next = normalizeMailConfig({ ...before, ...patch, assistant: { ...before.assistant, ...patch.assistant } }, before);
  if (next.assistant.enabled && !(await approveCommand(next.assistant.command))) next.assistant = { ...next.assistant, enabled: false };
  file.config = next;
  persist();
  if (file.config.interval !== before.interval) schedule();
  hooks.configured(file.config);
  changed();
  return file.config;
}

export async function addAccount(draft: MailAccountDraft): Promise<MailAccount> {
  const address = draft.address.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new DomainError('INVALID', 'Enter a full email address.');
  const password = draft.password.replace(/\s+/g, '');
  if (!password) throw new DomainError('INVALID', 'Enter the app password for this account.');
  const preset = PROVIDERS[draft.provider] ?? PROVIDERS.imap;
  const imap = draft.imap?.host ? draft.imap : preset.imap;
  const smtp = draft.smtp?.host ? draft.smtp : preset.smtp;
  if (!imap.host || !smtp.host) throw new DomainError('INVALID', 'Enter the incoming and outgoing server names.');
  try {
    await verifyLogin({ address, imap }, password);
  } catch (error) {
    throw new DomainError('INVALID', (error as Error).message);
  }
  const file = store();
  const existing = file.accounts.find((account) => account.id === address);
  const account: StoredAccount = {
    ...(existing ?? {}),
    id: address,
    provider: draft.provider,
    address,
    ...(draft.name?.trim() ? { name: draft.name.trim() } : {}),
    imap,
    smtp,
    enabled: true,
    aliases: existing?.aliases ?? [],
    status: existing?.status ?? 'never',
    secret: sealSecret(password),
  };
  forget(account.id);
  file.accounts = [...file.accounts.filter((candidate) => candidate.id !== address), account];
  persist(true);
  hooks.configured(file.config);
  changed();
  void runSync();
  return publicAccount(account);
}

export function updateAccount(id: string, patch: { enabled?: boolean; name?: string; aliases?: string[] }): MailAccount {
  const account = requireAccount(id);
  if (typeof patch.enabled === 'boolean') account.enabled = patch.enabled;
  if (typeof patch.name === 'string') account.name = patch.name.trim() || undefined;
  if (Array.isArray(patch.aliases)) account.aliases = patch.aliases.map((alias) => String(alias).trim().toLowerCase()).filter((alias) => alias.includes('@'));
  persist();
  schedule();
  changed();
  return publicAccount(account);
}

/** Disconnect: the password and this account's cached mail are forgotten; nothing on the server changes. */
export function removeAccount(id: string): void {
  const file = store();
  forget(id);
  file.accounts = file.accounts.filter((account) => account.id !== id);
  file.items = file.items.filter((item) => item.accountId !== id);
  file.drafts = file.drafts.filter((draft) => draft.accountId !== id);
  file.activity = file.activity.filter((entry) => entry.accountId !== id);
  persist(true);
  schedule();
  hooks.configured(file.config);
  changed();
}

// ─── Triage context ────────────────────────────────────────────────────────

async function activeProjects(): Promise<Array<{ id: string; title: string }>> {
  if (!currentWorkspace()) return [];
  try {
    return (await listArtifacts())
      .filter((artifact) => artifact.type === ArtifactType.PROJECT && !PROJECT_CLOSED_STATUSES.has(artifact.status))
      .map((project) => ({ id: project.id, title: project.title }));
  } catch {
    return [];
  }
}

function myAddresses(): string[] {
  return store().accounts.flatMap((account) => [account.address, ...account.aliases]);
}

async function context(): Promise<TriageContext> {
  const file = store();
  return { me: myAddresses(), known: new Set(file.known), config: file.config, projects: await activeProjects() };
}

// ─── Checking mail ─────────────────────────────────────────────────────────

/** Check every enabled account now; a check already underway is joined, not repeated. */
export function runSync(): Promise<MailRunStatus> {
  running ??= (async () => {
    status.running = true;
    status.error = undefined;
    changed();
    const fresh: MailItem[] = [];
    let filed = 0;
    let looked = 0;
    let firstLook = false;
    try {
      wakeSnoozed();
      const ctx = await context();
      for (const account of store().accounts.filter((candidate) => candidate.enabled)) {
        firstLook ||= !account.cursor;
        account.status = 'syncing';
        changed();
        try {
          const result = await syncAccount(account, ctx);
          fresh.push(...result.fresh);
          filed += result.filed;
          looked += result.looked;
          account.status = 'ok';
          account.error = undefined;
          account.lastSync = now();
        } catch (error) {
          account.status = 'error';
          account.error = (error as Error).message;
          console.warn(`[mail] ${account.address}:`, account.error);
        }
        changed();
      }
      await draftFromRules(fresh);
      if (!firstLook) notifyFresh(fresh);
      status.lastSummary = firstLook && looked ? `First look: sorted ${looked} emails` : summaryOf(fresh.length, filed);
    } catch (error) {
      status.error = (error as Error).message;
    } finally {
      status.running = false;
      status.lastRun = now();
      running = null;
      persist();
      schedule();
      changed();
    }
    return { ...status };
  })();
  return running;
}

function summaryOf(fresh: number, filed: number): string {
  const parts = [fresh ? `${fresh} new` : null, filed ? `filed ${filed}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing new';
}

function wakeSnoozed(): void {
  const today = Date.now();
  for (const item of store().items) {
    if (item.state === 'snoozed' && item.snoozeUntil && new Date(item.snoozeUntil).getTime() <= today) {
      item.state = 'open';
      item.snoozeUntil = undefined;
    }
  }
}

const gmailLink = (account: StoredAccount, messageId: string) =>
  account.provider === 'gmail'
    ? `https://mail.google.com/mail/u/${encodeURIComponent(account.address)}/#search/rfc822msgid%3A${encodeURIComponent(messageId.replace(/^<|>$/g, ''))}`
    : undefined;

function itemFrom(account: StoredAccount, mailbox: string, message: FetchedMail): MailItem {
  return {
    id: itemIdFor(account.id, message.messageId),
    accountId: account.id,
    messageId: message.messageId,
    folder: mailbox,
    uid: message.uid,
    from: message.facts.from,
    to: message.facts.to,
    cc: message.facts.cc,
    ...(message.replyTo && message.replyTo.address !== message.facts.from.address ? { replyTo: message.replyTo } : {}),
    subject: message.facts.subject,
    date: message.facts.date,
    snippet: snippetOf(message.text, 220),
    unread: message.unread,
    flagged: message.flagged,
    attachments: message.attachments,
    ...(message.unsubscribe ? { unsubscribe: message.unsubscribe } : {}),
    references: [...new Set([...(message.inReplyTo ? [message.inReplyTo] : []), ...message.references])],
    verdict: heuristicVerdict(message.facts, { me: [], known: new Set(), config: store().config, projects: [] }),
    state: 'open',
    seen: now(),
    ...(gmailLink(account, message.messageId) ? { webLink: gmailLink(account, message.messageId) } : {}),
  };
}

interface Fetched {
  messages: FetchedMail[];
  inbox: Set<number>;
  firstLook: boolean;
  validityChanged: boolean;
}

async function fetchInbox(client: ImapFlow, account: StoredAccount): Promise<Fetched> {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const box = client.mailbox;
    const validity = box ? String(box.uidValidity) : '0';
    const validityChanged = Boolean(account.cursor && account.cursor.uidValidity !== validity);
    const firstLook = !account.cursor || validityChanged;
    const all = ((await client.search({ all: true }, { uid: true })) || []).sort((a, b) => a - b);
    let uids: number[];
    if (firstLook) {
      const since = new Date(Date.now() - store().config.lookbackDays * 86_400_000);
      uids = ((await client.search({ since }, { uid: true })) || []).sort((a, b) => a - b).slice(-FIRST_LOOK);
    } else {
      uids = all.filter((uid) => uid > account.cursor!.lastUid).slice(0, PER_CHECK);
    }
    const tabs = new Map<number, (typeof GMAIL_TABS)[number]>();
    if (account.provider === 'gmail' && uids.length) {
      for (const tab of GMAIL_TABS) {
        const hits = (await client.search({ uid: uids.join(','), gmraw: `category:${tab}` }, { uid: true }).catch(() => [])) || [];
        for (const uid of hits) tabs.set(uid, tab);
      }
    }
    const messages = await fetchMessages(client, uids);
    for (const message of messages) {
      const tab = tabs.get(message.uid);
      if (tab) message.facts.gmailCategory = tab;
    }
    const lastUid = firstLook ? (all.at(-1) ?? 0) : Math.max(account.cursor!.lastUid, uids.at(-1) ?? 0);
    account.cursor = { uidValidity: validity, lastUid };
    return { messages, inbox: new Set(all), firstLook, validityChanged };
  } finally {
    lock.release();
  }
}

/** Unread, flagged, and answered, refreshed for the messages still in view. */
async function refreshFlags(client: ImapFlow, items: MailItem[]): Promise<Map<number, Set<string>>> {
  const flags = new Map<number, Set<string>>();
  if (!items.length) return flags;
  const lock = await client.getMailboxLock('INBOX');
  try {
    for await (const message of client.fetch(items.map((item) => item.uid), { uid: true, flags: true }, { uid: true })) {
      flags.set(message.uid, message.flags ?? new Set());
    }
  } finally {
    lock.release();
  }
  return flags;
}

async function assistantVerdicts(entries: Array<{ key: string; facts: MailFacts; item: MailItem }>, ctx: TriageContext) {
  const { assistant, brief, filing } = store().config;
  const verdicts = new Map<string, MailItem['verdict']>();
  if (!assistant.enabled || !assistant.command || entries.length === 0) return verdicts;
  const worth = entries
    // Obvious bulk mail does not need a second opinion.
    .filter(({ item, facts }) => !(item.verdict.lane === 'handled' && (facts.listId || facts.hasUnsubscribe || facts.gmailCategory)))
    .slice(-ASSISTANT_PER_CHECK);
  for (let start = 0; start < worth.length; start += ASSISTANT_BATCH) {
    const batch: AssistantEmail[] = worth.slice(start, start + ASSISTANT_BATCH).map(({ key, facts, item }) => ({ key, facts, guess: item.verdict }));
    try {
      const output = await assistantRun(triagePrompt(batch, { today: formatLocalDate(), me: ctx.me, brief, projects: ctx.projects }));
      for (const [key, verdict] of parseTriage(output, batch, { projects: ctx.projects, filing })) verdicts.set(key, verdict);
    } catch (error) {
      status.error = `Assistant: ${(error as Error).message}`;
      console.warn('[mail] assistant:', (error as Error).message);
      break;
    }
  }
  return verdicts;
}

async function syncAccount(account: StoredAccount, ctx: TriageContext): Promise<{ fresh: MailItem[]; filed: number; looked: number }> {
  const file = store();
  const config = file.config;
  return withClient(account, async (client, folders) => {
    const { messages, inbox, firstLook, validityChanged } = await fetchInbox(client, account);
    const byId = new Map(file.items.map((item) => [item.id, item]));
    const waiting = file.items.filter((item) => item.accountId === account.id && item.verdict.lane === 'waiting' && item.state === 'open');
    const sentIds = new Set([...(account.sentIds ?? []), ...waiting.map((item) => item.messageId)]);
    const fresh: Array<{ key: string; facts: MailFacts; item: MailItem; text: string }> = [];

    for (const message of messages) {
      const id = itemIdFor(account.id, message.messageId);
      const known = byId.get(id);
      if (known) {
        // Seen before (a new UIDVALIDITY, or it came back to the inbox): refresh where it is.
        known.folder = 'INBOX';
        known.uid = message.uid;
        continue;
      }
      if (myAddresses().includes(message.facts.from.address)) continue;
      const refs = [message.inReplyTo, ...message.references].filter(Boolean) as string[];
      message.facts.answersMe = refs.some((ref) => sentIds.has(ref));
      for (const pending of waiting) {
        if (refs.includes(pending.messageId)) settle(pending, `${displayName(message.facts.from)} replied`);
      }
      const item = itemFrom(account, 'INBOX', message);
      item.verdict = heuristicVerdict(message.facts, ctx);
      fresh.push({ key: String(fresh.length + 1), facts: message.facts, item, text: message.text });
    }

    const advice = await assistantVerdicts(fresh, ctx);
    for (const entry of fresh) {
      entry.item.verdict = triage(entry.facts, ctx, advice.get(entry.key));
      file.items.push(entry.item);
      file.bodies[entry.item.id] = capBody(entry.text);
    }

    let filed = 0;
    if (config.automation === 'sort') {
      const toFile = fresh.map((entry) => entry.item).filter((item) => item.verdict.lane === 'handled' && item.verdict.filing !== 'keep');
      filed = await fileItems(client, folders, toFile, true);
    }
    const toRead = fresh.map((entry) => entry.item).filter((item) => item.verdict.markRead && item.state === 'open' && item.unread);
    if (config.automation === 'sort' && toRead.length) await markRead(client, toRead, true);

    // Mail that left the inbox in another app is dealt with; mail answered elsewhere is replied to.
    if (!validityChanged && !firstLook) {
      const inView = file.items.filter((item) => item.accountId === account.id && item.state !== 'done' && item.folder === 'INBOX');
      for (const item of inView) if (!inbox.has(item.uid)) settle(item, 'Dealt with in another app');
      const flags = await refreshFlags(client, inView.filter((item) => inbox.has(item.uid)));
      for (const item of inView) {
        const current = flags.get(item.uid);
        if (!current) continue;
        item.unread = !current.has('\\Seen');
        item.flagged = current.has('\\Flagged');
        if (current.has('\\Answered') && item.verdict.lane === 'reply' && item.state === 'open') settle(item, 'You replied');
      }
    }

    for (const entry of fresh) await autoTask(entry.item);

    const lastScan = account.lastSentScan ? new Date(account.lastSentScan).getTime() : 0;
    if (Date.now() - lastScan > SENT_SCAN_HOURS * 3_600_000) await scanSent(client, folders, account, ctx);

    return { fresh: firstLook ? [] : fresh.map((entry) => entry.item), filed, looked: fresh.length };
  });
}

function settle(item: MailItem, why?: string): void {
  item.state = 'done';
  item.settled = now();
  if (why) item.verdict = { ...item.verdict, reasons: [why, ...item.verdict.reasons.filter((reason) => reason !== why)].slice(0, 3) };
}

/** Move messages out of the inbox to where their verdict files them, one command per destination. */
async function fileItems(client: ImapFlow, folders: Folders, items: MailItem[], auto: boolean, archiveAll = false): Promise<number> {
  const groups = new Map<string, MailItem[]>();
  for (const item of items) {
    if (item.folder !== 'INBOX') continue;
    const filing = archiveAll ? 'archive' : item.verdict.filing;
    if (filing === 'keep') continue;
    const target = filing === 'archive' ? folders.archive : await ensureFolder(client, folders, filing.folder);
    groups.set(target, [...(groups.get(target) ?? []), item]);
  }
  let moved = 0;
  if (groups.size === 0) return moved;
  const lock = await client.getMailboxLock('INBOX');
  try {
    for (const [target, group] of groups) {
      const result = await client.messageMove(group.map((item) => item.uid), target, { uid: true });
      if (!result) continue;
      for (const item of group) {
        const kind = target === folders.archive ? 'archived' : 'filed';
        log({
          itemId: item.id,
          accountId: item.accountId,
          kind,
          summary: `${kind === 'archived' ? 'Archived' : `Filed to ${target.split(folders.delimiter).at(-1)}`}: “${item.subject}”`,
          auto,
          move: { messageId: item.messageId, from: 'INBOX', to: target, wasUnread: item.unread },
        });
        item.folder = target;
        item.uid = result.uidMap?.get(item.uid) ?? item.uid;
        settle(item);
        moved += 1;
      }
    }
  } finally {
    lock.release();
  }
  return moved;
}

async function markRead(client: ImapFlow, items: MailItem[], auto: boolean): Promise<void> {
  const byFolder = new Map<string, MailItem[]>();
  for (const item of items) byFolder.set(item.folder, [...(byFolder.get(item.folder) ?? []), item]);
  for (const [folder, group] of byFolder) {
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageFlagsAdd(group.map((item) => item.uid), ['\\Seen'], { uid: true });
      for (const item of group) {
        item.unread = false;
        if (auto) log({ itemId: item.id, accountId: item.accountId, kind: 'read', summary: `Marked read: “${item.subject}”`, auto });
      }
    } finally {
      lock.release();
    }
  }
}

async function autoTask(item: MailItem): Promise<void> {
  const { tasks } = store().config;
  const wanted = tasks !== 'off' && item.verdict.task && item.state === 'open' && (item.verdict.autoTask || (tasks === 'auto' && ['action', 'reply'].includes(item.verdict.lane)));
  if (!wanted || item.taskPath || !currentWorkspace()) return;
  try {
    const task = await createArtifact(taskDraftFor(item));
    item.taskPath = task.filePath;
    log({ itemId: item.id, accountId: item.accountId, kind: 'task', summary: `Made a task: “${task.title}”`, auto: true });
  } catch (error) {
    console.warn('[mail] Could not make a task:', (error as Error).message);
  }
}

/** Sent mail: who the user writes to, and questions nobody has answered yet. */
async function scanSent(client: ImapFlow, folders: Folders, account: StoredAccount, ctx: TriageContext): Promise<void> {
  if (!folders.sent) return;
  const file = store();
  const followUp = file.config.followUpDays;
  const candidates: FetchedMail[] = [];
  const lock = await client.getMailboxLock(folders.sent);
  try {
    const since = new Date(Date.now() - 90 * 86_400_000);
    const uids = ((await client.search({ since }, { uid: true })) || []).sort((a, b) => a - b).slice(-400);
    const recent: Array<{ uid: number; date: number; to: string[] }> = [];
    const known = new Set(file.known);
    const sentIds: string[] = [];
    if (uids.length) {
      for await (const message of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
        const to = [...(message.envelope?.to ?? []), ...(message.envelope?.cc ?? [])].map((entry) => entry.address?.toLowerCase()).filter(Boolean) as string[];
        to.forEach((address) => known.add(address));
        if (message.envelope?.messageId) sentIds.push(message.envelope.messageId);
        recent.push({ uid: message.uid, date: new Date(message.envelope?.date ?? 0).getTime(), to });
      }
    }
    for (const address of ctx.me) known.delete(address);
    file.known = [...known].slice(-2000);
    account.sentIds = sentIds.slice(-300);
    const windowStart = Date.now() - WAITING_MAX_DAYS * 86_400_000;
    const windowEnd = Date.now() - followUp * 86_400_000;
    const asking = recent
      .filter((entry) => entry.date >= windowStart && entry.date <= windowEnd && entry.to.some((address) => !ctx.me.includes(address)))
      .slice(-40)
      .map((entry) => entry.uid);
    for (const read of await fetchMessages(client, asking, 40_000)) if (asksSomething(read.text)) candidates.push(read);
  } finally {
    lock.release();
  }

  const byId = new Map(file.items.map((item) => [item.id, item]));
  for (const sent of candidates.slice(-25)) {
    const id = itemIdFor(account.id, sent.messageId);
    if (byId.has(id)) continue;
    if (await hasReply(client, folders, sent.messageId)) continue;
    const recipient = sent.facts.to.find((to) => !ctx.me.includes(to.address)) ?? sent.facts.to[0];
    if (!recipient || /no-?reply|notifications?@/i.test(recipient.address)) continue;
    const days = Math.max(1, Math.round((Date.now() - new Date(sent.facts.date).getTime()) / 86_400_000));
    const item = itemFrom(account, folders.sent, sent);
    item.unread = false;
    item.verdict = {
      lane: 'waiting',
      category: 'person',
      priority: 'normal',
      summary: snippetOf(sent.text, 160) || sent.facts.subject,
      reasons: [`No reply from ${displayName(recipient)} in ${days} ${days === 1 ? 'day' : 'days'}`],
      task: { title: `Follow up with ${displayName(recipient).split(' ')[0]}: ${sent.facts.subject.replace(/^(re|fwd?):\s*/i, '')}` },
      filing: 'keep',
      source: 'heuristic',
    };
    file.items.push(item);
    file.bodies[item.id] = capBody(sent.text);
  }
  // Waiting too long stops being useful.
  for (const item of file.items) {
    if (item.accountId === account.id && item.verdict.lane === 'waiting' && item.state === 'open' && Date.now() - new Date(item.date).getTime() > 30 * 86_400_000) {
      settle(item, 'Stopped waiting after 30 days');
    }
  }
  account.lastSentScan = now();
}

async function hasReply(client: ImapFlow, folders: Folders, messageId: string): Promise<boolean> {
  for (const folder of new Set(['INBOX', folders.archive])) {
    const lock = await client.getMailboxLock(folder);
    try {
      const found = await client.search({ or: [{ header: { 'in-reply-to': messageId } }, { header: { references: messageId } }] }, { uid: true });
      if (found && found.length) return true;
    } catch {
      // A server that cannot search headers: assume nothing.
    } finally {
      lock.release();
    }
  }
  return false;
}

/** One notification per check for mail that needs the user: the message itself, or a count. */
function notifyFresh(fresh: MailItem[]): void {
  if (!store().config.notify || !Notification.isSupported()) return;
  const worth = fresh.filter(
    (item) => item.state === 'open' && (item.verdict.notify ?? ['action', 'reply'].includes(item.verdict.lane)),
  );
  if (worth.length === 0) return;
  const [first] = worth;
  const notification =
    worth.length === 1
      ? new Notification({ title: `${displayName(first.from)} · ${LANES[first.verdict.lane].label}`, body: first.verdict.summary || first.subject })
      : new Notification({ title: `${worth.length} emails need you`, body: worth.slice(0, 3).map((item) => `${displayName(item.from)}: ${item.subject}`).join('\n') });
  notification.on('click', () => hooks.open(worth.length === 1 ? first.id : undefined));
  notification.show();
}

async function draftFromRules(fresh: MailItem[]): Promise<void> {
  const { assistant } = store().config;
  if (!assistant.enabled) return;
  for (const item of fresh.filter((candidate) => candidate.verdict.draft && candidate.state === 'open').slice(0, 5)) {
    await composeDraft(item.id, { assistant: true, instruction: item.verdict.draft }).catch((error: Error) => console.warn('[mail] draft:', error.message));
  }
}

// ─── Reading ───────────────────────────────────────────────────────────────

const LINK = /https?:\/\/[^\s<>()"'\]]+/g;

export async function readBody(id: string): Promise<MailBody> {
  const item = itemOf(id);
  const file = store();
  let text = file.bodies[id];
  if (text === undefined) {
    const account = requireAccount(item.accountId);
    text = await withClient(account, async (client) => {
      const uid = await findByMessageId(client, item.folder, item.messageId);
      if (!uid) return '';
      const lock = await client.getMailboxLock(item.folder);
      try {
        const [message] = await fetchMessages(client, [uid]);
        return message?.text ?? '';
      } finally {
        lock.release();
      }
    });
    if (item.state !== 'done') {
      file.bodies[id] = capBody(text);
      persist();
    }
  }
  const links = [...new Set(text.match(LINK) ?? [])]
    .map((url) => url.replace(/[.,;:!?]+$/, ''))
    .slice(0, 30)
    .map((url) => ({ url, text: new URL(url).hostname.replace(/^www\./, '') }));
  return { id, text, links };
}

// ─── Acting on mail ────────────────────────────────────────────────────────

function ruleFor(item: MailItem, lane: MailLane, scope: 'sender' | 'domain'): MailRule {
  const domain = item.from.address.split('@')[1] ?? item.from.address;
  const who = scope === 'sender' ? displayName(item.from) : domain;
  return {
    id: randomUUID(),
    name: `${LANES[lane].label} · ${who}`,
    when: [scope === 'sender' ? { field: 'from', value: item.from.address } : { field: 'domain', value: domain }],
    then: { lane },
    enabled: true,
  };
}

const personKey = (item: MailItem, scope: 'sender' | 'domain') =>
  scope === 'sender' ? item.from.address : `@${item.from.address.split('@')[1]}`;

export async function act(ids: string[], action: MailAction): Promise<void> {
  const file = store();
  const items = ids.map(itemOf);
  const byAccount = (list: MailItem[]) => {
    const groups = new Map<string, MailItem[]>();
    for (const item of list) groups.set(item.accountId, [...(groups.get(item.accountId) ?? []), item]);
    return groups;
  };
  const onServer = async (list: MailItem[], work: (client: ImapFlow, folders: Folders, group: MailItem[]) => Promise<unknown>) => {
    for (const [accountId, group] of byAccount(list)) await withClient(requireAccount(accountId), (client, folders) => work(client, folders, group));
  };

  switch (action.kind) {
    case 'done': {
      const inInbox = items.filter((item) => item.folder === 'INBOX' && item.verdict.lane !== 'waiting');
      if (file.config.archiveOnDone && inInbox.length) {
        await onServer(inInbox, async (client, folders, group) => {
          await markRead(client, group.filter((item) => item.unread), false);
          await fileItems(client, folders, group, false, true);
        });
      }
      items.forEach((item) => settle(item));
      break;
    }
    case 'reopen':
      items.forEach((item) => {
        item.state = 'open';
        item.settled = undefined;
      });
      break;
    case 'lane': {
      for (const item of items) {
        item.verdict = {
          ...item.verdict,
          lane: action.lane,
          source: 'you',
          filing: action.lane === 'handled' ? (item.verdict.filing === 'keep' ? filingFor(item.verdict.category, file.config.filing) : item.verdict.filing) : 'keep',
          reasons: [`You moved it to ${LANES[action.lane].label}`],
        };
        item.state = 'open';
      }
      if (action.teach && items[0]) file.config.rules = [ruleFor(items[0], action.lane, action.teach), ...file.config.rules];
      if (action.lane === 'handled') await onServer(items, (client, folders, group) => fileItems(client, folders, group, false));
      break;
    }
    case 'mute':
    case 'vip': {
      const list = action.kind === 'mute' ? 'muted' : 'vips';
      const other = action.kind === 'mute' ? 'vips' : 'muted';
      const keys = [...new Set(items.map((item) => personKey(item, action.scope)))];
      file.config = { ...file.config, [list]: [...new Set([...file.config[list], ...keys])], [other]: file.config[other].filter((entry) => !keys.includes(entry)) };
      const ctx = await context();
      const affected = file.items.filter((item) => item.state === 'open' && item.verdict.lane !== 'waiting' && keys.some((key) => (key.startsWith('@') ? item.from.address.endsWith(key) : item.from.address === key)));
      for (const item of affected) {
        const facts = factsOf(item);
        item.verdict = triage(facts, ctx, item.verdict.source === 'you' ? undefined : item.verdict);
      }
      if (action.kind === 'mute') await onServer(affected.filter((item) => item.verdict.lane === 'handled'), (client, folders, group) => fileItems(client, folders, group, false));
      break;
    }
    case 'snooze':
      items.forEach((item) => {
        item.state = 'snoozed';
        item.snoozeUntil = action.until;
      });
      break;
    case 'file':
      await onServer(items.filter((item) => item.verdict.filing !== 'keep'), (client, folders, group) => fileItems(client, folders, group, false));
      break;
    case 'read':
      await onServer(items.filter((item) => item.unread), (client, _folders, group) => markRead(client, group, false));
      break;
    case 'link-task':
      items.forEach((item) => {
        item.taskPath = action.taskPath;
      });
      break;
  }
  persist();
  changed();
}

/** Rebuild triage facts from a cached item, for re-triage after people lists change. */
function factsOf(item: MailItem): MailFacts {
  return {
    from: item.from,
    to: item.to,
    cc: item.cc,
    subject: item.subject,
    text: store().bodies[item.id] ?? item.snippet,
    date: item.date,
    hasUnsubscribe: Boolean(item.unsubscribe) || ['newsletter', 'promotion'].includes(item.verdict.category),
    calendar: item.verdict.category === 'calendar',
    flagged: item.flagged,
    answersMe: false,
  };
}

/** Put back what one activity entry did: the message returns to where it was. */
export async function undoActivity(id: string): Promise<void> {
  const file = store();
  const entry = file.activity.find((candidate) => candidate.id === id);
  if (!entry) throw new DomainError('NOT_FOUND', 'That change is no longer in the log.');
  if (entry.undone) return;
  const item = entry.itemId ? file.items.find((candidate) => candidate.id === entry.itemId) : undefined;
  if (entry.move) {
    const { messageId, from, to, wasUnread } = entry.move;
    await withClient(requireAccount(entry.accountId), async (client, folders) => {
      const lock = await client.getMailboxLock(to);
      try {
        const found = await client.search({ header: { 'message-id': messageId } }, { uid: true });
        if (!found || found.length === 0) throw new DomainError('NOT_FOUND', 'That email is no longer where myOS put it.');
        const uid = found[found.length - 1];
        if (wasUnread) await client.messageFlagsRemove([uid], ['\\Seen'], { uid: true });
        // Gmail's All Mail holds every message; moving out of it would delete. Copying back to the inbox restores the label.
        const result = folders.archiveIsAll && to === folders.archive
          ? await client.messageCopy([uid], from, { uid: true })
          : await client.messageMove([uid], from, { uid: true });
        if (item) {
          item.folder = from;
          item.uid = (result && result.uidMap?.get(uid)) || item.uid;
          item.unread = wasUnread;
        }
      } finally {
        lock.release();
      }
    });
    if (item) {
      item.state = 'open';
      item.settled = undefined;
      // Taken back out of Handled: show it, and do not file it again on its own.
      if (item.verdict.lane === 'handled') item.verdict = { ...item.verdict, lane: 'fyi', filing: 'keep', source: 'you', reasons: ['You brought it back'] };
    }
  } else if (entry.kind === 'read' && item) {
    await withClient(requireAccount(entry.accountId), async (client) => {
      const lock = await client.getMailboxLock(item.folder);
      try {
        await client.messageFlagsRemove([item.uid], ['\\Seen'], { uid: true });
        item.unread = true;
      } finally {
        lock.release();
      }
    });
  } else if (entry.kind === 'task' && item?.taskPath) {
    await deleteArtifact(item.taskPath).catch(() => undefined);
    item.taskPath = undefined;
  } else {
    throw new DomainError('INVALID', 'That change cannot be undone from here.');
  }
  entry.undone = true;
  log({ itemId: entry.itemId, accountId: entry.accountId, kind: 'restored', summary: `Undid: ${entry.summary}`, auto: false });
  persist();
  changed();
}

// ─── Drafts ────────────────────────────────────────────────────────────────

const replySubject = (subject: string) => (/^re:/i.test(subject) ? subject : `Re: ${subject}`);

/** Start a reply for review: written by the assistant when asked and one is set, otherwise blank. Nothing is sent. */
export async function composeDraft(itemId: string, options: { assistant: boolean; instruction?: string }): Promise<MailDraft> {
  const instruction = typeof options.instruction === 'string' ? options.instruction.slice(0, 1000) : undefined;
  const file = store();
  const item = itemOf(itemId);
  const account = requireAccount(item.accountId);
  const followUp = item.verdict.lane === 'waiting';
  const to = followUp ? item.to.filter((address) => !myAddresses().includes(address.address)) : [item.replyTo ?? item.from];
  let body = '';
  const useAssistant = options.assistant === true && file.config.assistant.enabled && Boolean(file.config.assistant.command);
  if (useAssistant) {
    const facts = factsOf(item);
    const output = await assistantRun(
      replyPrompt({
        facts: followUp ? { ...facts, text: `(This is the user's own message; write a short, friendly follow-up nudge.)\n\n${facts.text}` } : facts,
        instruction,
        brief: file.config.brief,
        fromName: account.name || displayName({ address: account.address }),
        signature: file.config.signature,
        today: formatLocalDate(),
      }),
    ).catch((error: Error) => {
      throw new DomainError('INTERNAL', error.message);
    });
    body = parseReply(output) ?? '';
  } else if (file.config.signature.trim()) {
    body = `\n\n${file.config.signature.trim()}`;
  }
  const existing = file.drafts.find((draft) => draft.itemId === itemId && draft.status === 'review');
  const draft: MailDraft = {
    id: existing?.id ?? randomUUID(),
    accountId: account.id,
    itemId,
    to,
    cc: [],
    subject: replySubject(item.subject),
    body,
    inReplyTo: item.messageId,
    references: [...item.references, item.messageId].slice(-20),
    status: 'review',
    source: useAssistant ? 'assistant' : 'you',
    ...(instruction ? { instruction } : {}),
    createdAt: now(),
  };
  file.drafts = [draft, ...file.drafts.filter((candidate) => candidate.id !== draft.id)];
  persist();
  changed();
  return draft;
}

export function saveDraft(change: MailDraft): MailDraft {
  const file = store();
  const draft = file.drafts.find((candidate) => candidate.id === change.id);
  if (!draft) throw new DomainError('NOT_FOUND', 'That draft is gone.');
  if (draft.status === 'sent') throw new DomainError('INVALID', 'That draft was already sent.');
  const clean = (list: unknown) =>
    (Array.isArray(list) ? list : [])
      .map((entry) => ({ ...(entry?.name ? { name: String(entry.name) } : {}), address: String(entry?.address ?? '').trim().toLowerCase() }))
      .filter((entry) => /^[^\s@]+@[^\s@]+$/.test(entry.address));
  Object.assign(draft, {
    to: clean(change.to),
    cc: clean(change.cc),
    subject: String(change.subject ?? '').slice(0, 400),
    body: String(change.body ?? '').slice(0, 50_000),
    status: 'review',
    error: undefined,
  });
  persist();
  changed();
  return draft;
}

export function discardDraft(id: string): void {
  const file = store();
  file.drafts = file.drafts.filter((draft) => draft.id !== id || draft.status === 'sent');
  persist();
  changed();
}

/** For the sender: the pieces of state a send touches. */
export const draftContext = (id: string) => {
  const file = store();
  const draft = file.drafts.find((candidate) => candidate.id === id);
  if (!draft) throw new DomainError('NOT_FOUND', 'That draft is gone.');
  const item = draft.itemId ? file.items.find((candidate) => candidate.id === draft.itemId) : undefined;
  return { draft, account: requireAccount(draft.accountId), item, body: item ? file.bodies[item.id] : undefined };
};

export function recordSent(draft: MailDraft, item: MailItem | undefined, error?: string): void {
  if (error) {
    draft.status = 'failed';
    draft.error = error;
  } else {
    draft.status = 'sent';
    draft.sentAt = now();
    draft.error = undefined;
    if (item) settle(item, item.verdict.lane === 'waiting' ? 'You followed up' : 'You replied');
    log({ itemId: item?.id, accountId: draft.accountId, kind: 'sent', summary: `Sent “${draft.subject}” to ${draft.to.map((to) => displayName(to)).join(', ')}`, auto: false });
  }
  persist();
  changed();
}

// ─── Assistant check ───────────────────────────────────────────────────────

export async function testAssistant(command: string): Promise<AssistantTestResult> {
  const started = Date.now();
  if (!(await approveCommand(command))) return { ok: false, output: 'Not allowed, so it was not run.', ms: 0 };
  try {
    const output = await runAssistant(command, 'This is a connection test from myOS. Reply with only this JSON and nothing else: {"ok": true}', 90);
    const parsed = extractJson(output) as { ok?: unknown } | undefined;
    return { ok: parsed?.ok === true, output: output.trim().slice(0, 400), ms: Date.now() - started };
  } catch (error) {
    return { ok: false, output: (error as Error).message, ms: Date.now() - started };
  }
}
