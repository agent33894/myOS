import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { paths, toSettingsUrl } from '../../../app/navigation';
import { sectionOf, sections } from '../../../app/routes';
import { useCounts } from '../../../data/selectors';
import { useUIStore } from '../../../store/ui';
import { Icon, IconButton, cn } from '../../../ui';
import { isMac } from '../../../lib/platform';
import myosIcon from '../../../assets/myos-icon.png';
import { sectionUrl } from '../navigationMemory';
import { SHORTCUTS } from '../shortcuts';
import { WindowStrip } from '../WindowStrip';
import { SidebarActions } from './SidebarActions';
import { SidebarLink } from './SidebarLink';
import { RitualSidebarItem } from '../../rituals/slots';
import { SidebarProjects } from './SidebarProjects';
import { SidebarResizer } from './SidebarResizer';

interface SidebarProps {
  /** Icon rail: collapsed by the user, or forced by a narrow window. */
  rail: boolean;
  /** The window is too narrow for the wide sidebar, so it cannot be expanded. */
  narrow: boolean;
}

export function Sidebar({ rail, narrow }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const counts = useCounts();
  const width = useUIStore((state) => state.sidebarWidth);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const current = sectionOf(location.pathname);
  const onSettings = location.pathname === paths.settings;

  return (
    <aside
      aria-label="Sidebar"
      className={cn('relative flex h-full shrink-0 flex-col bg-sidebar', rail && (isMac ? 'w-20' : 'w-14'))}
      style={rail ? undefined : { width }}
    >
      {/* macOS draws its traffic lights here; elsewhere the strip carries the name. */}
      <WindowStrip className={cn(!rail && 'px-4')}>
        {isMac ? null : (
          <span className={cn('flex items-center gap-2', rail && 'mx-auto')}>
            <img src={myosIcon} alt="" className="size-5 rounded-sm" />
            {rail ? null : <span className="text-sm font-semibold text-text">myOS</span>}
          </span>
        )}
      </WindowStrip>

      <div className={cn('flex flex-col gap-4 pb-2 pt-2', rail ? 'px-2' : 'px-3')}>
        <SidebarActions rail={rail} />
        <nav aria-label="Sections" className="flex flex-col gap-0.5">
          {sections.map((section) => {
            const count = section.id === 'inbox' ? counts.inbox : section.id === 'today' ? counts.today : undefined;
            return (
              <SidebarLink
                key={section.id}
                // Clicking the section you are in goes back to its top.
                to={current?.id === section.id ? section.href : sectionUrl(section)}
                label={section.label}
                hint={count ? `${section.label} · ${count}` : section.label}
                shortcut={section.shortcut}
                leading={<Icon icon={section.icon} />}
                trailing={
                  count ? <span className="text-sm tabular-nums text-text-tertiary">{count}</span> : undefined
                }
                active={current?.id === section.id}
                rail={rail}
                badge={Boolean(count)}
                onMouseEnter={section.preload}
                onFocus={section.preload}
              />
            );
          })}
        </nav>
        <RitualSidebarItem rail={rail} />
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto pb-4', rail ? 'px-2' : 'px-3')}>
        <SidebarProjects rail={rail} />
      </div>

      <footer className={cn('flex items-center gap-1 px-3 py-3', rail && 'flex-col px-2')}>
        <IconButton
          icon={Settings}
          label="Settings"
          shortcut={SHORTCUTS.settings}
          aria-current={onSettings ? 'page' : undefined}
          className={cn(onSettings && 'bg-text/10 text-text')}
          onClick={() => navigate(toSettingsUrl())}
        />
        {narrow ? null : (
          <IconButton
            icon={rail ? PanelLeftOpen : PanelLeftClose}
            label={rail ? 'Show sidebar' : 'Hide sidebar'}
            shortcut={SHORTCUTS.sidebar}
            className={cn(!rail && 'ml-auto')}
            onClick={toggleSidebar}
          />
        )}
      </footer>

      {rail ? null : <SidebarResizer />}
    </aside>
  );
}
