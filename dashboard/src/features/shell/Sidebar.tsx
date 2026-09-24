import { useEffect, useMemo, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Feather, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { sidebarRoutes, type AppRoute } from '../../app/routes';
import { useArtifactsStore } from '../../store/artifacts';
import { useTasksStore } from '../../store/tasks';
import { useCommandPaletteActions, useQuickCaptureActions } from '../../store/selectors';
import { selectInPlay } from '../today/todaySelectors';
import { cn } from '../../lib/utils';
import { SidebarProjects } from './sidebar/SidebarProjects';
import { SidebarMasthead } from './sidebar/SidebarMasthead';
import { SidebarInPlay } from './sidebar/SidebarInPlay';
import { isMac, primaryModifier } from '../../utils/platform';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const location = useLocation();
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const { openCommandPalette } = useCommandPaletteActions();
  const { openQuickCapture } = useQuickCaptureActions();
  // Badges must count exactly what their page renders: Today shows In Play,
  // Unfiled shows the tasks store's waiting queue (archived/done excluded).
  const unfiledCount = useTasksStore((state) => state.inboxEntries.length);
  const counts = useMemo(
    () => ({
      today: selectInPlay(artifacts).length,
      unfiled: unfiledCount,
      library: artifacts.length,
    }),
    [artifacts, unfiledCount],
  );

  // Remember the last URL (lens, selection, project) per section so switching
  // sections and back restores your place instead of resetting it.
  const lastUrlBySection = useRef(new Map<string, string>());
  useEffect(() => {
    const section = sidebarRoutes.find((route) =>
      route.path === '/' ? location.pathname === '/' : location.pathname.startsWith(route.path),
    );
    if (section) {
      lastUrlBySection.current.set(section.id, `${location.pathname}${location.search}`);
    }
  }, [location.pathname, location.search]);

  const linkTarget = (route: AppRoute) => lastUrlBySection.current.get(route.id) || route.path;

  return (
    <aside className="chronicle-sidebar">
      <div className="chronicle-traffic-spacer window-drag-region" aria-hidden="true">
        {!isMac && !collapsed ? <span className="chronicle-window-brand">myOS</span> : null}
      </div>
      <SidebarMasthead />
      <div className="chronicle-sidebar-scroll custom-scrollbar">
        <nav aria-label="Primary" className="chronicle-nav-group">
          {sidebarRoutes
            .filter((route) => route.group === 'primary')
            .map((route) => {
              const Icon = route.icon;
              const count = counts[route.id as keyof typeof counts];
              return (
                <NavLink
                  key={route.id}
                  to={linkTarget(route)}
                  end={route.path === '/'}
                  aria-label={route.label}
                  onMouseEnter={route.preload}
                  onFocus={route.preload}
                  className={({ isActive }) => cn('chronicle-nav-row', isActive && 'is-active')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{route.label}</span>
                  <span key={count} className="chronicle-count">{count}</span>
                </NavLink>
              );
            })}
        </nav>

        <SidebarInPlay />

        <SidebarProjects />

      </div>
      <div className="chronicle-sidebar-footer">
        <button
          onClick={openQuickCapture}
          className="chronicle-capture-plate active:scale-[0.98]"
          title={`Capture — ${primaryModifier}N`}
        >
          <Feather className="h-4 w-4" />
          <span className="chronicle-capture-label">Capture</span>
          <span className="chronicle-capture-kbd">{primaryModifier}N</span>
        </button>
        <div className="chronicle-system-line">
          <button
            onClick={openCommandPalette}
            className="chronicle-sys-btn active:scale-[0.96]"
            title={`Command — ${primaryModifier}K`}
          >
            <span>{primaryModifier}K</span>
            <span className="chronicle-sys-label">Command</span>
          </button>
          <span className="chronicle-sys-spacer" aria-hidden="true" />
          <NavLink
            to="/settings"
            aria-label="Settings"
            className={({ isActive }) => cn('chronicle-sys-btn is-icon', isActive && 'is-active')}
          >
            <Settings />
          </NavLink>
          <button
            onClick={onToggleCollapsed}
            className="chronicle-sys-btn is-icon"
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={`Sidebar — ${primaryModifier}\\`}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>
      </div>
    </aside>
  );
}
