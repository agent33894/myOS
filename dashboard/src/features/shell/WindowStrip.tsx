import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { invoke } from '../../data/ipc';
import { IconButton, cn } from '../../ui';
import { isLinux } from '../../lib/platform';

/**
 * The 44px strip along the top of a column: a window drag region. Linux
 * windows are frameless, so a closable strip carries the close control.
 */
export function WindowStrip({ closable = false, className, children }: { closable?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('window-drag-region flex h-11 shrink-0 items-center gap-2 px-2', className)}>
      {children}
      {closable && isLinux ? (
        <IconButton icon={X} label="Close window" size="sm" className="no-drag ml-auto" onClick={() => void invoke('window:close')} />
      ) : null}
    </div>
  );
}
