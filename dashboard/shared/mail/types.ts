/**
 * Mail triage: the shapes shared by the main-process engine, the `myos` CLI,
 * and the renderer. Mail lives on the user's own servers; myOS keeps a small
 * cache of what it has looked at under the app data directory, never in the
 * Markdown folder.
 */

export type MailProvider = 'icloud' | 'gmail' | 'imap';

/** Where a message stands for the user. */
export type MailLane =
  /** They have to do something: pay, sign, decide, RSVP. */
  | 'action'
  /** Someone is waiting on their answer or input. */
  | 'reply'
  /** Worth knowing; nothing to do. */
  | 'fyi'
  /** They wrote and are waiting on someone else. */
  | 'waiting'
  /** Needs no attention: filed away (or would be, in Watch mode). */
  | 'handled';

export type MailCategory =
  | 'person'
  | 'newsletter'
  | 'promotion'
  | 'receipt'
  | 'shipping'
  | 'notification'
  | 'security'
  | 'calendar'
  | 'finance'
  | 'travel'
  | 'social';

/** What to do with the message on the server. */
export type MailFiling = 'keep' | 'archive' | { folder: string };

export interface MailAddress {
  name?: string;
  address: string;
}

export interface MailVerdict {
  lane: MailLane;
  category: MailCategory;
  priority: 'high' | 'normal' | 'low';
  /** One plain sentence: what it is and what it needs. */
  summary: string;
  /** Short phrases for "Why it's here". */
  reasons: string[];
  /** YYYY-MM-DD when the message carries a real deadline. */
  due?: string;
  /** Concrete work worth a Task. */
  task?: { title: string; project?: string };
  filing: MailFiling;
  markRead?: boolean;
  /** Who decided: a user rule, the assistant command, myOS's own heuristics, or the user by hand. */
  source: 'rule' | 'assistant' | 'heuristic' | 'you';
  ruleId?: string;
  /** Rule instruction for the assistant to draft a reply (the draft waits in the Outbox). */
  draft?: string;
  notify?: boolean;
  /** The rule asked for a Task to be made without asking. */
  autoTask?: boolean;
}

export interface MailItem {
  /** Stable: account id + Message-ID hash. */
  id: string;
  accountId: string;
  messageId: string;
  /** Mailbox the message sits in now and its UID there (refreshed on every sync). */
  folder: string;
  uid: number;
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  replyTo?: MailAddress;
  subject: string;
  /** ISO timestamp. */
  date: string;
  snippet: string;
  unread: boolean;
  flagged: boolean;
  attachments: string[];
  /** https List-Unsubscribe link, opened in the browser only when the user asks. */
  unsubscribe?: string;
  references: string[];
  verdict: MailVerdict;
  /** open: in its lane · done: dealt with · snoozed: back on `snoozeUntil`. */
  state: 'open' | 'done' | 'snoozed';
  snoozeUntil?: string;
  /** ISO timestamp the item was first seen. */
  seen: string;
  /** ISO timestamp it was settled (done, filed). */
  settled?: string;
  /** A Task made from it (workspace path). */
  taskPath?: string;
  /** Web link for the message, when the provider has one (Gmail). */
  webLink?: string;
}

/** A change myOS made, on the server or in the workspace, with what it takes to undo it. */
export interface MailActivity {
  id: string;
  at: string;
  itemId?: string;
  accountId: string;
  kind: 'filed' | 'archived' | 'read' | 'task' | 'sent' | 'restored' | 'unsubscribe';
  /** "Filed 12 newsletters", "Archived “Your receipt from Apple”". */
  summary: string;
  auto: boolean;
  /** Server move: where the message came from and went, found again by Message-ID. */
  move?: { messageId: string; from: string; to: string; wasUnread: boolean };
  undone?: boolean;
}

export interface MailDraft {
  id: string;
  accountId: string;
  itemId?: string;
  to: MailAddress[];
  cc: MailAddress[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references: string[];
  /** review: waiting for approval · sent · failed (with `error`). */
  status: 'review' | 'sent' | 'failed';
  source: 'assistant' | 'you';
  /** What the draft was asked to do ("decline politely"). */
  instruction?: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface MailAccount {
  id: string;
  provider: MailProvider;
  address: string;
  /** Display name used on sent replies. */
  name?: string;
  imap: { host: string; port: number };
  smtp: { host: string; port: number };
  enabled: boolean;
  /** Other addresses that reach this account (aliases). */
  aliases: string[];
  status: 'ok' | 'error' | 'syncing' | 'never';
  error?: string;
  lastSync?: string;
}

export interface MailAccountDraft {
  provider: MailProvider;
  address: string;
  name?: string;
  password: string;
  imap?: { host: string; port: number };
  smtp?: { host: string; port: number };
}

export type RuleField = 'from' | 'domain' | 'subject' | 'body' | 'to' | 'category' | 'list';

export interface MailRuleCondition {
  field: RuleField;
  /** Case-insensitive text; for `category` a category, for `list` "yes" or "no". */
  value: string;
}

export interface MailRuleAction {
  lane?: MailLane;
  filing?: MailFiling;
  markRead?: boolean;
  priority?: MailVerdict['priority'];
  /** Make a Task automatically. */
  task?: boolean;
  /** Project id for Tasks made from matching mail. */
  project?: string;
  /** Ask the assistant for a reply along these lines; it waits in the Outbox. */
  draft?: string;
  notify?: boolean;
}

export interface MailRule {
  id: string;
  name: string;
  /** Every condition must match. */
  when: MailRuleCondition[];
  then: MailRuleAction;
  enabled: boolean;
}

export interface MailConfig {
  /** watch: decide and show, change nothing on the server · sort: file and archive for real. */
  automation: 'watch' | 'sort';
  /** Minutes between checks. */
  interval: number;
  /** File handled mail into myOS/<Kind> folders (Gmail labels), or just archive it. */
  filing: 'folders' | 'archive';
  /** Archive a message on the server when it is marked done in myOS. */
  archiveOnDone: boolean;
  /** Tasks from mail: never offered, suggested with one click, or made automatically. */
  tasks: 'off' | 'suggest' | 'auto';
  notify: boolean;
  /** Keep running (tray) when the window closes. */
  background: boolean;
  startAtLogin: boolean;
  /** Days of mail the first check looks back over. */
  lookbackDays: number;
  /** Days before a sent question with no answer shows under Waiting. */
  followUpDays: number;
  /** In the user's words: who and what matters. Read by the assistant. */
  brief: string;
  /** Always surfaced, never filed. Addresses or @domains. */
  vips: string[];
  /** Always filed. Addresses or @domains. */
  muted: string[];
  rules: MailRule[];
  assistant: { enabled: boolean; command: string; timeoutSeconds: number };
  /** Sign-off added to drafts. */
  signature: string;
}

export interface MailRunStatus {
  running: boolean;
  lastRun?: string;
  nextRun?: string;
  error?: string;
  /** What the last check did, for the status line. */
  lastSummary?: string;
}

/** Everything the Mail place shows. Bodies are fetched separately. */
export interface MailSnapshot {
  accounts: MailAccount[];
  config: MailConfig;
  items: MailItem[];
  drafts: MailDraft[];
  activity: MailActivity[];
  status: MailRunStatus;
  /** False when the system keyring is unavailable and passwords are only obfuscated. */
  secureStorage: boolean;
}

export interface MailBody {
  id: string;
  text: string;
  /** Links found in the message, for opening in the browser. */
  links: Array<{ text: string; url: string }>;
}

export type MailAction =
  | { kind: 'done' }
  | { kind: 'reopen' }
  | { kind: 'lane'; lane: MailLane; teach?: 'sender' | 'domain' }
  | { kind: 'mute'; scope: 'sender' | 'domain' }
  | { kind: 'vip'; scope: 'sender' | 'domain' }
  | { kind: 'snooze'; until: string }
  /** Apply the suggested filing now (Watch mode's "File these"). */
  | { kind: 'file' }
  | { kind: 'read' }
  | { kind: 'link-task'; taskPath: string };

export interface AssistantTestResult {
  ok: boolean;
  output: string;
  ms: number;
}
