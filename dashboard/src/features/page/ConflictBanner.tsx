import { AlertTriangle } from 'lucide-react';
import { Button, Icon } from '../../ui';

/** The file changed on disk while there were unsaved edits here. Nothing is overwritten until the user chooses. */
export function ConflictBanner({ onLoadTheirs, onKeepMine }: { onLoadTheirs: () => void; onKeepMine: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-soft px-4 py-3 animate-slide-up">
      <Icon icon={AlertTriangle} className="text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-text">This page changed on disk.</p>
        <p className="text-sm text-text-secondary">Load the saved version, or keep your edits and save over it.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onLoadTheirs}>
          Load theirs
        </Button>
        <Button size="sm" variant="primary" onClick={onKeepMine}>
          Keep mine
        </Button>
      </div>
    </div>
  );
}
