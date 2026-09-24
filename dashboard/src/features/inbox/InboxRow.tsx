import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, FileText, FolderInput, MoreHorizontal, Trash2 } from 'lucide-react';
import type { ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { draggableItem } from '../../lib/artifactDnd';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuTrigger,
} from '../../ui';
import { snippet } from '../notes/noteSearch';
import { attempt, deleteItem, toastWithUndo } from '../tasks/actions';
import { createdAt, relativeTime } from '../tasks/dates';
import { ProjectMenuItems } from '../tasks/menus';
import { makeNote, makeTask } from './inboxActions';

const hoverOnly = 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 data-[state=open]:opacity-100';

/** One capture: its first line, a preview, when it arrived, and quick ways to sort it. */
export function InboxRow({ item }: { item: ArtifactSummary }) {
  const navigate = useNavigate();
  const preview = snippet(item.searchText, '', item.title);
  const open = () => navigate(toItemUrl(item));
  const toTask = (project?: string) =>
    attempt(makeTask(item, project ? { project } : {}).then(() => toastWithUndo('Made a task')));
  const toNote = () => attempt(makeNote(item).then(() => toastWithUndo('Made a note')));

  const items = (
    <>
      <MenuItem icon={ArrowUpRight} onSelect={open}>
        Open
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={CheckCircle2} shortcut="t" onSelect={() => toTask()}>
        Make task
      </MenuItem>
      <MenuItem icon={FileText} shortcut="n" onSelect={toNote}>
        Make note
      </MenuItem>
      <MenuSub label="Move to project" icon={FolderInput}>
        <ProjectMenuItems onChange={(id) => id && toTask(id)} />
      </MenuSub>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={() => void deleteItem(item)}>
        Delete
      </MenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="listitem"
          {...draggableItem(item)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const action = { Enter: open, t: () => toTask(), n: toNote, Backspace: () => void deleteItem(item) }[event.key];
            if (!action) return;
            event.preventDefault();
            action();
          }}
          className="group/row flex items-center gap-3 rounded-md py-2 pl-3 pr-1 outline-none transition-colors duration-fast hover:bg-text/5 focus-visible:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-text/5"
        >
          <div className="min-w-0 flex-1 cursor-default" onClick={open}>
            <p className="truncate text-base text-text">{item.title}</p>
            {preview ? <p className="mt-0.5 truncate text-sm text-text-tertiary">{preview}</p> : null}
          </div>
          <div className="relative flex shrink-0 items-center">
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-tertiary transition-opacity duration-fast group-hover/row:opacity-0 group-focus-within/row:opacity-0 group-data-[state=open]/row:opacity-0">
              {relativeTime(createdAt(item))}
            </span>
            <IconButton icon={CheckCircle2} label="Make task" shortcut="t" size="sm" tabIndex={-1} onClick={() => toTask()} className={hoverOnly} />
            <IconButton icon={FileText} label="Make note" shortcut="n" size="sm" tabIndex={-1} onClick={toNote} className={hoverOnly} />
            <Menu>
              <MenuTrigger asChild>
                <IconButton icon={MoreHorizontal} label="More" size="sm" tabIndex={-1} className={hoverOnly} />
              </MenuTrigger>
              <MenuContent align="end">{items}</MenuContent>
            </Menu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>{items}</ContextMenuContent>
    </ContextMenu>
  );
}
