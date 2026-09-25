import { PANELS } from '../../app/panels';
import { useSettings } from '../../store/settings';
import { setRightPanel, useActivePath, useUIStore } from '../../store/ui';
import { IconButton, cn } from '../../ui';

/** The right column: one panel at a time, chosen from the registry in app/panels.ts. */
export function RightPanel() {
  const width = useSettings((state) => state.sidebar.right.width);
  const current = useUIStore((state) => state.rightPanel);
  const path = useActivePath();
  const panel = PANELS.find((entry) => entry.id === current) ?? PANELS[0];
  const Panel = panel.component;
  return (
    <aside aria-label={panel.label} className="flex h-full shrink-0 flex-col border-l border-border bg-sidebar" style={{ width }}>
      <div role="tablist" aria-label="Panels" className="window-drag-region flex h-10 shrink-0 items-center gap-1 px-2">
        {PANELS.map((entry) => (
          <IconButton
            key={entry.id}
            role="tab"
            aria-selected={entry.id === panel.id}
            icon={entry.icon}
            label={entry.label}
            size="sm"
            className={cn('no-drag', entry.id === panel.id && 'bg-text/10 text-text')}
            onClick={() => setRightPanel(entry.id)}
          />
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <Panel path={path} />
      </div>
    </aside>
  );
}
