import { X } from 'lucide-react';
import { PANELS } from '../../app/panels';
import { invoke } from '../../data/ipc';
import { isLinux } from '../../lib/platform';
import { setRightPanel, useActivePath, useUIStore } from '../../store/ui';
import { IconButton, cn } from '../../ui';

/** The right column: Outline, Backlinks, Properties, Changes, and History, one at a time (app/panels.ts). */
export function RightPanel({ width }: { width: number }) {
  const current = useUIStore((state) => state.rightPanel);
  const path = useActivePath();
  const panel = PANELS.find((entry) => entry.id === current) ?? PANELS[0];
  const Panel = panel.component;
  return (
    <aside aria-label="Panel" className="flex h-full shrink-0 flex-col" style={{ width }}>
      <div className="window-drag-region flex h-11 shrink-0 items-center gap-0.5 px-2">
        <div role="tablist" aria-label="Panels" className="flex items-center gap-0.5">
          {PANELS.map((entry) => (
            <IconButton
              key={entry.id}
              role="tab"
              id={`panel-tab-${entry.id}`}
              aria-selected={entry.id === panel.id}
              aria-controls="panel-body"
              icon={entry.icon}
              label={entry.label}
              size="sm"
              className={cn('no-drag', entry.id === panel.id && 'bg-sheet text-accent-text shadow-raised hover:bg-sheet')}
              onClick={() => setRightPanel(entry.id)}
            />
          ))}
        </div>
        {isLinux ? <IconButton icon={X} label="Close window" size="sm" className="no-drag ml-auto" onClick={() => void invoke('window:close')} /> : null}
      </div>
      <h2 className="shrink-0 px-4 pb-1 pt-2 text-xs font-medium text-text-tertiary">{panel.label}</h2>
      <div id="panel-body" role="tabpanel" aria-labelledby={`panel-tab-${panel.id}`} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Panel path={path} />
      </div>
    </aside>
  );
}
