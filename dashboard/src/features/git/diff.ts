/** One line in a diff, with its line numbers before (`old`) and after (`new`). */
export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
  old?: number;
  new?: number;
  /** For a changed line paired with its replacement: the parts that differ, as [start, end) offsets into `text`. */
  marks?: Array<[number, number]>;
}

export interface DiffHunk {
  /** The `@@ … @@` context Git adds (usually the nearest heading or function), if any. */
  heading: string;
  lines: DiffLine[];
}

export interface FileDiff {
  hunks: DiffHunk[];
  added: number;
  removed: number;
  binary: boolean;
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/;

/** Parse Git's unified diff for one file into hunks of numbered lines, with word marks on changed pairs. */
export function parseUnifiedDiff(text: string): FileDiff {
  const result: FileDiff = { hunks: [], added: 0, removed: 0, binary: /^Binary files /m.test(text) };
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  for (const line of text.split('\n')) {
    const header = HUNK.exec(line);
    if (header) {
      oldNo = Number(header[1]);
      newNo = Number(header[2]);
      hunk = { heading: header[3].trim(), lines: [] };
      result.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    const mark = line[0];
    const body = line.slice(1);
    if (mark === '+') {
      hunk.lines.push({ type: 'added', text: body, new: newNo++ });
      result.added += 1;
    } else if (mark === '-') {
      hunk.lines.push({ type: 'removed', text: body, old: oldNo++ });
      result.removed += 1;
    } else if (mark === ' ') {
      hunk.lines.push({ type: 'same', text: body, old: oldNo++, new: newNo++ });
    }
    // `\ No newline at end of file` and trailing blanks carry no line.
  }
  for (const each of result.hunks) markWords(each.lines);
  return result;
}

const TOKEN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

/** Character ranges of `a` and `b` that are not part of their longest common run of words. */
function wordMarks(a: string, b: string): [Array<[number, number]>, Array<[number, number]>] {
  const ta = Array.from(a.matchAll(TOKEN), (match) => ({ text: match[0], at: match.index }));
  const tb = Array.from(b.matchAll(TOKEN), (match) => ({ text: match[0], at: match.index }));
  const n = ta.length;
  const m = tb.length;
  const table = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * (m + 1) + j] =
        ta[i].text === tb[j].text ? table[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(table[(i + 1) * (m + 1) + j], table[i * (m + 1) + j + 1]);
    }
  }
  const keepA = new Array<boolean>(n).fill(false);
  const keepB = new Array<boolean>(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ta[i].text === tb[j].text) {
      keepA[i++] = true;
      keepB[j++] = true;
    } else if (table[(i + 1) * (m + 1) + j] >= table[i * (m + 1) + j + 1]) i += 1;
    else j += 1;
  }
  const ranges = (tokens: typeof ta, keep: boolean[]) => {
    const out: Array<[number, number]> = [];
    tokens.forEach((token, index) => {
      if (keep[index]) return;
      const end = token.at + token.text.length;
      const last = out[out.length - 1];
      if (last && last[1] === token.at) last[1] = end;
      else out.push([token.at, end]);
    });
    return out;
  };
  return [ranges(ta, keepA), ranges(tb, keepB)];
}

/**
 * Word marks for runs of removed lines followed by the same number of added
 * lines (an edited paragraph). Lines that changed almost entirely stay
 * unmarked: the line tint already says it.
 */
export function markWords(lines: DiffLine[]): void {
  let index = 0;
  while (index < lines.length) {
    if (lines[index].type !== 'removed') {
      index += 1;
      continue;
    }
    let removedEnd = index;
    while (removedEnd < lines.length && lines[removedEnd].type === 'removed') removedEnd += 1;
    let addedEnd = removedEnd;
    while (addedEnd < lines.length && lines[addedEnd].type === 'added') addedEnd += 1;
    const count = removedEnd - index;
    if (count === addedEnd - removedEnd) {
      for (let k = 0; k < count; k += 1) {
        const before = lines[index + k];
        const after = lines[removedEnd + k];
        if (before.text.length + after.text.length > 2000) continue;
        const [marksBefore, marksAfter] = wordMarks(before.text, after.text);
        const changed = marksAfter.reduce((sum, [start, end]) => sum + end - start, 0);
        if (changed && changed < after.text.length * 0.7) {
          before.marks = marksBefore;
          after.marks = marksAfter;
        }
      }
    }
    index = addedEnd;
  }
}
