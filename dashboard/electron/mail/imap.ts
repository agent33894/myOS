import { ImapFlow, type FetchMessageObject, type ListResponse } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import { createHash } from 'crypto';
import type { MailFacts } from '../../shared/mail/classify';
import type { MailAddress } from '../../shared/mail/types';
import { FOLDER_ROOT } from '../../shared/mail/config';
import { openSecret, type StoredAccount } from './store';

/** Enough of a message to read and classify it; attachments past this are never downloaded. */
const SOURCE_LIMIT = 160_000;

interface Pooled {
  client: ImapFlow;
  /** Operations on one account run one at a time over one connection. */
  queue: Promise<unknown>;
  idle?: NodeJS.Timeout;
  folders?: Folders;
}

export interface Folders {
  delimiter: string;
  archive: string;
  sent?: string;
  /** Gmail: "archive" is All Mail, where MOVE out would delete; restores copy instead. */
  archiveIsAll: boolean;
  paths: Set<string>;
}

const pool = new Map<string, Pooled>();
const IDLE_CLOSE_MS = 90_000;

export function connect(account: Pick<StoredAccount, 'imap' | 'address'>, password: string): ImapFlow {
  return new ImapFlow({
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.port === 993,
    auth: { user: account.address, pass: password },
    logger: false,
    disableAutoIdle: true,
    clientInfo: { name: 'myOS' },
  });
}

/** Sign in once and sign out: proves an app password before it is saved. */
export async function verifyLogin(account: Pick<StoredAccount, 'imap' | 'address'>, password: string): Promise<void> {
  const client = connect(account, password);
  try {
    await client.connect();
  } catch (error) {
    throw new Error(loginMessage(error));
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export function loginMessage(error: unknown): string {
  const raw = error as { authenticationFailed?: boolean; responseText?: string; code?: string; message?: string };
  if (raw?.authenticationFailed) return 'The server did not accept that address and app password.';
  if (raw?.code === 'ENOTFOUND' || raw?.code === 'EAI_AGAIN') return 'Could not reach the mail server. Check the connection.';
  if (raw?.code === 'ETIMEDOUT' || raw?.code === 'ECONNREFUSED') return 'The mail server did not answer.';
  return raw?.responseText || raw?.message || 'Could not sign in to the mail server.';
}

function release(account: string, pooled: Pooled): void {
  if (pooled.idle) clearTimeout(pooled.idle);
  pooled.idle = setTimeout(() => {
    pool.delete(account);
    void pooled.client.logout().catch(() => pooled.client.close());
  }, IDLE_CLOSE_MS);
}

/** Run `work` with a signed-in client for the account, reusing a warm connection. */
export function withClient<T>(account: StoredAccount, work: (client: ImapFlow, folders: Folders) => Promise<T>): Promise<T> {
  let pooled = pool.get(account.id);
  if (!pooled) {
    pooled = { client: connect(account, openSecret(account.secret)), queue: Promise.resolve() };
    pool.set(account.id, pooled);
  }
  const current = pooled;
  const run = current.queue.then(async () => {
    if (current.idle) clearTimeout(current.idle);
    if (!current.client.usable) {
      // A dropped connection cannot be reopened; sign in again with a new client.
      current.client.close();
      current.client = connect(account, openSecret(account.secret));
      current.folders = undefined;
      try {
        await current.client.connect();
      } catch (error) {
        pool.delete(account.id);
        throw new Error(loginMessage(error));
      }
    }
    current.folders ??= await discoverFolders(current.client);
    try {
      return await work(current.client, current.folders);
    } finally {
      release(account.id, current);
    }
  });
  current.queue = run.catch(() => undefined);
  return run;
}

export function closeAll(): void {
  for (const [id, pooled] of pool) {
    if (pooled.idle) clearTimeout(pooled.idle);
    pooled.client.close();
    pool.delete(id);
  }
}

export function forget(accountId: string): void {
  const pooled = pool.get(accountId);
  if (!pooled) return;
  pooled.client.close();
  pool.delete(accountId);
}

async function discoverFolders(client: ImapFlow): Promise<Folders> {
  const list: ListResponse[] = await client.list();
  const special = (use: string) => list.find((box) => box.specialUse === use)?.path;
  const all = special('\\All');
  const archive = special('\\Archive');
  const delimiter = list.find((box) => box.path.toUpperCase() === 'INBOX')?.delimiter || list[0]?.delimiter || '/';
  const folders: Folders = {
    delimiter,
    archive: archive ?? all ?? 'Archive',
    sent: special('\\Sent'),
    archiveIsAll: !archive && Boolean(all),
    paths: new Set(list.map((box) => box.path)),
  };
  if (!folders.paths.has(folders.archive)) {
    await client.mailboxCreate(folders.archive).catch(() => undefined);
    folders.paths.add(folders.archive);
  }
  return folders;
}

/** The server path for a myOS folder ("Receipts" → "myOS/Receipts"), created on first use. */
export async function ensureFolder(client: ImapFlow, folders: Folders, name: string): Promise<string> {
  const path = `${FOLDER_ROOT}${folders.delimiter}${name}`;
  if (folders.paths.has(path)) return path;
  const created = await client.mailboxCreate([FOLDER_ROOT, name]).catch((error: { mailboxExists?: boolean }) => {
    if (error?.mailboxExists) return { path };
    throw error;
  });
  folders.paths.add(created.path);
  return created.path;
}

/** UID of a message found by Message-ID in a folder, if it is there. */
export async function findByMessageId(client: ImapFlow, folder: string, messageId: string): Promise<number | undefined> {
  const lock = await client.getMailboxLock(folder);
  try {
    const found = await client.search({ header: { 'message-id': messageId } }, { uid: true });
    return found && found.length ? found[found.length - 1] : undefined;
  } finally {
    lock.release();
  }
}

export const FETCH_QUERY = {
  uid: true,
  envelope: true,
  flags: true,
  internalDate: true,
  bodyStructure: true,
  size: true,
  source: { maxLength: SOURCE_LIMIT },
} as const;

/** Messages larger than this are read from their first bytes only, never whole. */
const WHOLE_LIMIT = 2_000_000;

/**
 * Fetch and parse messages in the selected mailbox. Parsing waits until the
 * fetch finishes (no other command may run inside it). A server that returns
 * an empty partial body gets asked once more for the whole message.
 */
export async function fetchMessages(client: ImapFlow, uids: number[], limit = SOURCE_LIMIT): Promise<FetchedMail[]> {
  if (uids.length === 0) return [];
  const raw: FetchMessageObject[] = [];
  for await (const message of client.fetch(uids, { ...FETCH_QUERY, source: { maxLength: limit } }, { uid: true })) raw.push(message);
  for (const message of raw) {
    if (message.source?.length || !message.size || message.size > WHOLE_LIMIT) continue;
    const whole = await client.fetchOne(String(message.uid), { uid: true, source: true }, { uid: true });
    if (whole && whole.source) message.source = whole.source;
  }
  return Promise.all(raw.map(readFetched));
}

export interface FetchedMail {
  uid: number;
  messageId: string;
  facts: MailFacts;
  text: string;
  unread: boolean;
  flagged: boolean;
  answered: boolean;
  inReplyTo?: string;
  references: string[];
  attachments: string[];
  unsubscribe?: string;
  replyTo?: MailAddress;
  gmailThread?: string;
}

const addresses = (list?: Array<{ name?: string; address?: string }>): MailAddress[] =>
  (list ?? [])
    .filter((entry) => entry.address)
    .map((entry) => ({ ...(entry.name ? { name: entry.name } : {}), address: entry.address!.toLowerCase() }));

function hasCalendar(message: FetchMessageObject): boolean {
  const walk = (node?: { type?: string; childNodes?: unknown[] }): boolean =>
    Boolean(node) && (node!.type === 'text/calendar' || (node!.childNodes ?? []).some((child) => walk(child as typeof node)));
  return walk(message.bodyStructure as { type?: string; childNodes?: unknown[] } | undefined);
}

const header = (parsed: ParsedMail, key: string) => parsed.headerLines.find((line) => line.key === key)?.line.replace(/^[^:]+:\s*/, '');

function splitIds(value?: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value ? value.split(/\s+/) : [];
  return list.map((id) => id.trim()).filter((id) => id.startsWith('<'));
}

/** Parse one fetched message into what triage reads, never throwing on odd mail. */
export async function readFetched(message: FetchMessageObject): Promise<FetchedMail> {
  const envelope = message.envelope ?? {};
  let parsed: ParsedMail | null = null;
  try {
    parsed = message.source ? await simpleParser(message.source, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true }) : null;
  } catch {
    parsed = null;
  }
  const flags = message.flags ?? new Set<string>();
  const from = addresses(envelope.from)[0] ?? { address: 'unknown@unknown' };
  const text = (parsed?.text ?? '').replace(/\n{3,}/g, '\n\n').trim();
  const list = parsed?.headers.get('list') as { unsubscribe?: { url?: string }; id?: { id?: string } } | undefined;
  const unsubscribe = list?.unsubscribe?.url && /^https:\/\//i.test(list.unsubscribe.url) ? list.unsubscribe.url : undefined;
  const messageId = envelope.messageId || parsed?.messageId || `<uid-${message.uid}-${createHash('sha1').update(text).digest('hex').slice(0, 10)}@myos>`;
  const date = new Date(envelope.date ?? message.internalDate ?? Date.now());
  return {
    uid: message.uid,
    messageId,
    text,
    unread: !flags.has('\\Seen'),
    flagged: flags.has('\\Flagged'),
    answered: flags.has('\\Answered'),
    inReplyTo: envelope.inReplyTo || undefined,
    references: splitIds(parsed?.references),
    attachments: (parsed?.attachments ?? []).filter((file) => file.contentDisposition === 'attachment' && file.filename).map((file) => file.filename!).slice(0, 12),
    unsubscribe,
    replyTo: addresses(envelope.replyTo)[0],
    facts: {
      from,
      to: addresses(envelope.to),
      cc: addresses(envelope.cc),
      subject: envelope.subject?.trim() || '(no subject)',
      text,
      date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      listId: list?.id?.id || header(parsed ?? ({ headerLines: [] } as unknown as ParsedMail), 'list-id'),
      hasUnsubscribe: Boolean(list?.unsubscribe),
      precedence: parsed ? header(parsed, 'precedence') : undefined,
      autoSubmitted: parsed ? header(parsed, 'auto-submitted') : undefined,
      calendar: hasCalendar(message),
      flagged: flags.has('\\Flagged'),
      answersMe: false,
    },
  };
}

export const itemIdFor = (accountId: string, messageId: string) =>
  `${accountId}:${createHash('sha1').update(messageId).digest('hex').slice(0, 16)}`;
