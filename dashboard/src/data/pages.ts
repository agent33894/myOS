import { format } from 'date-fns';
import { formatLocalDate } from '@shared/date';
import { appendUnderHeading, journalPath } from '@shared/journal';
import { expandTemplate, STARTER_TEMPLATES } from '@shared/templates';
import { ArtifactType, type Artifact, type ArtifactSummary, type Domain } from '@shared/types';
import { create, currentRev, read, save } from './gateway';
import { invoke, isConflict } from './ipc';
import { applyArtifact, useDataStore } from './store';
import { record } from './undo';

/** Templates and journal pages. */

interface FromTemplate {
  title: string;
  project?: string;
  domain?: Domain;
}

async function expanded(template: ArtifactSummary, title: string): Promise<string> {
  const { content } = await read(template.filePath);
  const now = new Date();
  return expandTemplate(content, { title, date: formatLocalDate(now), time: format(now, 'HH:mm') });
}

/** @public A new note from a template, with `{{title}}`, `{{date}}`, and `{{time}}` filled in. */
export async function createFromTemplate(template: ArtifactSummary, { title, project, domain }: FromTemplate): Promise<Artifact> {
  const content = await expanded(template, title);
  return create({ type: ArtifactType.MEMO, title, project, domain, content }, `Create “${title}”`);
}

/** @public A new project whose page starts from a template (such as Project brief). */
export async function createProjectFromTemplate(template: ArtifactSummary, { title, domain }: Omit<FromTemplate, 'project'>): Promise<Artifact> {
  const content = await expanded(template, title);
  return create({ type: ArtifactType.PROJECT, title, domain, content }, `Create “${title}”`);
}

/**
 * @public Write the starter templates (Meeting notes, Lecture notes, Weekly
 * plan, Project brief) when the workspace has no templates yet.
 */
export async function ensureStarterTemplates(): Promise<void> {
  const hasTemplates = Object.values(useDataStore.getState().byPath).some((item) => item.type === ArtifactType.TEMPLATE);
  if (hasTemplates) return;
  for (const template of STARTER_TEMPLATES) {
    try {
      applyArtifact(await invoke('artifacts:create', { type: ArtifactType.TEMPLATE, ...template }), false);
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
}

/** @public Where the journal page for `date` (YYYY-MM-DD) lives. Nothing is created until someone writes. */
export const openJournal = (date: string) => journalPath(date);

/** @public Create the journal page for `date` (on the first keystroke), or return the one already there. */
export async function createJournal(date: string): Promise<Artifact> {
  const path = journalPath(date);
  if (useDataStore.getState().byPath[path]) return read(path);
  try {
    const page = await invoke('artifacts:create', { type: ArtifactType.JOURNAL, id: date, title: date });
    applyArtifact(page);
    return page;
  } catch (error) {
    if (isConflict(error)) return read(path);
    throw error;
  }
}

/**
 * @public Add `- line` at the end of the `## section` part of the journal page
 * for `date`, creating the page or section when needed. One undo step.
 */
export async function appendToJournal(date: string, section: string, line: string): Promise<Artifact> {
  const path = journalPath(date);
  const entry = `- ${line.trim()}`;
  if (!useDataStore.getState().byPath[path]) {
    return create({ type: ArtifactType.JOURNAL, id: date, title: date, content: `## ${section}\n\n${entry}` }, `Add to the journal`);
  }
  const page = await read(path);
  const content = appendUnderHeading(page.content, section, entry);
  const write = (text: string) => save(path, { fields: {}, content: text }, currentRev(path) ?? '');
  const result = await save(path, { fields: {}, content }, page.rev);
  record({ label: 'Add to the journal', undo: () => write(page.content), redo: () => write(content) });
  return result;
}
