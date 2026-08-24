import { type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { OutlineNode } from './outlineTree';
import type { OutlineState } from './useOutlineHeadings';

interface OutlineRailProps {
  outline: OutlineState;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The document outline: an open panel with a collapsible section tree, or a
 * vertical mono rail when closed. Renders nothing until the document has
 * sections. Shared by the workspace canvas and the Living Page pane.
 */
export default function OutlineRail({ outline, isOpen, onOpenChange }: OutlineRailProps) {
  if (!outline.hasHeadings) return null;

  const renderNodes = (nodes: OutlineNode[], depth = 0): ReactNode => {
    return nodes.map((node) => {
      const { heading, children } = node;
      const hasChildren = children.length > 0;
      const isCollapsed = outline.collapsedNodes[heading.id] ?? false;
      const isActive = heading.id === outline.activeHeadingId;
      const indentation = 10 + depth * 12;

      return (
        <div key={heading.id}>
          <div
            className={cn(
              'group relative flex items-center gap-1.5 py-1 pr-2 text-xs rounded-md transition-colors duration-200',
              isActive ? 'ed-accent-muted' : 'hover:bg-secondary/45'
            )}
            style={{ paddingLeft: `${indentation}px` }}
          >
            {isActive && (
              <span className="pointer-events-none absolute left-1 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[rgb(var(--accent-color))]" />
            )}

            {hasChildren ? (
              <button
                type="button"
                className={cn(
                  'h-5 w-5 flex items-center justify-center rounded-sm transition-colors',
                  isActive
                    ? 'text-[rgb(var(--accent-color))] bg-[rgba(var(--accent-color),0.08)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  outline.toggleNode(heading.id);
                }}
                aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}

            <button
              type="button"
              onClick={() => outline.selectHeading(heading)}
              className={cn(
                'flex-1 text-left leading-tight px-1.5 py-1 transition-colors duration-200',
                isActive
                  ? 'text-[rgb(var(--accent-color))]'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            >
              <span className="line-clamp-2">{heading.text}</span>
            </button>
          </div>

          {hasChildren && !isCollapsed && <div>{renderNodes(children, depth + 1)}</div>}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <div className="hidden md:flex shrink-0 items-start">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="chronicle-editor-outline-rail"
          aria-label="Show outline"
          title="Show outline"
          aria-expanded={false}
        >
          Outline
        </button>
      </div>
    );
  }

  return (
    <div className="chronicle-editor-outline hidden md:flex">
      <div className="chronicle-editor-outline-head">
        <div>
          <div className="ed-label">Outline</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {outline.headings.length} sections
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="chronicle-editor-outline-toggle"
          aria-label="Hide outline"
          title="Hide outline"
          aria-expanded={true}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
        {renderNodes(outline.tree)}
      </div>
    </div>
  );
}
