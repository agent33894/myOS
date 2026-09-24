import { Component, useEffect, useRef, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AlertCircle, Braces, Copy, CopyPlus, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  Button,
  cn,
  EmptyState,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  SegmentedControl,
} from '../../ui';

export type BlockMode = 'preview' | 'edit' | 'source';

const MODES = [
  { value: 'preview', label: 'Preview', icon: Eye },
  { value: 'edit', label: 'Edit', icon: Pencil },
] as const;

interface BoundaryProps {
  resetKey: string;
  fallback: ReactNode;
  children: ReactNode;
}

/** One broken block never takes the page down; it resets when its source changes. */
class BlockBoundary extends Component<BoundaryProps, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: { failed: boolean; key: string }) {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Shown in place of a block whose source can't be read or whose view failed. */
export function BlockProblem({ message, onEditSource }: { message?: string; onEditSource?: () => void }) {
  return (
    <div role="alert" className="rounded-lg bg-sunken">
      <EmptyState
        tone="danger"
        icon={AlertCircle}
        title="This block couldn’t render"
        description={message ?? 'Something in its source doesn’t fit. Your text is safe.'}
        action={
          onEditSource ? (
            <Button leadingIcon={Braces} onClick={onEditSource}>
              Edit source
            </Button>
          ) : null
        }
        className="py-8"
      />
    </div>
  );
}

interface BlockFrameProps {
  label: string;
  mode: BlockMode;
  onModeChange: (mode: BlockMode) => void;
  editable: boolean;
  /** The node is selected in the editor (e.g. arrowed onto). */
  selected: boolean;
  /** Resets the error boundary when it changes. */
  resetKey: string;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopySource: () => void;
  /** Move the caret out of the block, before or after it. */
  onLeave: (side: 'before' | 'after') => void;
  /** Focus left the block: write pending edits. */
  onBlur: () => void;
  /** Put the caret in the form's first field on mount (a block just inserted). */
  focusForm?: boolean;
  children: ReactNode;
}

/**
 * Shared chrome for every rich block: focusable frame with a visible ring, a
 * toolbar (Preview/Edit and a ⋯ menu) that floats just above the block on
 * hover and becomes the header of the edit panel, keyboard handling, and an
 * error boundary. Keys: Enter edits, Escape returns to preview, Backspace/Delete
 * removes, arrows leave the block.
 */
export function BlockFrame(props: BlockFrameProps) {
  const { label, mode, onModeChange, editable, selected, focusForm } = props;
  const frame = useRef<HTMLDivElement>(null);

  // Wait a tick so the form has rendered.
  const focusFirstField = () =>
    window.setTimeout(() => frame.current?.querySelector<HTMLElement>('input, textarea')?.focus(), 0);

  useEffect(() => {
    if (!focusForm) return;
    const timer = focusFirstField();
    return () => window.clearTimeout(timer);
  }, []);

  /** Enter or double-click: open the form with the caret in its first field, ready to type. */
  const startEditing = () => {
    onModeChange('edit');
    focusFirstField();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && mode !== 'preview') {
      event.preventDefault();
      onModeChange('preview');
      event.currentTarget.focus();
      return;
    }
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, (() => void) | undefined> = {
      Enter: editable ? startEditing : undefined,
      Backspace: editable ? props.onDelete : undefined,
      Delete: editable ? props.onDelete : undefined,
      ArrowUp: () => props.onLeave('before'),
      ArrowLeft: () => props.onLeave('before'),
      ArrowDown: () => props.onLeave('after'),
      ArrowRight: () => props.onLeave('after'),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) props.onBlur();
  };

  const editSource = () => onModeChange('source');
  const editing = mode !== 'preview';

  return (
    <NodeViewWrapper className="rich-block not-prose group/block relative mb-6 mt-8" contentEditable={false}>
      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-label={`${label} block`}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onDoubleClick={() => editable && mode === 'preview' && startEditing()}
        className={cn(
          'rounded-lg outline-none ring-offset-4 transition-shadow duration-fast ease-out focus-visible:ring-2 focus-visible:ring-focus',
          selected && 'ring-2 ring-focus',
          editing && '-mx-4 bg-sunken p-4',
        )}
      >
        {editable ? (
          // One element in both modes, so focus stays put when switching. In preview it floats just
          // above the block instead of covering it (the ::after bridges the gap so hover holds); while
          // editing it is the panel's header.
          <div
            className={cn(
              'flex items-center gap-1',
              editing
                ? 'mb-4'
                : 'absolute bottom-full right-0 z-10 mb-2 rounded-md bg-overlay p-0.5 shadow-overlay transition-opacity duration-fast after:absolute after:inset-x-0 after:top-full after:h-2',
              !editing &&
                !selected &&
                'pointer-events-none opacity-0 group-focus-within/block:pointer-events-auto group-focus-within/block:opacity-100 group-hover/block:pointer-events-auto group-hover/block:opacity-100',
            )}
          >
            <span
              className={cn('font-medium', editing ? 'mr-auto text-sm text-text' : 'px-2 text-xs text-text-secondary')}
            >
              {label}
            </span>
            <SegmentedControl
              aria-label={`${label} view`}
              size="sm"
              options={MODES}
              value={mode === 'source' ? 'edit' : mode}
              onValueChange={onModeChange}
            />
            <Menu>
              <MenuTrigger asChild>
                <IconButton icon={MoreHorizontal} label="Block actions" size="sm" />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem icon={Braces} onSelect={editSource}>
                  Edit source
                </MenuItem>
                <MenuItem icon={CopyPlus} onSelect={props.onDuplicate}>
                  Duplicate
                </MenuItem>
                <MenuItem icon={Copy} onSelect={props.onCopySource}>
                  Copy source
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={Trash2} danger shortcut="backspace" onSelect={props.onDelete}>
                  Delete
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        ) : null}
        <BlockBoundary resetKey={props.resetKey} fallback={<BlockProblem onEditSource={editable ? editSource : undefined} />}>
          {props.children}
        </BlockBoundary>
      </div>
    </NodeViewWrapper>
  );
}
