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

const withPath = (base: string, filePath: string) => `${base}?${new URLSearchParams({ path: filePath })}`;

export const toProjectUrl = (projectId: string) => `${paths.projects}/${encodeURIComponent(projectId)}`;
export const toNoteUrl = (filePath: string) => withPath(paths.notes, filePath);
export const toPageUrl = (filePath: string) => withPath(paths.page, filePath);

/** Where an item opens: projects get their home, notes open beside the Notes list, everything else full-page. */
export function toItemUrl(item: { type: string; id: string; filePath: string }): string {
  if (item.type === ArtifactType.PROJECT) return toProjectUrl(item.id);
  if (item.type === ArtifactType.TODO || item.type === ArtifactType.INBOX) return toPageUrl(item.filePath);
  return toNoteUrl(item.filePath);
}
