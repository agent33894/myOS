/** Every URL in the app is built here, so routes and links cannot drift apart. */
export const paths = {
  today: '/today',
  tasks: '/tasks',
  view: '/view',
  note: '/note',
  settings: '/settings',
} as const;

/**
 * A note in its tab: `/note?path=notes/api.md`. With `create`, a missing file
 * opens empty and is made on the first edit (`&create=1`), as today's daily note does.
 */
export const toNoteUrl = (path: string, { create = false } = {}) =>
  `${paths.note}?${new URLSearchParams(create ? { path, create: '1' } : { path })}`;

/** @public The Tasks screen, optionally with a query in the box: `/tasks?q=open%20%23work`. */
export const toTasksUrl = (query?: string) => (query ? `${paths.tasks}?${new URLSearchParams({ q: query })}` : paths.tasks);

/** A pinned view by its id (`Settings.pinnedViews[].id`). */
export const toViewUrl = (id: string) => `${paths.view}/${encodeURIComponent(id)}`;

/** The note path a URL shows, if it is a note URL. */
export function notePathOf(pathname: string, search: string): string | null {
  return pathname === paths.note ? new URLSearchParams(search).get('path') : null;
}

/** Go to an app URL from anywhere, including code outside React. The hash router follows. */
export function go(url: string): void {
  window.location.hash = `#${url}`;
}

/** Open a note in its tab (a new tab when it isn't open). */
export const openNote = (path: string, options?: { create?: boolean }) => go(toNoteUrl(path, options));
