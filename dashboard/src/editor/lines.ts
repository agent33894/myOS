// The rendered editor has no line numbers, so it finds its place in the
// Markdown by text: letters and digits only, which survives `**`, `#`, list
// markers, and link syntax well enough to land on the right line.

const KEY_LENGTH = 32;

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** A line without its block syntax: heading marks, quote marks, list markers, checkboxes. */
const lineText = (line: string) =>
  line.replace(/^\s*(?:>\s*)*(?:#{1,6}\s+|(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?)?/, '');

/**
 * The body line that shows a rendered block's text. `occurrence` picks among
 * blocks with the same text (the second "Notes" heading). -1 when not found.
 */
export function lineOfText(markdown: string, text: string, occurrence = 0): number {
  const key = normalize(text).slice(0, KEY_LENGTH);
  if (!key) return -1;
  let seen = 0;
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (!normalize(lines[index]).includes(key)) continue;
    if (seen === occurrence) return index;
    seen += 1;
  }
  return -1;
}

/**
 * What to look for in the rendered document for a body line: the key of the
 * line's own text, or of the next line with text. Also returns how many
 * earlier lines share that key, so repeated text lands on the right block.
 */
export function textAtLine(markdown: string, line: number): { key: string; occurrence: number } | null {
  const lines = markdown.split('\n');
  for (let index = Math.max(0, line); index < lines.length; index += 1) {
    const key = normalize(lineText(lines[index]));
    if (!key) continue;
    const prefix = key.slice(0, KEY_LENGTH);
    const occurrence = lines.slice(0, index).filter((earlier) => normalize(lineText(earlier)).startsWith(prefix)).length;
    return { key, occurrence };
  }
  return null;
}

/**
 * How well a rendered block's text fits a line key from `textAtLine`: 2 when
 * they start the same, 1 when the line contains the block's text, else 0.
 */
export function blockMatch(blockText: string, key: string): 0 | 1 | 2 {
  const block = normalize(blockText).slice(0, KEY_LENGTH);
  if (!block) return 0;
  if (block === key.slice(0, KEY_LENGTH)) return 2;
  return block.length >= 4 && key.includes(block) ? 1 : 0;
}

/** Loose check that a task line and a rendered task item say the same thing. */
export const sameTaskText = (raw: string, itemText: string) => {
  const item = normalize(itemText);
  return item.length > 0 && normalize(raw).includes(item.slice(0, KEY_LENGTH));
};
