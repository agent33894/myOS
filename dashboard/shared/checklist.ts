import type { ArtifactFields, CheckItem } from './types';

// `- [ ] text`, `* [x] text`, `1. [ ] text`, at any indent.
const CHECK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s+)(.*?)\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const FRONTMATTER_OPEN = /^\uFEFF?---\s*$/;
// Obsidian Tasks' `📅 2026-09-30`, or a trailing `due 2026-09-30`.
const DUE = /\s*(?:📅\s*(\d{4}-\d{2}-\d{2})|\bdue\s+(\d{4}-\d{2}-\d{2})\s*$)/u;

function parseCheck(line: string): { done: boolean; text: string; due?: string } | null {
  const match = CHECK_LINE.exec(line.replace(/\r$/, ''));
  if (!match || !match[4]) return null;
  const due = DUE.exec(match[4]);
  const text = due ? match[4].replace(DUE, ' ').replace(/\s+/g, ' ').trim() : match[4];
  return text ? { done: match[2] !== ' ', text, due: due ? (due[1] ?? due[2]) : undefined } : null;
}

/** Each line of `raw` (a whole file) with whether it is body text outside code fences. */
function bodyLines(raw: string): Array<{ line: string; checkable: boolean }> {
  const lines = raw.split('\n');
  let frontmatterEnd = -1;
  if (FRONTMATTER_OPEN.test(lines[0] ?? '')) {
    frontmatterEnd = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
  }
  let fence: string | null = null;
  return lines.map((line, index) => {
    if (index <= frontmatterEnd) return { line, checkable: false };
    const marker = FENCE.exec(line)?.[1];
    if (marker && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence === null ? marker : null;
      return { line, checkable: false };
    }
    return { line, checkable: fence === null };
  });
}

/** Every checkbox line in a file's text; `line` is 1-based in the whole file. */
export function extractChecks(raw: string): CheckItem[] {
  const checks: CheckItem[] = [];
  bodyLines(raw).forEach(({ line, checkable }, index) => {
    const check = checkable ? parseCheck(line) : null;
    if (check) checks.push({ line: index + 1, text: check.text, done: check.done, ...(check.due ? { due: check.due } : {}) });
  });
  return checks;
}

/**
 * `raw` with the checkbox on `line` flipped and every other byte unchanged,
 * or null when that line is no longer the checkbox with `expectedText`.
 */
export function toggleCheckLine(raw: string, line: number, expectedText: string): string | null {
  const lines = bodyLines(raw);
  const target = lines[line - 1];
  const check = target?.checkable ? parseCheck(target.line) : null;
  if (!check || check.text !== expectedText) return null;
  const all = raw.split('\n');
  all[line - 1] = target.line.replace(/^(\s*(?:[-*+]|\d+[.)])\s+\[)[ xX]/, `$1${check.done ? ' ' : 'x'}`);
  return all.join('\n');
}

type CheckSource = Pick<ArtifactFields, 'title' | 'project'> & { filePath: string; checks?: CheckItem[] };

/** A checkbox line in a note, shaped to sit beside tasks in Today and on project pages. */
export interface CheckEntry {
  kind: 'check';
  path: string;
  line: number;
  text: string;
  due?: string;
  done: boolean;
  /** The note's project, when it has one. */
  project?: string;
  noteTitle: string;
}

export const isCheckEntry = (entry: object): entry is CheckEntry => (entry as { kind?: unknown }).kind === 'check';

/** Every checkbox line across `notes`, in file order. */
export function checkEntries(notes: readonly CheckSource[]): CheckEntry[] {
  return notes.flatMap((note) =>
    (note.checks ?? []).map((check) => ({
      kind: 'check' as const,
      path: note.filePath,
      line: check.line,
      text: check.text,
      due: check.due,
      done: check.done,
      project: note.project,
      noteTitle: note.title,
    })),
  );
}
