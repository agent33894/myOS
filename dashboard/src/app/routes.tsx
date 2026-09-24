import { lazy, type ComponentType } from 'react';
import { FileText, FolderKanban, Inbox, Settings, SunMedium } from 'lucide-react';
import TodayPage from '../features/today/TodayPage';
import { paths } from './navigation';

export interface AppRoute {
  id: string;
  label: string;
  /** Router pattern (may contain params); `href` is where navigation links point. */
  path: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
  group: 'primary' | 'hidden';
  shortcut?: string;
  /** Warms the route's lazy chunk (sidebar hover) so navigation never flashes. */
  preload?: () => void;
}

type Loader = () => Promise<{ default: ComponentType }>;

function lazyRoute(loader: Loader) {
  return { component: lazy(loader), preload: () => void loader() };
}

const Inbox_ = lazyRoute(() => import('../features/inbox/InboxPage'));
const Notes = lazyRoute(() => import('../features/notes/NotesPage'));
const Projects = lazyRoute(() => import('../features/projects/ProjectsPage'));
const Page = lazyRoute(() => import('../features/page/PageRoute'));
const SettingsPage = lazyRoute(() => import('../pages/Settings'));

export const APP_ROUTES: AppRoute[] = [
  { id: 'inbox', label: 'Inbox', path: paths.inbox, href: paths.inbox, icon: Inbox, group: 'primary', ...Inbox_ },
  { id: 'today', label: 'Today', path: paths.today, href: paths.today, icon: SunMedium, component: TodayPage, group: 'primary' },
  { id: 'notes', label: 'Notes', path: paths.notes, href: paths.notes, icon: FileText, group: 'primary', ...Notes },
  { id: 'projects', label: 'Projects', path: `${paths.projects}/:projectId?`, href: paths.projects, icon: FolderKanban, group: 'primary', ...Projects },
  { id: 'page', label: 'Page', path: paths.page, href: paths.page, icon: FileText, group: 'hidden', ...Page },
  { id: 'settings', label: 'Settings', path: paths.settings, href: paths.settings, icon: Settings, group: 'hidden', ...SettingsPage },
];

/** Old bookmarks and deep links keep working. */
export const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/tasks', to: paths.inbox },
  { from: '/library', to: paths.notes },
  { from: '/artifact', to: paths.notes },
];

export const sidebarRoutes = APP_ROUTES.filter((route) => route.group === 'primary');
sidebarRoutes.forEach((route, index) => {
  route.shortcut = String(index + 1);
});

export function getRoute(pathname: string) {
  return APP_ROUTES.find((route) =>
    route.href === '/' ? pathname === '/' : pathname === route.href || pathname.startsWith(`${route.href}/`),
  );
}
export const paletteRoutes = APP_ROUTES.filter((route) => route.id !== 'page');
