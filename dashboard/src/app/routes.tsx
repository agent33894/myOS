import { lazy, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, FolderKanban, Inbox, Settings, SunMedium } from 'lucide-react';
import TodayPage from '../features/today/TodayPage';
import { paths } from './navigation';

export type SectionId = 'inbox' | 'today' | 'notes' | 'projects';

export interface AppRoute {
  id: SectionId | 'page' | 'settings';
  label: string;
  /** Router pattern (may contain params); `href` is where navigation links point. */
  path: string;
  href: string;
  icon: LucideIcon;
  component: ComponentType;
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
const SettingsPage = lazyRoute(() => import('../features/settings/SettingsPage'));

export interface SectionRoute extends AppRoute {
  id: SectionId;
  /** ⌘1–⌘4, in sidebar order. */
  shortcut: string;
}

/** The four places, in sidebar order. */
export const sections: SectionRoute[] = [
  { id: 'inbox', label: 'Inbox', path: paths.inbox, href: paths.inbox, icon: Inbox, shortcut: 'mod+1', ...Inbox_ },
  { id: 'today', label: 'Today', path: paths.today, href: paths.today, icon: SunMedium, shortcut: 'mod+2', component: TodayPage },
  { id: 'notes', label: 'Notes', path: paths.notes, href: paths.notes, icon: FileText, shortcut: 'mod+3', ...Notes },
  {
    id: 'projects',
    label: 'Projects',
    path: `${paths.projects}/:projectId?`,
    href: paths.projects,
    icon: FolderKanban,
    shortcut: 'mod+4',
    ...Projects,
  },
];

export const settingsRoute: AppRoute = {
  id: 'settings',
  label: 'Settings',
  path: paths.settings,
  href: paths.settings,
  icon: Settings,
  ...SettingsPage,
};

export const APP_ROUTES: AppRoute[] = [
  ...sections,
  { id: 'page', label: 'Page', path: paths.page, href: paths.page, icon: FileText, ...Page },
  settingsRoute,
];

/** Old bookmarks and deep links keep working. */
export const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/tasks', to: paths.inbox },
  { from: '/library', to: paths.notes },
  { from: '/artifact', to: paths.notes },
];

/** The sidebar section a URL belongs to, if any. */
export function sectionOf(pathname: string): SectionRoute | undefined {
  return sections.find((route) =>
    route.href === paths.today ? pathname === paths.today : pathname === route.href || pathname.startsWith(`${route.href}/`),
  );
}
