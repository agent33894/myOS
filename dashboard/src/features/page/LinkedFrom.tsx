import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { useArtifacts } from '../../data/selectors';
import { Button, Icon, ListRow, SectionHeader } from '../../ui';
import { findBacklinks } from '../../lib/artifactLinks';
import { itemIcon } from '../../lib/itemKinds';
import { linkMentionIn } from '../knowledge/linkMention';
import { findMentions, isLinkableTitle, type Mention } from '../knowledge/mentions';
import { toastWithUndo } from '../tasks/actions';

const SHOWN = 5;

// Emphasis and link brackets read as noise in a one-line preview.
const plain = (text: string) => text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target).replace(/[*_`~]+/g, '');

/** The words around a mention, with the title picked out. */
function Context({ mention }: { mention: Mention }) {
  const line = mention.lineText.replace(/\r$/, '');
  const lead = plain(line.slice(0, mention.column).replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+(?:\[.\]\s+)?|\d+[.)]\s+)/, ''));
  const before = lead.length > 48 ? `…${lead.slice(-44).replace(/^\S*\s/, '')}` : lead;
  const after = plain(line.slice(mention.column + mention.text.length));
  return (
    <span className="line-clamp-2 text-sm text-text-secondary">
      {before}
      <mark className="rounded-sm bg-accent-soft px-0.5 text-text">{mention.text}</mark>
      {after.length > 90 ? `${after.slice(0, 88)}…` : after}
    </span>
  );
}

function MentionRow({ page, mention, title }: { page: ArtifactSummary; mention: Mention; title: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try {
      if (await linkMentionIn(page, title, mention)) toastWithUndo(`Linked in “${page.title}”`);
      else toast('That mention has changed. Nothing was linked.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not link that mention');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-fast hover:bg-text/5">
      <Icon icon={itemIcon(page.type)} className="mt-0.5 shrink-0 text-text-tertiary" />
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate(toItemUrl(page))}
        onKeyDown={(event) => event.key === 'Enter' && navigate(toItemUrl(page))}
        className="flex min-w-0 flex-1 cursor-default flex-col gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span className="truncate text-base text-text">{page.title}</span>
        <Context mention={mention} />
      </div>
      <Button size="sm" variant="secondary" leadingIcon={Link2} loading={busy} onClick={() => void link()} aria-label={`Link this mention in ${page.title}`}>
        Link
      </Button>
    </div>
  );
}

/** Other pages that name this one in plain text, first mention each. */
function UnlinkedMentions({ item, artifacts }: { item: ArtifactSummary; artifacts: ArtifactSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const mentions = useMemo(() => {
    if (!isLinkableTitle(item.title)) return [];
    return artifacts
      .filter((page) => page.filePath !== item.filePath && page.type !== ArtifactType.TEMPLATE && page.searchText)
      .flatMap((page) => {
        const [first] = findMentions(page.searchText ?? '', item.title);
        return first ? [{ page, mention: first }] : [];
      })
      .sort((a, b) => b.page.updated.localeCompare(a.page.updated));
  }, [item.title, item.filePath, artifacts]);
  if (mentions.length === 0) return null;
  const shown = expanded ? mentions : mentions.slice(0, SHOWN);

  return (
    <section aria-label="Unlinked mentions" className="-mx-2 mt-8">
      <SectionHeader title="Unlinked mentions" count={mentions.length} as="h3" className="px-2" />
      {shown.map(({ page, mention }) => (
        <MentionRow key={page.filePath} page={page} mention={mention} title={item.title} />
      ))}
      {mentions.length > shown.length ? (
        <Button size="sm" variant="ghost" className="ml-1 mt-1" onClick={() => setExpanded(true)}>
          Show {mentions.length - shown.length} more
        </Button>
      ) : null}
    </section>
  );
}

/** Pages that point here with `[[links]]` or `related`, then pages that mention this one without a link. */
export function LinkedFrom({ item }: { item: ArtifactSummary }) {
  const navigate = useNavigate();
  const artifacts = useArtifacts();
  const backlinks = useMemo(() => findBacklinks(item, artifacts), [item, artifacts]);

  return (
    <div data-focus-hide="gone" className="mt-16">
      {backlinks.length > 0 ? (
        <section aria-label="Linked from" className="-mx-2">
          <SectionHeader title="Linked from" count={backlinks.length} as="h3" className="px-2" />
          {backlinks.map((linked) => (
            <ListRow
              key={linked.filePath}
              onActivate={() => navigate(toItemUrl(linked))}
              leading={<Icon icon={itemIcon(linked.type)} className="text-text-tertiary" />}
              className="px-2 text-text-secondary"
            >
              {linked.title}
            </ListRow>
          ))}
        </section>
      ) : null}
      <UnlinkedMentions item={item} artifacts={artifacts} />
    </div>
  );
}
