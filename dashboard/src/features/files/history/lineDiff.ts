export interface DiffRow {
  type: 'same' | 'added' | 'removed';
  text: string;
}

export type DiffPiece = { kind: 'rows'; rows: DiffRow[] } | { kind: 'gap'; count: number };

const splitLines = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');

/**
 * A line diff from `before` to `after`: lines only in `before` are removed,
 * lines only in `after` are added. Common ends are trimmed first, so typical
 * edits compare only the changed middle.
 */
export function diffLines(before: string, after: string): DiffRow[] {
  const a = before ? splitLines(before) : [];
  const b = after ? splitLines(after) : [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const rows: DiffRow[] = a.slice(0, start).map((text) => ({ type: 'same', text }));

  // Longest common subsequence over the changed middle; a huge rewrite reads as removed-then-added.
  const n = midA.length;
  const m = midB.length;
  if (n * m > 4_000_000) {
    rows.push(...midA.map((text): DiffRow => ({ type: 'removed', text })), ...midB.map((text): DiffRow => ({ type: 'added', text })));
    for (const text of a.slice(endA)) rows.push({ type: 'same', text });
    return rows;
  }
  const table = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * (m + 1) + j] =
        midA[i] === midB[j] ? table[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(table[(i + 1) * (m + 1) + j], table[i * (m + 1) + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && midA[i] === midB[j]) {
      rows.push({ type: 'same', text: midA[i] });
      i += 1;
      j += 1;
    } else if (i < n && (j === m || table[(i + 1) * (m + 1) + j] >= table[i * (m + 1) + j + 1])) {
      // Removed lines come before the lines that replace them.
      rows.push({ type: 'removed', text: midA[i] });
      i += 1;
    } else {
      rows.push({ type: 'added', text: midB[j] });
      j += 1;
    }
  }
  for (const text of a.slice(endA)) rows.push({ type: 'same', text });
  return rows;
}

/** Changed rows with `context` unchanged lines around them; longer unchanged runs fold into gaps. */
export function foldUnchanged(rows: DiffRow[], context = 2): DiffPiece[] {
  const keep = rows.map(() => false);
  rows.forEach((row, index) => {
    if (row.type === 'same') return;
    for (let k = Math.max(0, index - context); k <= Math.min(rows.length - 1, index + context); k += 1) keep[k] = true;
  });
  const pieces: DiffPiece[] = [];
  let gap = 0;
  rows.forEach((row, index) => {
    if (!keep[index]) {
      gap += 1;
      return;
    }
    if (gap) pieces.push({ kind: 'gap', count: gap });
    gap = 0;
    const last = pieces[pieces.length - 1];
    if (last?.kind === 'rows') last.rows.push(row);
    else pieces.push({ kind: 'rows', rows: [row] });
  });
  if (gap) pieces.push({ kind: 'gap', count: gap });
  return pieces;
}

/** Split a saved file into its properties block and its body, the way the reading view sees it. */
export function splitFrontmatter(raw: string): { title: string | null; properties: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { title: null, properties: '', body: raw };
  const titleLine = /^title:\s*(.*)$/m.exec(match[1]);
  return { title: titleLine ? unquote(titleLine[1].trim()) : null, properties: match[1], body: raw.slice(match[0].length) };
}

function unquote(value: string): string {
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  return value.startsWith("'") ? value.slice(1, -1).replace(/''/g, "'") : value;
}
