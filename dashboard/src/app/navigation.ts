import { ArtifactType } from '@shared/types';

/** Every URL in the app is built here, so routes and links cannot drift apart. */
export const paths = {
  today: '/',
  inbox: '/inbox',
  notes: '/notes',
  projects: '/projects',
  page: '/page',
  settings: '/settings',
} as const;

interface OpenOptions {
  /**
   * The item was just created by New note / New project: the page focuses
   * its (empty or "Untitled") title. Pages read it as `?new=1`.
   */
  isNew?: boolean;
}

const query = (params: Record<string, string>, { isNew }: OpenOptions = {}) =>
  new URLSearchParams(isNew ? { ...params, new: '1' } : params).toString();

const withPath = (base: string, filePath: string, options?: OpenOptions) =>
  `${base}?${query({ path: filePath }, options)}`;

export const toProjectUrl = (projectId: string, options?: OpenOptions) => {
  const search = query({}, options);
  return `${paths.projects}/${encodeURIComponent(projectId)}${search ? `?${search}` : ''}`;
};
export const toNoteUrl = (filePath: string, options?: OpenOptions) => withPath(paths.notes, filePath, options);
export const toPageUrl = (filePath: string, options?: OpenOptions) => withPath(paths.page, filePath, options);

/** The Inbox with its one-at-a-time sorting flow open (`?sort=1`). */
export const toInboxSortUrl = () => `${paths.inbox}?sort=1`;

export type SettingsTab = 'general' | 'appearance' | 'advanced';
export const toSettingsUrl = (tab: SettingsTab = 'general') =>
  tab === 'general' ? paths.settings : `${paths.settings}?tab=${tab}`;

/** Where an item opens: projects get their home, notes open beside the Notes list, everything else full-page. */
export function toItemUrl(item: { type: string; id: string; filePath: string }): string {
  if (item.type === ArtifactType.PROJECT) return toProjectUrl(item.id);
  if (item.type === ArtifactType.TODO || item.type === ArtifactType.INBOX) return toPageUrl(item.filePath);
  return toNoteUrl(item.filePath);
}

/** The workspace path (or project id) an app URL opens, for the recent-items list. */
export function openedItem(pathname: string, search: string): { path: string } | { projectId: string } | null {
  if (pathname === paths.notes || pathname === paths.page) {
    const path = new URLSearchParams(search).get('path');
    return path ? { path } : null;
  }
  const project = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  return project ? { projectId: decodeURIComponent(project) } : null;
}
