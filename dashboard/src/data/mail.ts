import { useEffect } from 'react';
import { create } from 'zustand';
import type { MailAccountDraft, MailAction, MailConfig, MailDraft, MailItem, MailSnapshot } from '@shared/mail/types';
import { taskDraftFor } from '@shared/mail/task';
import { create as createArtifact } from './gateway';
import { invoke, subscribe } from './ipc';
import { record } from './undo';

/**
 * Mail lives in the main process; this store mirrors its snapshot and
 * refreshes on every `mail:changed`. Changes go through the calls below.
 */
interface MailState {
  snapshot: MailSnapshot | null;
  error: string | null;
}

export const useMailStore = create<MailState>(() => ({ snapshot: null, error: null }));

async function refresh(): Promise<void> {
  try {
    useMailStore.setState({ snapshot: await invoke('mail:snapshot'), error: null });
  } catch (error) {
    useMailStore.setState({ error: error instanceof Error ? error.message : String(error) });
  }
}

let subscribers = 0;
let unsubscribe: (() => void) | null = null;

/** Keep the mail snapshot live while a component that shows mail is mounted. */
export function useMailSync(): void {
  useEffect(() => {
    subscribers += 1;
    if (subscribers === 1) {
      unsubscribe = subscribe('mail:changed', () => void refresh());
      void refresh();
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };
  }, []);
}

export const useMail = () => useMailStore((state) => state.snapshot);

export const checkMail = () => invoke('mail:sync');
export const readMailBody = (id: string) => invoke('mail:body', id);
export const addMailAccount = (draft: MailAccountDraft) => invoke('mail:account:add', draft);
export const updateMailAccount = (id: string, patch: { enabled?: boolean; name?: string; aliases?: string[] }) =>
  invoke('mail:account:update', id, patch);
export const removeMailAccount = (id: string) => invoke('mail:account:remove', id);
export const testAssistant = (command: string) => invoke('mail:assistant:test', command);

/** Settings apply right away; the snapshot shows the new values before the round trip ends. */
export async function setMailConfig(patch: Partial<MailConfig>): Promise<MailConfig> {
  const current = useMailStore.getState().snapshot;
  if (current) useMailStore.setState({ snapshot: { ...current, config: { ...current.config, ...patch } as MailConfig } });
  const config = await invoke('mail:config:set', patch);
  const latest = useMailStore.getState().snapshot;
  if (latest) useMailStore.setState({ snapshot: { ...latest, config } });
  return config;
}

export const actOnMail = (ids: string[], action: MailAction) => invoke('mail:act', ids, action);
export const undoMailActivity = (id: string) => invoke('mail:undo', id);

export const composeReply = (itemId: string, options: { assistant: boolean; instruction?: string }) => invoke('mail:draft:compose', itemId, options);
export const saveMailDraft = (draft: MailDraft) => invoke('mail:draft:save', draft);
export const discardMailDraft = (id: string) => invoke('mail:draft:discard', id);
/** Sends. Call only from the confirmation the user clicks. */
export const sendApprovedDraft = (id: string) => invoke('mail:draft:send', id);

/** Make a Task from an email through the gateway, so ⌘Z removes it again. */
export async function makeTaskFromMail(item: MailItem, overrides: { title?: string; due?: string; project?: string } = {}) {
  const task = await createArtifact(taskDraftFor(item, overrides), `Make a task from “${item.subject}”`);
  await actOnMail([item.id], { kind: 'link-task', taskPath: task.filePath });
  return task;
}

/** Mark mail done; undo reopens it (and the message returns to the inbox through the log). */
export async function markMailDone(items: MailItem[]): Promise<void> {
  const ids = items.map((item) => item.id);
  await actOnMail(ids, { kind: 'done' });
  record({
    label: items.length === 1 ? `Done with “${items[0].subject}”` : `Done with ${items.length} emails`,
    undo: async () => {
      await refresh();
      // The newest move of each message is the archive this step made.
      const undone = new Set<string>();
      for (const entry of useMailStore.getState().snapshot?.activity ?? []) {
        if (!entry.itemId || !ids.includes(entry.itemId) || undone.has(entry.itemId) || !entry.move || entry.undone || entry.auto) continue;
        undone.add(entry.itemId);
        await undoMailActivity(entry.id);
      }
      await actOnMail(ids, { kind: 'reopen' });
    },
    redo: () => actOnMail(ids, { kind: 'done' }),
  });
}
