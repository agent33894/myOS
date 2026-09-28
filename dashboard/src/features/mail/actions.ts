import { toast } from 'sonner';
import { addDays, nextSaturday, set } from 'date-fns';
import { LANES } from '@shared/mail/config';
import type { MailItem, MailLane } from '@shared/mail/types';
import { actOnMail, makeTaskFromMail, markMailDone, undoMailActivity, useMailStore } from '../../data/mail';
import { invoke } from '../../data/ipc';
import { attempt, toastWithUndo } from '../tasks/actions';

const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);

export function done(items: MailItem[]): void {
  if (items.length === 0) return;
  const archive = useMailStore.getState().snapshot?.config.archiveOnDone;
  attempt(
    markMailDone(items).then(() =>
      toastWithUndo(items.length === 1 ? (archive ? 'Done · archived' : 'Done') : `${items.length} emails done`),
    ),
    'Could not finish that email',
  );
}

export function makeTask(item: MailItem, overrides?: { title?: string; due?: string; project?: string }): void {
  attempt(makeTaskFromMail(item, overrides).then(() => toastWithUndo('Made a task')), 'Could not make the task');
}

export function moveToLane(items: MailItem[], lane: MailLane, teach?: 'sender' | 'domain'): void {
  actOnMail(
    items.map((item) => item.id),
    { kind: 'lane', lane, ...(teach ? { teach } : {}) },
  )
    .then(() => toast.success(teach ? `Moved to ${LANES[lane].label}, and it will be from now on` : `Moved to ${LANES[lane].label}`))
    .catch(failed('Could not move that email'));
}

export function mute(item: MailItem, scope: 'sender' | 'domain'): void {
  actOnMail([item.id], { kind: 'mute', scope })
    .then(() => toast.success(scope === 'sender' ? 'Muted. Their mail will be filed for you.' : 'Muted everyone at that address'))
    .catch(failed('Could not mute that sender'));
}

export function alwaysShow(item: MailItem, scope: 'sender' | 'domain'): void {
  actOnMail([item.id], { kind: 'vip', scope })
    .then(() => toast.success('Their mail will always be shown to you'))
    .catch(failed('Could not update your lists'));
}

/** Snooze choices: later today (evening), tomorrow morning, the weekend, next week. */
export function snoozeTimes(now = new Date()) {
  const morning = (date: Date) => set(date, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
  const evening = set(now, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 });
  return [
    ...(now < evening ? [{ label: 'This evening', until: evening }] : []),
    { label: 'Tomorrow morning', until: morning(addDays(now, 1)) },
    { label: 'This weekend', until: morning(nextSaturday(now)) },
    { label: 'Next week', until: morning(addDays(now, 7)) },
  ];
}

export function snooze(items: MailItem[], until: Date, label: string): void {
  actOnMail(
    items.map((item) => item.id),
    { kind: 'snooze', until: until.toISOString() },
  )
    .then(() =>
      toast.success(`Snoozed until ${label.toLowerCase()}`, {
        action: { label: 'Undo', onClick: () => void actOnMail(items.map((item) => item.id), { kind: 'reopen' }) },
      }),
    )
    .catch(failed('Could not snooze that email'));
}

export function fileNow(items: MailItem[]): void {
  actOnMail(
    items.map((item) => item.id),
    { kind: 'file' },
  )
    .then(() => toast.success(items.length === 1 ? 'Filed' : `Filed ${items.length} emails`))
    .catch(failed('Could not file those emails'));
}

export function undoActivity(id: string): void {
  undoMailActivity(id)
    .then(() => toast.success('Put back'))
    .catch(failed('Could not put that back'));
}

/** Only https links leave the app, and only in the browser. */
export const openLink = (url: string) => void invoke('shell:open-external', url).catch(failed('Could not open that link'));
