import type { ArtifactSummary } from '@shared/types';
import { currentRev, read, save } from '../../data/gateway';
import { record } from '../../data/undo';
import { linkMention, type Mention } from './mentions';

/**
 * Turn one plain mention of `title` in `page` into a `[[link]]`: read the
 * file, rewrite that occurrence only, and save against the revision just
 * read, so a change made elsewhere in the meantime is never overwritten.
 * One undo step puts the text back.
 */
export async function linkMentionIn(page: ArtifactSummary, title: string, mention: Pick<Mention, 'line' | 'column' | 'lineText'>): Promise<boolean> {
  const file = await read(page.filePath);
  const content = linkMention(file.content, title, mention);
  if (content === null) return false;
  await save(page.filePath, { fields: {}, content }, file.rev);
  const write = (text: string) => save(page.filePath, { fields: {}, content: text }, currentRev(page.filePath) ?? '');
  record({ label: `Link “${title}” in “${page.title}”`, undo: () => write(file.content), redo: () => write(content) });
  return true;
}
