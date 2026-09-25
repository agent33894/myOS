import { NavLink } from 'react-router-dom';
import { ListChecks, Search, Settings, SunMedium, type LucideIcon } from 'lucide-react';
import { paths, toViewUrl } from '../../app/navigation';
import { useSettings } from '../../store/settings';
import { Icon, cn } from '../../ui';
import { FileTree } from './FileTree';
import { WindowStrip } from './WindowStrip';

function NavRow({ to, label, icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-fast',
          isActive ? 'bg-raised font-medium text-text shadow-raised' : 'text-text-secondary hover:bg-text/5 hover:text-text',
        )
      }
    >
      <Icon icon={icon} size="sm" className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

/** The left column: Today, Tasks, pinned views, then the folder's files. */
export function Sidebar() {
  const width = useSettings((state) => state.sidebar.left.width);
  const views = useSettings((state) => state.pinnedViews);
  return (
    <aside aria-label="Files" className="flex h-full shrink-0 flex-col bg-sidebar" style={{ width }}>
      <WindowStrip className="px-4">
        <span className="text-sm font-semibold text-text">myOS Next</span>
      </WindowStrip>
      <nav aria-label="Places" className="flex flex-col gap-0.5 px-3 pb-3">
        <NavRow to={paths.today} label="Today" icon={SunMedium} />
        <NavRow to={paths.tasks} label="Tasks" icon={ListChecks} />
        {views.map((view) => (
          <NavRow key={view.id} to={toViewUrl(view.id)} label={view.name} icon={Search} />
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <FileTree />
      </div>
      <footer className="px-3 py-2">
        <NavRow to={paths.settings} label="Settings" icon={Settings} />
      </footer>
    </aside>
  );
}
