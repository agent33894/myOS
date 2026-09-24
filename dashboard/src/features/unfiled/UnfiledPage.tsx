import { useCallback, useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import type { ArtifactSummary } from '@shared/types';
import { useInbox } from '../../data/selectors';
import { useListNavigation } from '../../hooks/useListNavigation';
import InboxProcessor from '../../components/tasks/InboxProcessor';
import RefineModal from '../../components/artifacts/RefineModal';
import { ArtifactDetail } from '../shell/ArtifactDetail';
import { PaneDivider } from '../../components/ui/PaneDivider';
import { cn } from '../../lib/utils';
import { setArtifactDragData } from '../../lib/artifactDnd';
import { primaryModifier } from '../../utils/platform';

const LIST_WIDTH_KEY = 'chronicle-unfiled-list-width';

/** The Inbox: captures waiting to be sorted, newest first. */
export default function UnfiledPage() {
  const inbox = useInbox();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refinePath, setRefinePath] = useState<string | null>(null);
  const [showProcessor, setShowProcessor] = useState(false);
  const [listWidth, setListWidth] = useState(() => Number(localStorage.getItem(LIST_WIDTH_KEY)) || 308);
  useEffect(() => {
    localStorage.setItem(LIST_WIDTH_KEY, String(listWidth));
  }, [listWidth]);

  // Adopt the first capture once data arrives, and again when the selected
  // one leaves the Inbox, so the detail pane never dangles.
  const selected = inbox.find((item) => item.filePath === selectedPath) ?? inbox[0] ?? null;

  const select = useCallback((item: ArtifactSummary) => setSelectedPath(item.filePath), []);
  const getNavId = useCallback((item: ArtifactSummary) => item.filePath, []);
  useListNavigation({
    items: inbox,
    selectedId: selected?.filePath ?? null,
    getId: getNavId,
    onSelect: select,
    onEscape: () => setSelectedPath(null),
    enabled: !showProcessor && !refinePath,
  });

  return (
    <div className="chronicle-split" style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}>
      <div className="chronicle-list-pane custom-scrollbar">
        <section aria-labelledby="unfiled-heading">
          {/* The page name lives in the toolbar; the section gets a functional name. */}
          <div className="chronicle-list-heading chronicle-list-heading-row">
            <span id="unfiled-heading">Waiting</span>
            <span key={inbox.length} className="chronicle-count">{inbox.length}</span>
            {inbox.length > 0 ? (
              <button className="chronicle-heading-action active:scale-[0.98]" onClick={() => setShowProcessor(true)}>
                Process
              </button>
            ) : null}
          </div>
          {inbox.length === 0 ? (
            <p className="chronicle-empty-row">Nothing waiting. Capture with {primaryModifier}N and it lands here.</p>
          ) : null}
          {inbox.map((item) => (
            <div
              key={item.filePath}
              data-nav-id={item.filePath}
              draggable
              onDragStart={(event) => setArtifactDragData(event, item)}
              className={cn('chronicle-task-row', selected?.filePath === item.filePath && 'is-selected')}
            >
              <span className="chronicle-capture-glyph" aria-hidden="true">
                <Inbox className="h-4 w-4" />
              </span>
              <button className="chronicle-row-body active:scale-[0.98]" onClick={() => select(item)}>
                <span className="chronicle-row-title">{item.title}</span>
                <span className="chronicle-row-meta">Capture</span>
              </button>
              <div className="chronicle-row-affordances">
                <button onClick={() => setRefinePath(item.filePath)} aria-label={`Refine ${item.title}`}>
                  Refine
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
      <PaneDivider label="Resize Unfiled list" value={listWidth} min={276} max={460} onChange={setListWidth} />
      <ArtifactDetail artifact={selected} onDeleted={() => setSelectedPath(null)} />

      {showProcessor ? <InboxProcessor entries={inbox} onClose={() => setShowProcessor(false)} /> : null}
      {refinePath ? <RefineModal isOpen artifactPath={refinePath} onClose={() => setRefinePath(null)} /> : null}
    </div>
  );
}
