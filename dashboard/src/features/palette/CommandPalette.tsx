import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, CheckCircle2, FileText, Inbox, Search } from 'lucide-react';
import { projectSwatchFor } from '@shared/design-system/accents';
import { ArtifactType, TodoStatus, type ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { useArtifacts } from '../../data/selectors';
import { useDataStore } from '../../data/store';
import { useUIStore } from '../../store/ui';
import { Dialog, DialogContent, DialogTitle, Icon, Input, Kbd, cn } from '../../ui';
import { kindLabel } from '../../lib/itemKinds';
import { buildIndex, labelScore, searchDocs, type Snippet } from './search';
import { usePaletteCommands, type Command } from './usePaletteCommands';

type GroupName = 'Recent' | 'Go to' | 'Actions' | 'Results';

interface Row {
  id: string;
  group: GroupName;
  label: string;
  leading: ReactNode;
  meta?: string;
  shortcut?: string;
  snippet?: Snippet;
  run: () => void;
}

const GROUP_ORDER: GroupName[] = ['Recent', 'Go to', 'Actions', 'Results'];
function ItemGlyph({ item }: { item: ArtifactSummary }) {
  if (item.type === ArtifactType.PROJECT) {
    return (
      <span className="grid size-4 place-items-center">
        <span className="size-2 rounded-full" style={{ background: projectSwatchFor(item.title, item.swatch).hex }} />
      </span>
    );
  }
  const glyph =
    item.type === ArtifactType.TODO
      ? item.status === TodoStatus.DONE
        ? CheckCircle2
        : Circle
      : item.type === ArtifactType.INBOX
        ? Inbox
        : FileText;
  return <Icon icon={glyph} className="text-text-tertiary" />;
}

/** `text` with the first case-insensitive occurrence of `query` emphasized. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-text">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const artifacts = useArtifacts();
  const recentPaths = useUIStore((state) => state.recentPaths);
  const commands = usePaletteCommands();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildIndex(artifacts), [artifacts]);
  const projectTitles = useMemo(
    () => new Map(artifacts.filter((item) => item.type === ArtifactType.PROJECT).map((item) => [item.id, item.title])),
    [artifacts],
  );

  const rows = useMemo<Row[]>(() => {
    const needle = query.trim();
    const itemRow = (item: ArtifactSummary, group: GroupName, snippet?: Snippet): Row => {
      const kind = kindLabel(item.type);
      const project = item.project ? (projectTitles.get(item.project) ?? item.project) : undefined;
      return {
        id: `${group}-${item.filePath}`,
        group,
        label: item.title,
        leading: <ItemGlyph item={item} />,
        meta: [kind, project].filter(Boolean).join(' · ') || undefined,
        snippet,
        run: () => navigate(toItemUrl(item)),
      };
    };
    const commandRow = (command: Command): Row => ({
      id: command.id,
      group: command.group,
      label: command.label,
      leading: <Icon icon={command.icon} className="text-text-tertiary" />,
      shortcut: command.shortcut,
      run: command.run,
    });

    if (!needle) {
      const byPath = useDataStore.getState().byPath;
      const recent = recentPaths.flatMap((path) => (byPath[path] ? [itemRow(byPath[path], 'Recent')] : []));
      return [...recent, ...commands.map(commandRow)];
    }

    const matched = commands
      .map((command) => ({ command, score: Math.max(labelScore(command.label, needle), labelScore(command.keywords ?? '', needle) - 1) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ command }) => commandRow(command));
    const results = searchDocs(index, needle).map((hit) => itemRow(hit.item, 'Results', hit.snippet));
    return [...matched, ...results].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [query, commands, index, recentPaths, projectTitles, navigate]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (row: Row | undefined) => {
    if (!row) return;
    onClose();
    row.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = rows.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (count) setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(rows[active]);
    }
  };

  const groups = GROUP_ORDER.map((name) => ({
    name,
    id: `palette-group-${name.replace(' ', '-')}`,
    rows: rows.filter((row) => row.group === name),
  })).filter(
    (group) => group.rows.length > 0,
  );
  const activeRow = rows[active];

  return (
    <>
      <DialogTitle className="sr-only">Search and commands</DialogTitle>
      <div className="flex items-center gap-3 border-b border-border pl-5 pr-12">
        <Icon icon={Search} className="text-text-tertiary" />
        <Input
          autoFocus
          variant="ghost"
          role="combobox"
          aria-label="Search notes, tasks, projects, and commands"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-autocomplete="list"
          aria-activedescendant={activeRow ? `palette-${activeRow.id}` : undefined}
          placeholder="Search or type a command"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-14 px-0 text-md hover:bg-transparent focus-visible:bg-transparent"
        />
      </div>
      <div ref={listRef} id="palette-results" role="listbox" aria-label="Results" className="max-h-96 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.name} role="group" aria-labelledby={group.id} className="pb-1">
            <div id={group.id} className="px-3 pb-1 pt-2 text-sm font-medium text-text-secondary">
              {group.name}
            </div>
            {group.rows.map((row) => {
              const isActive = row === activeRow;
              return (
                <div
                  key={row.id}
                  id={`palette-${row.id}`}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive}
                  onMouseMove={() => !isActive && setActive(rows.indexOf(row))}
                  onClick={() => run(row)}
                  className={cn(
                    'flex cursor-default items-start gap-3 rounded-md px-3 py-2 transition-colors duration-fast',
                    isActive && 'bg-accent-soft',
                  )}
                >
                  <span className="flex h-5 shrink-0 items-center">{row.leading}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base text-text">
                      <Highlight text={row.label} query={query.trim()} />
                    </span>
                    {row.snippet ? (
                      <span className="line-clamp-2 text-sm text-text-secondary">
                        {row.snippet.before}
                        <mark className="bg-transparent font-medium text-text">{row.snippet.match}</mark>
                        {row.snippet.after}
                      </span>
                    ) : null}
                  </span>
                  {row.meta ? <span className="shrink-0 truncate pt-px text-sm text-text-tertiary">{row.meta}</span> : null}
                  {row.shortcut ? <Kbd shortcut={row.shortcut} className="shrink-0" /> : null}
                </div>
              );
            })}
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="px-3 py-10 text-center text-base text-text-secondary">
            Nothing matches “{query.trim()}”. Try fewer words.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4 border-t border-border px-5 py-2 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <Kbd shortcut="up" />
          <Kbd shortcut="down" />
          to move
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="enter" />
          to open
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="escape" />
          to close
        </span>
      </div>
    </>
  );
}

/** ⌘K: titles, full text, recent items, and commands in one list. */
export function CommandPalette() {
  const open = useUIStore((state) => state.isCommandPaletteOpen);
  const close = useUIStore((state) => state.closeCommandPalette);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        size="lg"
        aria-describedby={undefined}
        className="mt-16 gap-0 self-start overflow-hidden p-0"
      >
        {open ? <PaletteBody onClose={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}
