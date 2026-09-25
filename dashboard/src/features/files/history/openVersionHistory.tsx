import { createRoot, type Root } from 'react-dom/client';
import { create } from 'zustand';
import { TooltipProvider } from '../../../ui';
import { VersionHistoryDialog, type HistoryTarget } from './VersionHistoryDialog';

const useTarget = create<{ target: HistoryTarget | null }>(() => ({ target: null }));

function Host() {
  const target = useTarget((state) => state.target);
  return <VersionHistoryDialog target={target} onClose={() => useTarget.setState({ target: null })} />;
}

let root: Root | null = null;

/**
 * Open Version history for the page at `path`. The ⋯ menu that asks for it
 * closes (and unmounts) straight away, so the dialog lives in its own root.
 */
export function openVersionHistory(path: string, flush: () => Promise<void> = () => Promise.resolve()): void {
  if (!root) {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    root.render(
      <TooltipProvider>
        <Host />
      </TooltipProvider>,
    );
  }
  useTarget.setState({ target: { path, flush } });
}
