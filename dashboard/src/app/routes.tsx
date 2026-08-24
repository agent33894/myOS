import { lazy, type ComponentType } from 'react';
import { Boxes, FolderKanban, Library, Settings, SunMedium } from 'lucide-react';
import TodayPage from '../features/today/TodayPage';
import LibraryPage from '../features/library/LibraryPage';
import LegacyArtifactRedirect from '../features/artifact-route/LegacyArtifactRedirect';

export interface AppRoute {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
  group: 'primary' | 'tools' | 'footer' | 'hidden';
  shortcut?: string;
  /** Warms the route's lazy chunk (sidebar hover) so navigation never flashes. */
  preload?: () => void;
}

type Loader = () => Promise<{ default: ComponentType }>;

function lazyRoute(loader: Loader) {
  const component = lazy(loader);
  return { component, preload: () => void loader() };
}

const Unfiled = lazyRoute(() => import('../features/unfiled/UnfiledPage'));
const Projects = lazyRoute(() => import('../features/projects/ProjectsPage'));
const SettingsPage = lazyRoute(() => import('../pages/Settings'));

export const APP_ROUTES: AppRoute[] = [
  { id: 'today', label: 'Today', path: '/', icon: SunMedium, component: TodayPage, group: 'primary' },
  { id: 'unfiled', label: 'Unfiled', path: '/tasks', icon: Boxes, group: 'primary', ...Unfiled },
  { id: 'library', label: 'Library', path: '/library', icon: Library, component: LibraryPage, group: 'primary' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: FolderKanban, group: 'hidden', ...Projects },
  { id: 'artifact', label: 'Library', path: '/artifact', icon: Library, component: LegacyArtifactRedirect, group: 'hidden' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, group: 'footer', ...SettingsPage },
];

export const sidebarRoutes = APP_ROUTES.filter((route) => route.group === 'primary');
// ⌘1-9 follow sidebar order; deriving the label here keeps the palette and
// shortcuts modal from drifting out of sync with the actual binding.
sidebarRoutes.forEach((route, index) => {
  if (index < 9) route.shortcut = String(index + 1);
});
// Projects is reachable from the sidebar's project rows, but it still needs a
// palette entry so the page itself is one keystroke away.
export const paletteRoutes = APP_ROUTES.filter((route) => route.group !== 'hidden' || route.id === 'projects');

// No fallback: an unknown path renders NotFound, and the toolbar must not
// claim it is "Today" while the body says otherwise.
export function getRoute(pathname: string) {
  return APP_ROUTES.find((route) => route.path === pathname);
}
