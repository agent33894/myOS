/**
 * Unlinked mentions: places where another note says this note's title in
 * plain text. Code, links, and URLs don't count. Linking one rewrites only
 * that occurrence.
 */

export interface Mention {
  /** Offset in the body. */
  index: number;
  /** The text as written there (its own capitalization). */
  text: string;
  /** Which mention of the title this is, counting from the top of the body. */
  ordinal: number;
  /** The line around it, for context. */
  line: string;
}

const FENCE = /^\s*(`{3,}|~{3,})/;
// Inline code, wiki links, Markdown links and images, HTML tags, and bare URLs.
const SKIP = /`[^`\n]*`|\[\[[^\]\n]*\]\]|!?\[[^\]\n]*\]\([^)\n]*\)|<[^>\n]+>|\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;
const MIN_TITLE = 3;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function findMentions(body: string, title: string): Mention[] {
  const wanted = title.trim();
  if (wanted.length < MIN_TITLE) return [];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escape(wanted)}(?![\\p{L}\\p{N}_])`, 'giu');
  const mentions: Mention[] = [];
  let offset = 0;
  let fence: string | null = null;
  for (const line of body.split('\n')) {
    const marker = FENCE.exec(line)?.[1];
    if (marker && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) fence = fence === null ? marker : null;
    else if (fence === null) {
      const skipped = [...line.matchAll(SKIP)].map((match) => [match.index ?? 0, (match.index ?? 0) + match[0].length]);
      for (const match of line.matchAll(pattern)) {
        const start = match.index ?? 0;
        if (skipped.some(([from, to]) => start < to && start + match[0].length > from)) continue;
        mentions.push({ index: offset + start, text: match[0], ordinal: mentions.length, line: line.trim() });
      }
    }
    offset += line.length + 1;
  }
  return mentions;
}

/**
 * The body with mention `ordinal` of `title` turned into a link, or null when
 * that mention no longer reads `expected` (the file changed).
 */
export function linkMention(body: string, title: string, ordinal: number, expected: string, link: (text: string) => string): string | null {
  const mention = findMentions(body, title)[ordinal];
  if (!mention || mention.text !== expected) return null;
  return body.slice(0, mention.index) + link(mention.text) + body.slice(mention.index + mention.text.length);
}
