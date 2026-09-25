/**
 * Unlinked mentions: places where a page's title appears as plain text in
 * another page. Linking one rewrites exactly that occurrence to `[[…]]`;
 * every other byte of the file stays as it was.
 */

export interface Mention {
  /** Zero-based line in the body. */
  line: number;
  /** Where the title starts in that line. */
  column: number;
  /** The text as written (its case may differ from the title). */
  text: string;
  /** The whole line, for showing the mention in context. */
  lineText: string;
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const WORD = /[\p{L}\p{N}_]/u;

// Spans where a title is not "plain text": inline code, wiki links, Markdown
// links and images (text and target), autolinks, bare URLs, and HTML tags.
const PROTECTED = /`+[^`]*`+|!?\[\[[^\]]*\]\]|!?\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\[[^\]]*\]|<[^>\n]+>|\bhttps?:\/\/\S+/g;

/** A title that can be linked as `[[title]]` and is long enough not to match everywhere. */
export const isLinkableTitle = (title: string) => {
  const trimmed = title.trim();
  return trimmed.length >= 3 && !/[[\]|\n]/.test(trimmed) && trimmed.toLowerCase() !== 'untitled';
};

function mask(line: string): string {
  return line.replace(PROTECTED, (match) => ' '.repeat(match.length));
}

/** Every plain-text occurrence of `title` in `body`, whole words only, case-insensitive. */
export function findMentions(body: string, title: string): Mention[] {
  const wanted = title.trim().toLowerCase();
  if (!isLinkableTitle(title)) return [];
  const mentions: Mention[] = [];
  let fence: string | null = null;
  body.split('\n').forEach((lineText, line) => {
    const opener = FENCE.exec(lineText)?.[1];
    if (fence) {
      if (opener && opener[0] === fence[0] && opener.length >= fence.length) fence = null;
      return;
    }
    if (opener) {
      fence = opener;
      return;
    }
    // Indented code blocks and link reference definitions are not prose either.
    if (/^( {4}|\t)/.test(lineText) || /^\s{0,3}\[[^\]]+\]:\s/.test(lineText)) return;
    const plain = mask(lineText).toLowerCase();
    for (let at = plain.indexOf(wanted); at >= 0; at = plain.indexOf(wanted, at + 1)) {
      const before = plain[at - 1];
      const after = plain[at + wanted.length];
      if ((before && WORD.test(before)) || (after && WORD.test(after))) continue;
      mentions.push({ line, column: at, text: lineText.slice(at, at + wanted.length), lineText });
    }
  });
  return mentions;
}

/**
 * `body` with one mention turned into a link: the occurrence at the same line
 * and column when it is still there, else the first one on that line. The
 * line is found by its text when it has moved (the mention may come from a
 * shortened copy of a long file). Null when the line no longer mentions the title.
 */
export function linkMention(body: string, title: string, mention: Pick<Mention, 'line' | 'column'> & { lineText?: string }): string | null {
  const lines = body.split('\n');
  const moved = mention.lineText !== undefined && lines[mention.line] !== mention.lineText;
  const line = moved ? lines.indexOf(mention.lineText!) : mention.line;
  const onLine = findMentions(body, title).filter((candidate) => candidate.line === line);
  const target = onLine.find((candidate) => candidate.column === mention.column) ?? onLine[0];
  if (!target) return null;
  // Offsets by line keep every other byte (including \r\n endings) exactly as it was.
  let offset = 0;
  for (let index = 0; index < target.line; index += 1) offset += lines[index].length + 1;
  const start = offset + target.column;
  return `${body.slice(0, start)}[[${target.text}]]${body.slice(start + target.text.length)}`;
}
