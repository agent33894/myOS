import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import type { MailDraft } from '../../shared/mail/types';
import { DomainError } from '../errors';
import { draftContext, recordSent } from './engine';
import { withClient } from './imap';
import { openSecret } from './store';

/**
 * The only code in myOS that sends mail. It is reachable from one IPC
 * channel, `mail:draft:send`, which the renderer calls from the confirmation
 * the user clicks. The engine, rules, and assistant only ever write drafts.
 * (`send.test.ts` keeps it that way.)
 */

const quote = (text: string, from: string, date: string) => {
  const lines = text.split('\n').slice(0, 60).map((line) => `> ${line}`);
  const when = new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return `\n\nOn ${when}, ${from} wrote:\n${lines.join('\n')}`;
};

export async function sendApprovedDraft(id: string): Promise<MailDraft> {
  const { draft, account, item, body } = draftContext(id);
  if (draft.status === 'sent') throw new DomainError('INVALID', 'That draft was already sent.');
  if (draft.to.length === 0) throw new DomainError('INVALID', 'Add someone to send it to.');
  if (!draft.body.trim()) throw new DomainError('INVALID', 'Write something before sending.');

  const original = item && item.verdict.lane !== 'waiting' && body ? quote(body, item.from.name || item.from.address, item.date) : '';
  const composer = new MailComposer({
    from: account.name ? { name: account.name, address: account.address } : account.address,
    to: draft.to,
    cc: draft.cc.length ? draft.cc : undefined,
    subject: draft.subject,
    text: `${draft.body.trim()}${original}`,
    ...(draft.inReplyTo ? { inReplyTo: draft.inReplyTo, references: draft.references } : {}),
  });
  const raw = await composer.compile().build();
  const transport = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.port === 465,
    requireTLS: account.smtp.port !== 465,
    auth: { user: account.address, pass: openSecret(account.secret) },
  });
  try {
    await transport.sendMail({
      envelope: { from: account.address, to: [...draft.to, ...draft.cc].map((to) => to.address) },
      raw,
    });
  } catch (error) {
    const message = (error as Error).message || 'The mail server did not accept the message.';
    recordSent(draft, item, message);
    throw new DomainError('INTERNAL', message);
  } finally {
    transport.close();
  }
  // Gmail files what its SMTP server sends; other servers leave that to the client.
  if (account.provider !== 'gmail') {
    await withClient(account, async (client, folders) => {
      if (folders.sent) await client.append(folders.sent, raw, ['\\Seen']);
    }).catch((error: Error) => console.warn('[mail] Sent, but could not save to Sent:', error.message));
  }
  recordSent(draft, item);
  return draft;
}
