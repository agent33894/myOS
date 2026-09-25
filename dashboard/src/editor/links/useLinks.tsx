import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import { ArtifactType } from '@shared/types';
import { toItemUrl, toNoteUrl } from '../../app/navigation';
import { create } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import { useArtifacts } from '../../data/selectors';
import { useDataStore } from '../../data/store';
import { useWorkspacePath } from '../../data/workspace';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui';
import { findLinkedArtifact, findWikiLinkedArtifact } from '../../lib/artifactLinks';
import { commitHashOf } from '../diff/commitLinks';
import { CommitDiffModal } from '../diff/CommitDiffModal';
import { CommitSummaryCard, useCommitSummary } from '../diff/commitSummary';
import { linkedNoteDraft } from './linkTargets';
import { refreshWikiLinks } from './wikiLinks';

interface LinkContext {
  filePath: string;
  type: string;
}

interface CommitRef {
  hash: string;
  message: string;
  anchor: HTMLElement;
}

const EXTERNAL = /^(https?:|mailto:)/i;

/**
 * Link behavior inside the editor: wiki links and links to other notes open
 * them in the app, web links open in the browser, and in development notes
 * commit links preview on hover and open their diff on click.
 */
export function useLinks(editor: Editor | null, context: LinkContext) {
  const navigate = useNavigate();
  const artifacts = useArtifacts();
  const [workspacePath] = useWorkspacePath();
  const [hovered, setHovered] = useState<CommitRef | null>(null);
  const [opened, setOpened] = useState<CommitRef | null>(null);

  // Commits resolve in the owning project's repository, else the workspace's.
  const repoPath = useMemo(() => {
    if (context.type !== ArtifactType.DEVELOPMENT) return null;
    const ref = artifacts.find((artifact) => artifact.filePath === context.filePath)?.project;
    const project = ref ? artifacts.find((artifact) => artifact.type === ArtifactType.PROJECT && (artifact.id === ref || artifact.title === ref)) : undefined;
    return project?.localPath ?? workspacePath;
  }, [artifacts, context.filePath, context.type, workspacePath]);

  const latest = useRef({ artifacts, navigate, repoPath, filePath: context.filePath });
  latest.current = { artifacts, navigate, repoPath, filePath: context.filePath };

  // Links to pages that don't exist yet look different; restyle whenever pages come and go.
  const titles = useMemo(() => artifacts.map((artifact) => `${artifact.title}\0${artifact.filePath}`).join('\n'), [artifacts]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.storage.wikiLinks.exists = (target) => findWikiLinkedArtifact(target, latest.current.artifacts) !== null;
    editor.view.dispatch(refreshWikiLinks(editor.state.tr));
  }, [editor, titles]);

  const commitAt = (target: EventTarget | null): CommitRef | null => {
    if (!latest.current.repoPath || !(target instanceof Element)) return null;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    const hash = anchor ? commitHashOf(anchor.getAttribute('href') ?? '') : null;
    return anchor && hash ? { hash, message: anchor.textContent?.trim() ?? '', anchor } : null;
  };

  /** ProseMirror `handleClick`: returns true when the click was a link it handled. */
  const handleClick = useRef((event: MouseEvent): boolean => {
    const { artifacts, navigate, filePath } = latest.current;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return false;

    const wiki = target.closest<HTMLElement>('[data-wikilink]');
    if (wiki) {
      const name = wiki.dataset.wikilink ?? '';
      const linked = findWikiLinkedArtifact(name, artifacts);
      if (linked) navigate(toItemUrl(linked));
      else if (name) {
        // A missing link is an invitation: clicking it makes the note and opens it.
        create(linkedNoteDraft(name, useDataStore.getState().byPath[filePath]), `Create “${name}”`)
          .then((note) => navigate(toNoteUrl(note.filePath)))
          .catch(() => toast.error(`Couldn’t create “${name}”`));
      }
      return true;
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return false;
    const href = anchor.getAttribute('href') ?? '';
    const linked = findLinkedArtifact(href, filePath, artifacts);
    if (linked) {
      navigate(toItemUrl(linked));
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
    repoPath && (hovered || opened) ? (
      <CommitLayer
        repoPath={repoPath}
        hovered={hovered}
        opened={opened}
        onCardHover={(inside) => (inside ? window.clearTimeout(hoverTimer.current) : hoverSoon(null))}
        onHover={setHovered}
        onOpen={setOpened}
      />
    ) : null;

  return { handleClick, layer };
}

function CommitLayer({ repoPath, hovered, opened, onCardHover, onHover, onOpen }: {
  repoPath: string;
  onCardHover: (inside: boolean) => void;
  hovered: CommitRef | null;
  opened: CommitRef | null;
  onHover: (commit: CommitRef | null) => void;
  onOpen: (commit: CommitRef | null) => void;
}) {
  const shown = opened ?? hovered;
  const { summary, error } = useCommitSummary(repoPath, shown?.hash ?? '', Boolean(shown));
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
          projectPath={repoPath}
          summary={summary}
        />
      ) : null}
    </>
  );
}
