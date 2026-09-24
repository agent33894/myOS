import type { ReactNode } from 'react';
import { addDays, format } from 'date-fns';
import type { ArtifactPatch, ArtifactSummary, TodoPriority } from '@shared/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { shortDate } from './format';

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface ProjectTaskContextMenuProps {
  task: ArtifactSummary;
  applyEdit: (base: ArtifactSummary, changes: ArtifactPatch, description: string) => Promise<void>;
  onPickDate: () => void;
  children: ReactNode;
}

/**
 * Right-click task actions. "Pick date…" reopens the row's calendar affordance —
 * a popover must not nest inside the menu portal.
 */
export function ProjectTaskContextMenu({
  task,
  applyEdit,
  onPickDate,
  children,
}: ProjectTaskContextMenuProps) {
  const setDue = (offsetDays: number | null) => {
    const due = offsetDays === null ? undefined : format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
    void applyEdit(task, { due }, due ? `Due ${shortDate(due)}` : 'Clear due date');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Priority</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={String(task.priority ?? '')}
              onValueChange={(value) =>
                void applyEdit(task, { priority: value as TodoPriority }, `Priority ${value}`)
              }
            >
              {PRIORITIES.map((priority) => (
                <ContextMenuRadioItem key={priority.value} value={priority.value}>
                  {priority.label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!task.priority}
              onSelect={() => void applyEdit(task, { priority: undefined }, 'Clear priority')}
            >
              Clear priority
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Due date</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => setDue(0)}>Today</ContextMenuItem>
            <ContextMenuItem onSelect={() => setDue(1)}>Tomorrow</ContextMenuItem>
            <ContextMenuItem onSelect={() => setDue(7)}>Next week</ContextMenuItem>
            <ContextMenuItem onSelect={() => setTimeout(onPickDate, 0)}>Pick date…</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!task.due} onSelect={() => setDue(null)}>
              Clear due date
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() =>
            void applyEdit(
              task,
              { flagged: !task.flagged },
              task.flagged ? `Unflag ${task.title}` : `Flag ${task.title}`,
            )
          }
        >
          {task.flagged ? 'Remove flag' : 'Flag'}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            void applyEdit(
              task,
              { deferDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
              'Defer to tomorrow',
            )
          }
        >
          Defer to tomorrow
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
