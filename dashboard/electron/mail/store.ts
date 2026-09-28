import { safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_MAIL_CONFIG, normalizeMailConfig } from '../../shared/mail/config';
import type { MailAccount, MailActivity, MailConfig, MailDraft, MailItem } from '../../shared/mail/types';
import { getStableAppDataPath } from '../utils/stable-app-data';

/** Per-account sync position and the encrypted app password. Never sent to the renderer. */
export interface StoredAccount extends MailAccount {
  secret: string;
  cursor?: { uidValidity: string; lastUid: number };
  lastSentScan?: string;
  /** Message-IDs of recent sent mail, to recognise replies to the user. */
  sentIds?: string[];
}

interface MailFile {
  version: 1;
  config: MailConfig;
  accounts: StoredAccount[];
  items: MailItem[];
  /** Message text by item id, capped, for reading and for the assistant. */
  bodies: Record<string, string>;
  drafts: MailDraft[];
  activity: MailActivity[];
  /** People the user writes to, lowercase addresses. */
  known: string[];
  /** The assistant command the user allowed in a native dialog; nothing else is ever run. */
  approvedCommand?: string;
}

const BODY_LIMIT = 24_000;
const ACTIVITY_LIMIT = 600;
/** Settled mail is forgotten after this long; open mail is kept until it settles. */
const SETTLED_DAYS = 30;

export const mailDirectory = () => join(getStableAppDataPath(), 'mail');
const statePath = () => join(mailDirectory(), 'state.json');

function empty(): MailFile {
  return { version: 1, config: { ...DEFAULT_MAIL_CONFIG }, accounts: [], items: [], bodies: {}, drafts: [], activity: [], known: [] };
}

/** Read the mail cache as it is on disk (the CLI reads it without the engine). */
export function readMailFile(): MailFile {
  try {
    if (!existsSync(statePath())) return empty();
    const parsed = JSON.parse(readFileSync(statePath(), 'utf8')) as Partial<MailFile>;
    return {
      ...empty(),
      ...parsed,
      version: 1,
      config: normalizeMailConfig(parsed.config),
    };
  } catch (error) {
    console.error('[mail] Could not read the mail cache; starting fresh:', (error as Error).message);
    return empty();
  }
}

let state: MailFile | null = null;
let saveTimer: NodeJS.Timeout | null = null;

/** The engine's live state, loaded once. Mutate it, then call `persist()`. */
export function mail(): MailFile {
  state ??= readMailFile();
  return state;
}

function prune(file: MailFile): void {
  const cutoff = Date.now() - SETTLED_DAYS * 86_400_000;
  file.items = file.items.filter((item) => item.state !== 'done' || new Date(item.settled ?? item.seen).getTime() > cutoff);
  // Bodies are kept for mail still in view; settled mail can be fetched again.
  const open = new Set(file.items.filter((item) => item.state !== 'done').map((item) => item.id));
  file.bodies = Object.fromEntries(Object.entries(file.bodies).filter(([id]) => open.has(id)));
  file.activity = file.activity.slice(0, ACTIVITY_LIMIT);
  file.drafts = file.drafts.filter((draft) => draft.status !== 'sent' || new Date(draft.sentAt ?? draft.createdAt).getTime() > cutoff);
}

function writeNow(): void {
  if (!state) return;
  prune(state);
  mkdirSync(mailDirectory(), { recursive: true, mode: 0o700 });
  const temp = `${statePath()}.tmp`;
  writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
  renameSync(temp, statePath());
}

/** Save soon; many changes in one sync become one write. */
export function persist(immediately = false): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  if (immediately) return writeNow();
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeNow();
  }, 400);
}

export function flush(): void {
  if (saveTimer) persist(true);
}

export const capBody = (text: string) => (text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}\n…` : text);

/**
 * Passwords are encrypted with the OS keychain (Keychain on macOS, the Secret
 * Service or KWallet on Linux). Without a keyring Electron falls back to a
 * fixed key, which the settings page says plainly.
 */
export function secureStorageAvailable(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  if (process.platform !== 'linux') return true;
  return safeStorage.getSelectedStorageBackend() !== 'basic_text';
}

/** Without any keyring (a bare session), the password is kept readable only by this user, and Settings says so. */
export function sealSecret(password: string): string {
  if (!safeStorage.isEncryptionAvailable()) return `plain:${Buffer.from(password, 'utf8').toString('base64')}`;
  return safeStorage.encryptString(password).toString('base64');
}

export const openSecret = (secret: string): string =>
  secret.startsWith('plain:')
    ? Buffer.from(secret.slice(6), 'base64').toString('utf8')
    : safeStorage.decryptString(Buffer.from(secret, 'base64'));

/** What the renderer may see of an account. */
export function publicAccount({ secret: _secret, cursor: _cursor, lastSentScan: _scan, sentIds: _sent, ...account }: StoredAccount): MailAccount {
  return account;
}
