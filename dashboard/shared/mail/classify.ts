import { CATEGORIES } from './config';
import { findDeadline } from './deadline';
import type { MailAddress, MailCategory, MailConfig, MailFiling, MailLane, MailRule, MailVerdict } from './types';

/** What triage reads from one message. Built by the engine from headers and the parsed body. */
export interface MailFacts {
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  subject: string;
  /** Plain text of the body. */
  text: string;
  /** ISO timestamp. */
  date: string;
  listId?: string;
  hasUnsubscribe: boolean;
  precedence?: string;
  autoSubmitted?: string;
  /** Carries a text/calendar invitation. */
  calendar: boolean;
  /** Gmail's own tab for the message, when known. */
  gmailCategory?: 'promotions' | 'social' | 'updates' | 'forums';
  flagged: boolean;
  /** Replies to a message the user sent. */
  answersMe: boolean;
}

export interface TriageContext {
  /** Every address of the user, lowercase. */
  me: readonly string[];
  /** People the user has written to recently, lowercase addresses. */
  known: ReadonlySet<string>;
  config: Pick<MailConfig, 'vips' | 'muted' | 'rules' | 'filing'>;
  projects: ReadonlyArray<{ id: string; title: string }>;
  now?: Date;
}

const lower = (value?: string) => (value ?? '').toLowerCase();
const domainOf = (address: string) => lower(address).split('@')[1] ?? '';

const SIGN_OFF = /^(thanks|thank you|thanks so much|many thanks|best|best wishes|all the best|cheers|regards|kind regards|best regards|warmly|warm regards|love|xo|xoxo|sincerely|talk soon|see you|take care)[,.!]*$/i;

/** The message text without quoted replies and signatures, so questions are the sender's own. */
export function ownText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^on .{4,200}wrote:$/i.test(trimmed) || /^-{2,}\s*original message\s*-{2,}$/i.test(trimmed)) break;
    if (/^(?:from|sent|de|von):\s/i.test(trimmed) && kept.length > 2) break;
    if (trimmed === '--' || trimmed === '-- ') break;
    if (/^sent from my (iphone|ipad|phone|android)/i.test(trimmed)) break;
    if (trimmed.startsWith('>')) continue;
    kept.push(line);
  }
  // A sign-off ("Thanks,\nDan") and the name under it are not the message.
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  const last = kept.length - 1;
  if (last > 0 && /^[\p{L}][\p{L}.' -]{0,30}$/u.test(kept[last].trim()) && kept[last].trim().split(/\s+/).length <= 3) {
    const before = kept[last - 1].trim();
    if (!before || SIGN_OFF.test(before)) kept.splice(before ? last - 1 : last);
  } else if (last > 0 && SIGN_OFF.test(kept[last].trim())) kept.pop();
  return kept.join('\n').trim();
}

/** A calm one-line preview: the first real sentence, without greetings or tracking junk. */
export function snippetOf(text: string, max = 180): string {
  const body = ownText(text)
    .replace(/\[(?:image|cid):[^\]]*\]/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[ \t]+/g, ' ');
  const lines = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(hi|hello|hey|dear|good (morning|afternoon|evening))\b[^.!?]{0,40}[,!]?$/i.test(line))
    .filter((line) => !/^(view (this|in) (email|browser)|unsubscribe|having trouble viewing)/i.test(line));
  const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > max ? `${joined.slice(0, max - 1).trimEnd()}…` : joined;
}

const cleanSubject = (subject: string) =>
  subject
    .replace(/^(\s*(re|fw|fwd|aw|wg)\s*(\[\d+\])?:\s*)+/i, '')
    .replace(/^\s*\[(external|ext)\]\s*/i, '')
    .replace(/^\s*(action required|action needed|reminder|important|urgent)\s*[:\-–]\s*/i, '')
    .trim() || '(no subject)';

export const displayName = (address: MailAddress) => address.name?.trim() || address.address.split('@')[0];
const firstName = (address: MailAddress) => {
  const name = address.name?.trim();
  if (!name) return address.address.split('@')[0];
  const [last, first] = name.split(',').map((part) => part.trim());
  return (first || last || name).split(/\s+/)[0];
};

const AUTOMATED_SENDER = /(^|[._+-])(no-?reply|do-?not-?reply|donotreply|notifications?|notify|alerts?|mailer|mailer-daemon|news|newsletter|info|updates?|hello|team|support|billing|receipts?|orders?|marketing|digest|bounce|automated)([._+-]|@)/i;

const SOCIAL_DOMAINS = /(^|\.)(facebookmail\.com|linkedin\.com|twitter\.com|x\.com|instagram\.com|nextdoor\.com|pinterest\.com|reddit(mail)?\.com|tiktok\.com|threads\.net|meetup\.com|strava\.com)$/i;

const SIGNALS: Array<[MailCategory, RegExp]> = [
  ['security', /\b(verification code|security code|one[- ]time (pass)?code|passcode|sign[- ]in (attempt|alert|code)|new (sign[- ]in|login)|login attempt|password (reset|change)|reset your password|two[- ]factor|2fa|2-step|suspicious activity|confirm (it'?s|it was) you|security alert)\b/i],
  ['calendar', /^(invitation|updated invitation|new event|accepted|declined|tentative|canceled event|cancelled event)\b|\binvited you to\b/i],
  ['shipping', /\b(has shipped|was shipped|shipment|out for delivery|delivered|delivery (update|attempt)|tracking number|track (your|my) (package|order)|your package|on its way|arriving (today|tomorrow))\b/i],
  ['receipt', /\b(receipt|order confirm(ation|ed)|your order|order #|order number|thanks for your (order|purchase)|purchase confirm|payment (received|confirmation|successful)|you paid|invoice paid|subscription (renewed|confirmation))\b/i],
  ['travel', /\b(itinerary|boarding pass|flight|check[- ]in (now|for your)|your (trip|stay|reservation|booking)|booking confirm|reservation confirm|hotel|rental car|e-?ticket)\b/i],
  ['finance', /\b(statement is (ready|available)|e-?statement|bill is (ready|due)|payment (due|reminder)|autopay|minimum payment|balance|account summary|direct deposit|tax (form|document)|1099|w-2|invoice)\b/i],
  ['promotion', /(\d{1,2}%\s*off|\bsale\b|\bdeals?\b|limited time|\bcoupon|promo(tion)? code|free shipping|exclusive offer|\bsave \$?\d|black friday|cyber monday|last chance|shop now)/i],
];

const ACTION = /\b(please sign|signature (required|requested)|sign (the|your|this)|docusign|review and sign|action (required|needed)|needs? your (approval|signature|review)|approve|approval (needed|required|requested)|fill (out|in)|complete (the|your|this) (form|survey|application|registration)|payment (is )?due|bill is due|past due|overdue|rsvp|respond by|please (confirm|submit|upload|send|schedule|book|pay|complete|review|update)|confirm your (appointment|reservation|attendance|booking)|expir(es|ing|ation)|renew(al)?|verify your (account|identity|email)|finish setting up|accept (the|this|your) (invitation|invite|offer))\b/i;
const QUESTION = /\?|\b(can you|could you|would you|will you|are you (free|able|available|around)|do you (have|know|want|think)|let me know|what do you think|any thoughts|thoughts on|please (advise|reply|respond|let me know)|get back to me|when (can|could|are) you|how about|would it be possible)\b/i;
const URGENT = /\b(urgent|asap|as soon as possible|time[- ]sensitive|immediately|right away|important)\b/i;

/** The sender's own words ask something of the reader. Also used for sent mail under Waiting. */
export const asksSomething = (text: string) => QUESTION.test(ownText(text));

/** True for an entry ("ann@x.com", "@x.com", "x.com") that covers `address`. */
export function matchesPerson(entry: string, address: string): boolean {
  const who = lower(entry).trim();
  const target = lower(address).trim();
  if (!who || !target) return false;
  if (who.includes('@') && !who.startsWith('@')) return who === target;
  const domain = who.replace(/^@/, '');
  const from = domainOf(target);
  return from === domain || from.endsWith(`.${domain}`);
}

const onList = (list: readonly string[], address: string) => list.some((entry) => matchesPerson(entry, address));

function isAutomated(facts: MailFacts): boolean {
  const auto = lower(facts.autoSubmitted);
  return (
    Boolean(facts.listId) ||
    facts.hasUnsubscribe ||
    /^(bulk|list|junk)$/.test(lower(facts.precedence)) ||
    (auto !== '' && auto !== 'no') ||
    AUTOMATED_SENDER.test(lower(facts.from.address)) ||
    facts.gmailCategory !== undefined
  );
}

function categoryOf(facts: MailFacts, automated: boolean): MailCategory {
  const subject = facts.subject;
  const head = `${subject}\n${facts.text.slice(0, 1500)}`;
  if (facts.calendar) return 'calendar';
  if (SOCIAL_DOMAINS.test(domainOf(facts.from.address)) || facts.gmailCategory === 'social') return 'social';
  for (const [category, pattern] of SIGNALS) {
    // A person's message about a flight is still a person's message.
    if (!automated && category !== 'calendar') continue;
    if (category === 'calendar' ? pattern.test(subject) : pattern.test(head)) return category;
  }
  if (!automated) return 'person';
  if (facts.gmailCategory === 'promotions') return 'promotion';
  if (facts.listId || facts.hasUnsubscribe || facts.gmailCategory === 'forums') return 'newsletter';
  return 'notification';
}

const addressed = (facts: MailFacts, me: readonly string[]) => facts.to.some((to) => me.includes(lower(to.address)));

/** Filing for mail that needs no attention: its kind's folder, or plain archive. */
export const filingFor = (category: MailCategory, mode: MailConfig['filing']): MailFiling =>
  mode === 'folders' ? { folder: CATEGORIES[category].folder } : 'archive';

function matchProject(facts: MailFacts, projects: TriageContext['projects']): string | undefined {
  const haystack = ` ${lower(`${facts.subject} ${facts.text.slice(0, 2000)}`).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const hit = projects
    .filter((project) => project.title.trim().length >= 4)
    .find((project) => haystack.includes(` ${lower(project.title).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `));
  return hit?.id;
}

/** myOS's own reading of a message: no network, no model, just headers and words. */
export function heuristicVerdict(facts: MailFacts, context: TriageContext): MailVerdict {
  const automated = isAutomated(facts);
  const category = categoryOf(facts, automated);
  const own = ownText(facts.text);
  const words = `${facts.subject}\n${own}`;
  const sender = lower(facts.from.address);
  const known = context.known.has(sender);
  const direct = addressed(facts, context.me);
  const deadline = findDeadline(words, new Date(facts.date));
  const reasons: string[] = [];
  let lane: MailLane;

  if (category === 'person') {
    const asks = QUESTION.test(own);
    const acts = ACTION.test(words);
    if (acts && direct) {
      lane = 'action';
      reasons.push(`${firstName(facts.from)} asked you to do something`);
    } else if (asks && direct) {
      lane = 'reply';
      reasons.push(`${firstName(facts.from)} asked you a question`);
    } else if (facts.answersMe) {
      lane = asks ? 'reply' : 'fyi';
      reasons.push('Answers something you sent');
    } else {
      lane = 'fyi';
      reasons.push(direct ? 'Written to you' : 'You were copied');
    }
    if (known) reasons.push('From someone you write to');
  } else if (category === 'calendar') {
    lane = 'action';
    reasons.push('An invitation to answer');
  } else if (category === 'security') {
    lane = 'fyi';
    reasons.push('A security notice from an account of yours');
  } else if (ACTION.test(words) && !['promotion', 'newsletter', 'social'].includes(category)) {
    lane = 'action';
    reasons.push('Asks you to do something');
  } else if (category === 'travel') {
    lane = 'fyi';
    reasons.push('Travel plans');
  } else {
    lane = 'handled';
    reasons.push(
      {
        newsletter: 'A newsletter or mailing list',
        promotion: 'A promotion',
        receipt: 'A receipt',
        shipping: 'A delivery update',
        notification: 'An automated notification',
        social: 'A social network notification',
        finance: 'An account statement',
      }[category as string] ?? 'Automated mail',
    );
  }

  if (deadline && lane !== 'handled') reasons.push('Mentions a deadline');
  const now = (context.now ?? new Date()).getTime();
  const soon = deadline !== undefined && new Date(`${deadline}T23:59:59`).getTime() - now < 3 * 86_400_000;
  const priority: MailVerdict['priority'] =
    (category === 'person' && URGENT.test(words)) || (soon && lane === 'action') || (category === 'security' && now - new Date(facts.date).getTime() < 3_600_000)
      ? 'high'
      : lane === 'handled'
        ? 'low'
        : 'normal';

  const subject = cleanSubject(facts.subject);
  const project = matchProject(facts, context.projects);
  const task =
    lane === 'action'
      ? { title: subject, ...(project ? { project } : {}) }
      : lane === 'reply'
        ? { title: `Reply to ${firstName(facts.from)}: ${subject}`, ...(project ? { project } : {}) }
        : undefined;

  return {
    lane,
    category,
    priority,
    summary: snippetOf(facts.text, 160) || subject,
    reasons,
    ...(deadline && lane !== 'handled' ? { due: deadline } : {}),
    ...(task ? { task } : {}),
    filing: lane === 'handled' ? filingFor(category, context.config.filing) : 'keep',
    ...(lane === 'handled' ? { markRead: false } : {}),
    source: 'heuristic',
  };
}

function ruleMatches(rule: MailRule, facts: MailFacts, verdict: MailVerdict): boolean {
  if (!rule.enabled || rule.when.length === 0) return false;
  return rule.when.every(({ field, value }) => {
    const needle = lower(value).trim();
    if (!needle) return false;
    switch (field) {
      case 'from':
        return lower(`${facts.from.name ?? ''} <${facts.from.address}>`).includes(needle);
      case 'domain':
        return matchesPerson(needle.includes('@') && !needle.startsWith('@') ? `@${needle.split('@')[1]}` : needle, facts.from.address);
      case 'subject':
        return lower(facts.subject).includes(needle);
      case 'body':
        return lower(facts.text).includes(needle);
      case 'to':
        return [...facts.to, ...facts.cc].some((to) => lower(`${to.name ?? ''} <${to.address}>`).includes(needle));
      case 'category':
        return verdict.category === needle;
      case 'list':
        return (Boolean(facts.listId) || facts.hasUnsubscribe) === (needle === 'yes');
      default:
        return false;
    }
  });
}

/** The first enabled rule that matches, top to bottom. */
export const firstRule = (facts: MailFacts, verdict: MailVerdict, rules: readonly MailRule[]) =>
  rules.find((rule) => ruleMatches(rule, facts, verdict));

/**
 * The verdict the engine acts on: a base reading (the assistant's, else the
 * heuristics'), then people lists, then the user's rules, then safety guards
 * that no rule-less reading can get past.
 */
export function triage(facts: MailFacts, context: TriageContext, base?: MailVerdict): MailVerdict {
  let verdict = base ?? heuristicVerdict(facts, context);
  if (base) {
    // Mail from a person stays a person's mail, whatever the assistant calls it.
    if (!isAutomated(facts) && !['person', 'calendar'].includes(base.category)) verdict = { ...verdict, category: 'person' };
    // A deadline the text states outright beats a model's date arithmetic.
    const stated = findDeadline(`${facts.subject}\n${ownText(facts.text)}`, new Date(facts.date));
    if (stated && verdict.lane !== 'handled') verdict = { ...verdict, due: stated };
  }
  const sender = facts.from.address;
  const mode = context.config.filing;

  if (onList(context.config.muted, sender)) {
    verdict = { ...verdict, lane: 'handled', priority: 'low', filing: filingFor(verdict.category, mode), reasons: ['You muted this sender'], task: undefined };
  }
  if (onList(context.config.vips, sender)) {
    const lane = verdict.lane === 'handled' ? 'fyi' : verdict.lane;
    verdict = { ...verdict, lane, priority: 'high', filing: 'keep', reasons: ['On your always-show list', ...verdict.reasons.slice(0, 2)] };
  }

  const rule = firstRule(facts, verdict, context.config.rules);
  if (rule) {
    const { then } = rule;
    const lane = then.lane ?? (then.filing && then.filing !== 'keep' ? 'handled' : verdict.lane);
    verdict = {
      ...verdict,
      lane,
      filing: then.filing ?? (lane === 'handled' ? (verdict.filing === 'keep' ? filingFor(verdict.category, mode) : verdict.filing) : 'keep'),
      ...(then.priority ? { priority: then.priority } : {}),
      ...(then.markRead !== undefined ? { markRead: then.markRead } : {}),
      ...(then.draft ? { draft: then.draft } : {}),
      ...(then.notify !== undefined ? { notify: then.notify } : {}),
      ...(then.task || then.project
        ? {
            task: { title: verdict.task?.title ?? cleanSubject(facts.subject), ...(then.project ? { project: then.project } : verdict.task?.project ? { project: verdict.task.project } : {}) },
            autoTask: Boolean(then.task),
          }
        : {}),
      reasons: [`Your rule “${rule.name}”`, ...verdict.reasons.filter((reason) => !reason.startsWith('Your rule')).slice(0, 2)],
      source: 'rule',
      ruleId: rule.id,
    };
    return verdict;
  }

  // Guards: only the user's own rules and mute list file a person's mail or a flagged message.
  const muted = onList(context.config.muted, sender);
  if (!muted && verdict.filing !== 'keep' && (verdict.category === 'person' || facts.flagged || onList(context.config.vips, sender))) {
    verdict = { ...verdict, filing: 'keep', lane: verdict.lane === 'handled' ? 'fyi' : verdict.lane };
  }
  if (verdict.lane !== 'handled' && verdict.filing !== 'keep') verdict = { ...verdict, filing: 'keep' };
  return verdict;
}
