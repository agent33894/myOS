import { describe, expect, it } from 'vitest';
import { extractJson, parseTriage, type AssistantEmail } from './assistant';
import { heuristicVerdict, ownText, triage, type MailFacts, type TriageContext } from './classify';
import { DEFAULT_MAIL_CONFIG, normalizeMailConfig } from './config';
import { findDeadline } from './deadline';
import type { MailRule } from './types';

const ME = 'me@example.com';
const facts = (overrides: Partial<MailFacts> = {}): MailFacts => ({
  from: { name: 'Sarah Chen', address: 'sarah@example.com' },
  to: [{ address: ME }],
  cc: [],
  subject: 'Saturday',
  text: 'Hi,\n\nAre you free on Saturday for lunch?\n\nSarah',
  date: '2026-09-25T10:00:00Z',
  hasUnsubscribe: false,
  calendar: false,
  flagged: false,
  answersMe: false,
  ...overrides,
});
const context = (overrides: Partial<TriageContext['config']> = {}): TriageContext => ({
  me: [ME],
  known: new Set(['sarah@example.com']),
  config: { vips: [], muted: [], rules: [], filing: 'folders', ...overrides },
  projects: [{ id: 'kitchen-renovation', title: 'Kitchen renovation' }],
  now: new Date('2026-09-25T12:00:00Z'),
});
const newsletter = facts({
  from: { name: 'The Weekly', address: 'news@weekly.example' },
  subject: 'This week in design',
  text: 'Ten links we loved. Unsubscribe here.',
  listId: '<weekly.example>',
  hasUnsubscribe: true,
});

describe('heuristic triage', () => {
  it('surfaces a direct question from a person as needing a reply', () => {
    const verdict = heuristicVerdict(facts(), context());
    expect(verdict).toMatchObject({ lane: 'reply', category: 'person', filing: 'keep' });
    expect(verdict.task?.title).toBe('Reply to Sarah: Saturday');
  });

  it('files newsletters and receipts into their folders', () => {
    expect(heuristicVerdict(newsletter, context())).toMatchObject({ lane: 'handled', category: 'newsletter', filing: { folder: 'Newsletters' } });
    const receipt = facts({ from: { address: 'no-reply@shop.example' }, subject: 'Your order #1234 receipt', text: 'Thanks for your order.' });
    expect(heuristicVerdict(receipt, context({ filing: 'archive' }))).toMatchObject({ lane: 'handled', category: 'receipt', filing: 'archive' });
  });

  it('treats a bill with a deadline as an action with that due date', () => {
    const bill = facts({ from: { address: 'billing@power.example' }, subject: 'Your bill is due', text: 'Your payment is due by October 3.', hasUnsubscribe: true });
    expect(heuristicVerdict(bill, context())).toMatchObject({ lane: 'action', due: '2026-10-03' });
  });

  it('only counts the sender’s own words, not quoted history', () => {
    expect(ownText('Thanks!\n\nOn Tue, Sep 22, 2026 at 9:00 AM Me <me@example.com> wrote:\n> Can you send it?')).toBe('Thanks!');
    expect(heuristicVerdict(facts({ text: 'Sounds good.\n> Are you free?' }), context()).lane).toBe('fyi');
  });

  it('files a project’s mail with a task in that project', () => {
    const verdict = heuristicVerdict(facts({ subject: 'Kitchen renovation quote', text: 'Could you please sign the attached quote?' }), context());
    expect(verdict).toMatchObject({ lane: 'action', task: { project: 'kitchen-renovation' } });
  });
});

describe('triage guards and rules', () => {
  it('never files a person’s mail without a rule, whatever the base reading says', () => {
    const base = { ...heuristicVerdict(facts(), context()), lane: 'handled' as const, filing: 'archive' as const, source: 'assistant' as const };
    expect(triage(facts(), context(), base)).toMatchObject({ lane: 'fyi', filing: 'keep' });
  });

  it('keeps always-show senders in view and files muted ones', () => {
    expect(triage(newsletter, context({ vips: ['@weekly.example'] }))).toMatchObject({ lane: 'fyi', filing: 'keep', priority: 'high' });
    expect(triage(facts(), context({ muted: ['sarah@example.com'] }))).toMatchObject({ lane: 'handled', filing: { folder: 'People' } });
  });

  it('applies the first matching rule', () => {
    const rules: MailRule[] = [
      { id: 'a', name: 'School', when: [{ field: 'domain', value: 'example.com' }, { field: 'subject', value: 'saturday' }], then: { lane: 'action', task: true }, enabled: true },
      { id: 'b', name: 'Everything', when: [{ field: 'domain', value: 'example.com' }], then: { filing: 'archive' }, enabled: true },
    ];
    expect(triage(facts(), context({ rules }))).toMatchObject({ lane: 'action', source: 'rule', ruleId: 'a', autoTask: true });
    expect(triage(facts({ subject: 'Hello' }), context({ rules }))).toMatchObject({ lane: 'handled', filing: 'archive', ruleId: 'b' });
  });
});

describe('deadlines', () => {
  const friday = new Date('2026-09-25T10:00:00'); // a Friday
  it('reads cue words anchored to the send date', () => {
    expect(findDeadline('Please reply by Tuesday', friday)).toBe('2026-09-29');
    expect(findDeadline('RSVP by tomorrow', friday)).toBe('2026-09-26');
    expect(findDeadline('Payment due 10/14', friday)).toBe('2026-10-14');
    expect(findDeadline('Expires on Jan 5', friday)).toBe('2027-01-05');
  });
  it('ignores dates that are not deadlines', () => {
    expect(findDeadline('Order placed October 3', friday)).toBeUndefined();
  });
});

describe('assistant protocol', () => {
  it('finds JSON in fenced, enveloped, and chatty output', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson(JSON.stringify({ result: 'Sure! {"a":2}' }))).toEqual({ a: 2 });
    expect(extractJson('nothing here')).toBeUndefined();
  });

  it('keeps well-formed verdicts and drops the rest', () => {
    const guess = heuristicVerdict(facts(), context());
    const emails: AssistantEmail[] = [{ key: '1', facts: facts(), guess }, { key: '2', facts: newsletter, guess }];
    const output = JSON.stringify({
      emails: [
        { id: '1', lane: 'action', category: 'person', priority: 'high', summary: 'Lunch Saturday.', reasons: ['Asked'], due: '2026-09-26', task: { title: 'Book lunch', project: 'nope' }, file: 'keep' },
        { id: '2', lane: 'sideways' },
      ],
    });
    const verdicts = parseTriage(output, emails, { projects: [], filing: 'folders' });
    expect(verdicts.size).toBe(1);
    expect(verdicts.get('1')).toMatchObject({ lane: 'action', due: '2026-09-26', task: { title: 'Book lunch' }, source: 'assistant' });
    expect(verdicts.get('1')?.task?.project).toBeUndefined();
  });
});

it('normalizes stored config, keeping valid values only', () => {
  const config = normalizeMailConfig({ automation: 'sort', interval: 0, vips: ['A@B.com', 'a@b.com', 3], assistant: { enabled: true } });
  expect(config).toMatchObject({ automation: 'sort', interval: DEFAULT_MAIL_CONFIG.interval, vips: ['a@b.com'] });
  expect(config.assistant).toEqual({ ...DEFAULT_MAIL_CONFIG.assistant, enabled: true });
});

it('leaves greetings and sign-offs out of the preview', async () => {
  const { snippetOf } = await import('./classify');
  expect(snippetOf('Hi Alex,\n\nCould you sign it by Tuesday?\n\nThanks,\nDan')).toBe('Could you sign it by Tuesday?');
  expect(snippetOf('Are you free Saturday?\n\nSarah')).toBe('Are you free Saturday?');
});

it('keeps a person’s mail and stated deadlines when the assistant disagrees', () => {
  const mail = facts({ text: 'Could you please sign it by Tuesday?' });
  const base = { ...heuristicVerdict(mail, context()), category: 'social' as const, lane: 'handled' as const, filing: 'archive' as const, due: '2026-09-30', source: 'assistant' as const };
  expect(triage(mail, context(), base)).toMatchObject({ category: 'person', lane: 'fyi', filing: 'keep' });
  expect(triage(mail, context(), { ...base, lane: 'action', filing: 'keep' }).due).toBe('2026-09-29');
});
