import { useMemo, useState, type MouseEvent } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { NoteSummary } from '@shared/spec';
import type { PanelProps } from '../../app/panels';
import { read, save } from '../../data/gateway';
import { isConflict } from '../../data/ipc';
import { useNote, useNotes } from '../../data/selectors';
import { findBacklinks, findLinkedNote, findWikiLinkedNote, matchWikiLinks } from '../../lib/links';
import { hasPrimaryModifier } from '../../lib/platform';
import { Button, EmptyState, SectionHeader } from '../../ui';
import { findMentions, linkMention, type Mention } from './mentions';
import { openFromLink } from './openToSide';

const MAX_MENTIONS = 50;

type Linkable = Pick<NoteSummary, 'path' | 'title'>;

/** The first line of `note` that links to `target`, for context. */
function linkingLine(note: NoteSummary, target: Linkable): string {
  const line = note.searchText.split('\n').find((text) => {
    if (matchWikiLinks(text).some((link) => findWikiLinkedNote(link.target, [target]))) return true;
    return [...text.matchAll(/\]\(([^)\s]+)\)/g)].some((match) => findLinkedNote(match[1], note.path, [target]));
  });
  return line?.trim() ?? '';
}

const open = (path: string) => (event: MouseEvent) => openFromLink(path, hasPrimaryModifier(event));

/** Context around a mention, with the mention itself marked. */
function Snippet({ line, text }: { line: string; text?: string }) {
  const at = text ? line.toLowerCase().indexOf(text.toLowerCase()) : -1;
  if (!line) return null;
  if (at < 0) return <span className="line-clamp-2 text-xs text-text-tertiary">{line}</span>;
  const start = Math.max(0, at - 60);
  return (
    <span className="line-clamp-2 text-xs text-text-tertiary">
      {start > 0 ? '…' : ''}
      {line.slice(start, at)}
      <mark className="rounded-sm bg-accent-soft px-0.5 text-accent-text">{line.slice(at, at + text!.length)}</mark>
      {line.slice(at + text!.length)}
    </span>
  );
}

/**
 * Notes that link to the open one, and notes that mention its title without
 * a link. "Link" turns that one mention into `[[…]]` and changes nothing else.
 */
export function BacklinksPanel({ path }: PanelProps) {
  const note = useNote(path);
  const notes = useNotes();
  const [busy, setBusy] = useState<string | null>(null);
  const linked = useMemo(() => (note ? findBacklinks(note, notes) : []), [note, notes]);
  const mentions = useMemo(() => {
    if (!note) return [];
    const found: Array<{ from: NoteSummary; mention: Mention }> = [];
    for (const other of notes) {
      if (other.path === note.path) continue;
      for (const mention of findMentions(other.searchText, note.title)) found.push({ from: other, mention });
      if (found.length >= MAX_MENTIONS) break;
    }
    return found.sort((a, b) => a.from.title.localeCompare(b.from.title) || a.mention.ordinal - b.mention.ordinal);
  }, [note, notes]);

  if (!path || !note) return <EmptyState icon={Link2} title="No note open" description="Open a note to see what links to it." />;

  const link = async (from: NoteSummary, mention: Mention) => {
    const key = `${from.path}:${mention.ordinal}`;
    setBusy(key);
    try {
      const fresh = await read(from.path);
      const target = (text: string) => (findWikiLinkedNote(text, notes)?.path === note.path ? `[[${text}]]` : `[[${note.path.replace(/\.md$/i, '')}|${text}]]`);
      const next = linkMention(fresh.content, note.title, mention.ordinal, mention.text, target);
      if (next === null) {
        toast.error(`${from.title} changed. Try again.`);
        return;
      }
      await save(from.path, { content: next }, fresh.rev);
      toast(`Linked in ${from.title}.`);
    } catch (error) {
      toast.error(isConflict(error) ? `${from.title} changed on disk. Try again.` : error instanceof Error ? error.message : 'Could not add the link');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <section className="flex flex-col">
        <SectionHeader title="Linked from" count={linked.length} as="h3" className="px-2" />
        {linked.length === 0 ? (
          <p className="px-2 text-sm text-text-tertiary">No notes link here yet.</p>
        ) : (
          linked.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-2 py-2 text-left font-normal"
              onClick={open(item.path)}
            >
              <span className="w-full truncate text-base text-text">{item.title}</span>
              <Snippet line={linkingLine(item, note)} />
            </Button>
          ))
        )}
      </section>
      <section className="flex flex-col">
        <SectionHeader title="Unlinked mentions" count={mentions.length} as="h3" className="px-2" />
        {mentions.length === 0 ? (
          <p className="px-2 text-sm text-text-tertiary">No other note mentions “{note.title}”.</p>
        ) : (
          mentions.map(({ from, mention }) => (
            <div key={`${from.path}:${mention.ordinal}`} className="group flex items-start gap-1 rounded-md hover:bg-text/5">
              <Button
                variant="ghost"
                className="h-auto min-w-0 flex-1 flex-col items-start gap-1 whitespace-normal px-2 py-2 text-left font-normal hover:bg-transparent"
                onClick={open(from.path)}
              >
                <span className="w-full truncate text-base text-text">{from.title}</span>
                <Snippet line={mention.line} text={mention.text} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="mr-1 mt-2 shrink-0"
                loading={busy === `${from.path}:${mention.ordinal}`}
                aria-label={`Link this mention in ${from.title}`}
                onClick={() => void link(from, mention)}
              >
                Link
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
