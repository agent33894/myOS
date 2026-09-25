import { useMemo } from 'react';
import { ListTree } from 'lucide-react';
import type { PanelProps } from '../../app/panels';
import { useDataStore } from '../../data/store';
import { editorFor, useCaretLines } from '../../editor/bridge';
import { Button, EmptyState, cn } from '../../ui';
import { useNoteStatus } from './noteStatus';

interface Heading {
  level: number;
  text: string;
  /** 0-based line in the body. */
  line: number;
}

const FENCE = /^\s*(`{3,}|~{3,})/;

/** `**API** and [[Auth|login]]` → `API and login`: heading text as it reads, code spans without their backticks. */
function plain(text: string): string {
  // Code spans and escaped characters are kept aside as they read, so nothing below touches them.
  const kept: string[] = [];
  const keep = (value: string) => `\uE000${kept.push(value) - 1}\uE000`;
  let out = text.replace(/\\([\\`*_{}[\]()#+\-.!~|<>])/g, (_match, char: string) => keep(char)).replace(/(`+)(.+?)\1/g, (_match, _ticks, inner: string) => keep(inner.trim()));
  out = out
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/!?\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '');
  // Emphasis can nest (`**bold _and_ more**`): strip until nothing changes. Underscores only count at word edges.
  for (let previous = ''; previous !== out; ) {
    previous = out;
    out = out.replace(/(\*\*|\*|~~)(?=\S)(.+?)(?<=\S)\1/g, '$2').replace(/(?<![\p{L}\p{N}])(__|_)(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}])/gu, '$2');
  }
  return out.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => kept[Number(index)]).trim();
}

/** ATX headings in the body, outside code fences. */
function headings(markdown: string): Heading[] {
  let fence: string | null = null;
  return markdown.split('\n').flatMap((line, index) => {
    const marker = FENCE.exec(line)?.[1];
    if (marker && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence === null ? marker : null;
      return [];
    }
    const match = fence ? null : /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    return match ? [{ level: match[1].length, text: plain(match[2]), line: index }] : [];
  });
}

/** The note's headings. Click one to go there; the heading you are in is marked. */
export function OutlinePanel({ path }: PanelProps) {
  const live = useNoteStatus((state) => (state.path === path ? state.content : null));
  const saved = useDataStore((state) => (path ? (state.bodies[path]?.content ?? state.notes[path]?.searchText ?? '') : ''));
  const caret = useCaretLines((state) => (path ? state[path] : undefined));
  const items = useMemo(() => headings(live ?? saved), [live, saved]);

  if (!path) return <EmptyState icon={ListTree} title="No note open" description="Open a note to see its headings." />;
  if (items.length === 0) return <EmptyState icon={ListTree} title="No headings" description="Start a line with # to add a heading." />;

  const minLevel = Math.min(...items.map((item) => item.level));
  const current = caret === undefined ? -1 : items.reduce((found, item, index) => (item.line <= caret ? index : found), -1);

  return (
    <nav aria-label="Outline" className="flex flex-col py-2">
      {items.map((item, index) => (
        <Button
          key={`${item.line}:${item.text}`}
          variant="ghost"
          size="sm"
          aria-current={index === current ? 'location' : undefined}
          className={cn(
            'w-full justify-start truncate font-normal',
            index === current ? 'bg-text/5 text-text' : 'text-text-secondary',
            item.level === minLevel && 'font-medium',
          )}
          style={{ paddingLeft: `${8 + (item.level - minLevel) * 12}px` }}
          onClick={() => editorFor(path)?.revealLine(item.line)}
        >
          <span className="truncate">{item.text}</span>
        </Button>
      ))}
    </nav>
  );
}
