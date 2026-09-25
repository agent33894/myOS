import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import { createNote } from '../../data/gateway';
import { useGitStatus } from '../../data/git';
import { invoke } from '../../data/ipc';
import { useNotes } from '../../data/selectors';
import { openFromLink } from '../../features/note/openToSide';
import { hasPrimaryModifier } from '../../lib/platform';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui';
import { findLinkedNote, findWikiLinkedNote } from '../../lib/links';
import { commitHashOf } from '../diff/commitLinks';
import { CommitDiffModal } from '../diff/CommitDiffModal';
import { CommitSummaryCard, useCommitSummary } from '../diff/commitSummary';
import { linkedNotePath } from './linkTargets';
import { refreshWikiLinks } from './wikiLinks';

interface CommitRef {
  hash: string;
  message: string;
  anchor: HTMLElement;
}

const EXTERNAL = /^(https?:|mailto:)/i;

/**
 * Link behavior inside the editor: wiki links and links to other notes open
 * them in their tab (beside this one with ⌘), web links open in the browser, and when the folder is a
 * Git repository, commit links preview on hover and open their diff on click.
 */
export function useLinks(editor: Editor | null, path: string) {
  const notes = useNotes();
  const inRepo = useGitStatus()?.repo ?? false;
  const [hovered, setHovered] = useState<CommitRef | null>(null);
  const [opened, setOpened] = useState<CommitRef | null>(null);

  const latest = useRef({ notes, inRepo, path });
  latest.current = { notes, inRepo, path };

  // Links to notes that don't exist yet look different; restyle whenever notes come and go.
  const titles = useMemo(() => notes.map((note) => `${note.title}\0${note.path}`).join('\n'), [notes]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.storage.wikiLinks.exists = (target) => findWikiLinkedNote(target, latest.current.notes) !== null;
    editor.view.dispatch(refreshWikiLinks(editor.state.tr));
  }, [editor, titles]);

  const commitAt = (target: EventTarget | null): CommitRef | null => {
    if (!latest.current.inRepo || !(target instanceof Element)) return null;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    const hash = anchor ? commitHashOf(anchor.getAttribute('href') ?? '') : null;
    return anchor && hash ? { hash, message: anchor.textContent?.trim() ?? '', anchor } : null;
  };

  /** ProseMirror `handleClick`: returns true when the click was a link it handled. */
  const handleClick = useRef((event: MouseEvent): boolean => {
    const { notes, path: from } = latest.current;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return false;
    const beside = hasPrimaryModifier(event);

    const wiki = target.closest<HTMLElement>('[data-wikilink]');
    if (wiki) {
      const name = wiki.dataset.wikilink ?? '';
      const linked = findWikiLinkedNote(name, notes);
      if (linked) openFromLink(linked.path, beside);
      else if (name) {
        // A missing link is an invitation: clicking it makes the note beside this one and opens it.
        createNote(linkedNotePath(name, from))
          .then((note) => openFromLink(note.path, beside))
          .catch(() => toast.error(`Couldn’t create “${name}”`));
      }
      return true;
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return false;
    const href = anchor.getAttribute('href') ?? '';
    const linked = findLinkedNote(href, from, notes);
    if (linked) {
      openFromLink(linked.path, beside);
      return true;
    }
    const commit = commitAt(anchor);
    if (commit) {
      setHovered(null);
      setOpened(commit);
      return true;
    }
    if (EXTERNAL.test(href)) {
      void invoke('shell:open-external', href).catch(() => toast.error('Couldn’t open that link'));
      return true;
    }
    return false;
  }).current;

  // Hover preview for commit links; the card stays while the pointer is on it.
  const hoverTimer = useRef(0);
  const hoverSoon = (commit: CommitRef | null) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(
      () => setHovered((current) => (commit && current?.anchor === commit.anchor ? current : commit)),
      commit ? 300 : 200,
    );
  };
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    const over = (event: MouseEvent) => hoverSoon(commitAt(event.target));
    dom.addEventListener('mouseover', over);
    return () => {
      window.clearTimeout(hoverTimer.current);
      dom.removeEventListener('mouseover', over);
    };
  }, [editor]);

  const layer =
    inRepo && (hovered || opened) ? (
      <CommitLayer
        hovered={hovered}
        opened={opened}
        onCardHover={(inside) => (inside ? window.clearTimeout(hoverTimer.current) : hoverSoon(null))}
        onHover={setHovered}
        onOpen={setOpened}
      />
    ) : null;

  return { handleClick, layer };
}

function CommitLayer({ hovered, opened, onCardHover, onHover, onOpen }: {
  onCardHover: (inside: boolean) => void;
  hovered: CommitRef | null;
  opened: CommitRef | null;
  onHover: (commit: CommitRef | null) => void;
  onOpen: (commit: CommitRef | null) => void;
}) {
  const shown = opened ?? hovered;
  const { summary, error } = useCommitSummary(shown?.hash ?? '', Boolean(shown));
  const anchor = useMemo(() => ({ current: hovered?.anchor ?? null }), [hovered]);
  return (
    <>
      <Popover open={Boolean(hovered)} onOpenChange={(open) => !open && onHover(null)}>
        <PopoverAnchor virtualRef={anchor as { current: HTMLElement }} />
        <PopoverContent
          side="top"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={() => onCardHover(true)}
          onMouseLeave={() => onCardHover(false)}
        >
          {hovered ? (
            <CommitSummaryCard hash={hovered.hash} message={hovered.message} summary={summary} error={error} onOpenDiff={() => {
              onHover(null);
              onOpen(hovered);
            }} />
          ) : null}
        </PopoverContent>
      </Popover>
      {opened ? (
        <CommitDiffModal
          isOpen
          onClose={() => onOpen(null)}
          commitHash={opened.hash}
          commitMessage={summary?.message || opened.message}
          summary={summary}
        />
      ) : null}
    </>
  );
}
