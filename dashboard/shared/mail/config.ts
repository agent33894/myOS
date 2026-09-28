import type { MailCategory, MailConfig, MailFiling, MailLane, MailProvider, MailRule } from './types';

/** Server settings for the providers myOS knows. App-specific passwords work with both. */
export const PROVIDERS: Readonly<
  Record<MailProvider, { label: string; imap: { host: string; port: number }; smtp: { host: string; port: number }; passwordHelp?: string }>
> = {
  icloud: {
    label: 'iCloud Mail',
    imap: { host: 'imap.mail.me.com', port: 993 },
    smtp: { host: 'smtp.mail.me.com', port: 587 },
    passwordHelp: 'https://account.apple.com/account/manage',
  },
  gmail: {
    label: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993 },
    smtp: { host: 'smtp.gmail.com', port: 465 },
    passwordHelp: 'https://myaccount.google.com/apppasswords',
  },
  imap: {
    label: 'Other (IMAP)',
    imap: { host: '', port: 993 },
    smtp: { host: '', port: 465 },
  },
};

/** The provider an address most likely belongs to. */
export function providerFor(address: string): MailProvider {
  const domain = address.trim().toLowerCase().split('@')[1] ?? '';
  if (['me.com', 'icloud.com', 'mac.com'].includes(domain)) return 'icloud';
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'gmail';
  return 'imap';
}

export const LANES: Readonly<Record<MailLane, { label: string; description: string }>> = {
  action: { label: 'Needs action', description: 'Something for you to do' },
  reply: { label: 'Needs a reply', description: 'Someone is waiting on you' },
  fyi: { label: 'For your eyes', description: 'Worth knowing, nothing to do' },
  waiting: { label: 'Waiting on others', description: 'You asked and have not heard back' },
  handled: { label: 'Handled', description: 'Filed away for you' },
};

export const CATEGORIES: Readonly<Record<MailCategory, { label: string; folder: string }>> = {
  person: { label: 'Person', folder: 'People' },
  newsletter: { label: 'Newsletter', folder: 'Newsletters' },
  promotion: { label: 'Promotion', folder: 'Promotions' },
  receipt: { label: 'Receipt', folder: 'Receipts' },
  shipping: { label: 'Shipping', folder: 'Shipping' },
  notification: { label: 'Notification', folder: 'Notifications' },
  security: { label: 'Security', folder: 'Security' },
  calendar: { label: 'Calendar', folder: 'Calendar' },
  finance: { label: 'Finance', folder: 'Finance' },
  travel: { label: 'Travel', folder: 'Travel' },
  social: { label: 'Social', folder: 'Social' },
};

export const isCategory = (value: unknown): value is MailCategory => typeof value === 'string' && value in CATEGORIES;
export const isLane = (value: unknown): value is MailLane => typeof value === 'string' && value in LANES;

/** Filed mail goes under this top-level folder (a label on Gmail). */
export const FOLDER_ROOT = 'myOS';

export const filingLabel = (filing: MailFiling): string =>
  filing === 'keep' ? 'Stays in the inbox' : filing === 'archive' ? 'Archive' : `${FOLDER_ROOT}/${filing.folder}`;

/** Presets for the optional assistant command. Each reads the prompt on stdin and prints JSON. */
export const ASSISTANT_PRESETS: ReadonlyArray<{ id: string; label: string; command: string }> = [
  { id: 'claude', label: 'Claude Code', command: 'claude -p --model haiku --tools "" --no-session-persistence' },
  { id: 'codex', label: 'Codex', command: 'codex exec --skip-git-repo-check -' },
  { id: 'gemini', label: 'Gemini CLI', command: 'gemini' },
  { id: 'ollama', label: 'Ollama', command: 'ollama run llama3.2' },
];

export const DEFAULT_MAIL_CONFIG: MailConfig = {
  automation: 'watch',
  interval: 5,
  filing: 'folders',
  archiveOnDone: true,
  tasks: 'suggest',
  notify: true,
  background: true,
  startAtLogin: false,
  lookbackDays: 14,
  followUpDays: 3,
  brief: '',
  vips: [],
  muted: [],
  rules: [],
  assistant: { enabled: false, command: ASSISTANT_PRESETS[0].command, timeoutSeconds: 120 },
  signature: '',
};

const isBool = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumberIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().toLowerCase()).filter(Boolean))] : [];

function isRule(value: unknown): value is MailRule {
  const rule = value as MailRule | null;
  return (
    typeof rule?.id === 'string' &&
    typeof rule.name === 'string' &&
    Array.isArray(rule.when) &&
    rule.when.every((condition) => typeof condition?.field === 'string' && typeof condition.value === 'string') &&
    typeof rule.then === 'object' &&
    rule.then !== null &&
    isBool(rule.enabled)
  );
}

/** Any stored or renderer-sent config, made whole and valid; unknown values fall back to defaults. */
export function normalizeMailConfig(value: unknown, base: MailConfig = DEFAULT_MAIL_CONFIG): MailConfig {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const pick = <K extends keyof MailConfig>(key: K, valid: (candidate: unknown) => boolean): MailConfig[K] =>
    key in input && valid(input[key]) ? (input[key] as MailConfig[K]) : base[key];
  const assistant = (input.assistant ?? {}) as Record<string, unknown>;
  return {
    automation: pick('automation', (v) => v === 'watch' || v === 'sort'),
    interval: pick('interval', (v) => isNumberIn(v, 1, 240)),
    filing: pick('filing', (v) => v === 'folders' || v === 'archive'),
    archiveOnDone: pick('archiveOnDone', isBool),
    tasks: pick('tasks', (v) => v === 'off' || v === 'suggest' || v === 'auto'),
    notify: pick('notify', isBool),
    background: pick('background', isBool),
    startAtLogin: pick('startAtLogin', isBool),
    lookbackDays: pick('lookbackDays', (v) => isNumberIn(v, 1, 90)),
    followUpDays: pick('followUpDays', (v) => isNumberIn(v, 1, 30)),
    brief: typeof input.brief === 'string' ? input.brief.slice(0, 4000) : base.brief,
    vips: 'vips' in input ? strings(input.vips) : base.vips,
    muted: 'muted' in input ? strings(input.muted) : base.muted,
    rules: Array.isArray(input.rules) ? input.rules.filter(isRule) : base.rules,
    assistant: {
      enabled: isBool(assistant.enabled) ? assistant.enabled : base.assistant.enabled,
      command: typeof assistant.command === 'string' ? assistant.command.trim() : base.assistant.command,
      timeoutSeconds: isNumberIn(assistant.timeoutSeconds, 10, 600) ? assistant.timeoutSeconds : base.assistant.timeoutSeconds,
    },
    signature: typeof input.signature === 'string' ? input.signature.slice(0, 500) : base.signature,
  };
}
