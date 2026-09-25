import yaml from 'js-yaml';
import { isDeepStrictEqual } from 'util';
import type { Stats } from 'fs';
import { fileTask, extractTasks } from '../../shared/tasks';
import { noteTags, noteTitle, type Note, type Properties, type PropertiesPatch } from '../../shared/spec';

const FRONTMATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export const revOf = (stats: Pick<Stats, 'mtimeMs' | 'size'>) => `${stats.mtimeMs}:${stats.size}`;

// Some Windows editors start files with a byte-order mark.
const withoutBom = (text: string) => text.replace(/^\uFEFF/, '');

function loadBlock(block: string): Properties | null {
  try {
    // CORE_SCHEMA keeps dates as the strings the user wrote.
    const data: unknown = yaml.safeLoad(block, { schema: yaml.CORE_SCHEMA }) ?? {};
    return typeof data === 'object' && !Array.isArray(data) ? (data as Properties) : null;
  } catch {
    return null;
  }
}

/** Frontmatter and body. Frontmatter that is not a readable key/value map yields no properties and an error. */
export function splitFrontmatter(raw: string): { properties: Properties; error?: string; body: string } {
  const text = withoutBom(raw);
  const match = FRONTMATTER.exec(text);
  if (!match) return { properties: {}, body: text };
  const body = text.slice(match[0].length);
  const properties = loadBlock(match[1] ?? '');
  return properties ? { properties, body } : { properties: {}, error: 'The frontmatter could not be read.', body };
}

type FileStats = Pick<Stats, 'mtimeMs' | 'size' | 'mtime'>;

/** Any Markdown file as a Note: properties as written, title, tags, and task lines. */
export function parseDocument(raw: string, path: string, stats: FileStats): Note {
  const { properties, error, body } = splitFrontmatter(raw);
  const title = noteTitle(path, properties);
  const tags = noteTags(properties, body);
  const own = fileTask(path, title, properties, tags);
  return {
    path,
    rev: revOf(stats),
    title,
    properties,
    ...(error ? { propertiesError: error } : {}),
    tags,
    tasks: own ? [own] : extractTasks(raw, path),
    modified: stats.mtime.toISOString(),
    content: body.trim(),
  };
}

/** `properties` with `patch` applied: `null` removes a key, new keys go last, the rest keep their order. */
export function applyPatch(properties: Properties, patch: PropertiesPatch): Properties {
  const next = { ...properties };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}

// CORE_SCHEMA writes dates unquoted (`due: 2026-10-01`), as people and Obsidian write them.
const dump = (value: Properties) => yaml.safeDump(value, { schema: yaml.CORE_SCHEMA });

const frontmatterBlock = (properties: Properties) => `---\n${dump(properties).trim()}\n---\n`;

// A top-level key starts a line at column 0 (`key:`, `"key":`); list items, indented lines,
// comments, and blank lines after it belong to that key.
const KEY_LINE = /^(["']?)([^\s"'#:-][^:]*?|-[^\s:][^:]*?)\1[ \t]*:(?:[ \t]|$)/;

type Scalar = string | number | boolean;
const isScalar = (value: unknown): value is Scalar => ['string', 'number', 'boolean'].includes(typeof value);
const scalarList = (value: unknown): value is Scalar[] => Array.isArray(value) && value.every(isScalar);

/** The line with a trailing ` # comment` split off, when removing it doesn't change what the line means. */
function trailingComment(line: string): { code: string; comment: string } | null {
  const match = /^(.*?\S)([ \t]+#.*)$/.exec(line);
  if (!match) return null;
  const whole = loadBlock(line);
  return whole && isDeepStrictEqual(whole, loadBlock(match[1])) ? { code: match[1], comment: match[2] } : null;
}

/**
 * A block list (`key:` then `- item` lines) edited item by item: items that
 * stay keep their line, with any comment on or between them; removed items
 * lose only their line; new items go after the item before them.
 */
function editList(span: string[], key: string, before: Scalar[], after: Scalar[]): string[] | null {
  if (after.length === 0 || !/^[^#]*:[ \t]*(#.*)?$/.test(span[0])) return null;
  const items: { index: number; value: Scalar }[] = [];
  for (const [index, line] of span.entries()) {
    if (index === 0 || /^\s*(#.*)?$/.test(line)) continue;
    const item = /^(\s*)-[ \t]/.exec(line) ? (yaml.safeLoad(line, { schema: yaml.CORE_SCHEMA }) as unknown) : null;
    if (!Array.isArray(item) || item.length !== 1 || !isScalar(item[0])) return null;
    items.push({ index, value: item[0] });
  }
  if (!isDeepStrictEqual(items.map((item) => item.value), before) || items.length === 0) return null;
  const indent = /^(\s*-[ \t]+)/.exec(span[items[0].index])![1];
  const lineFor = (value: Scalar) => indent + dump({ [key]: [value] }).trimEnd().split('\n')[1].replace(/^\s*-[ \t]+/, '');

  // Match each new value to the next unused old item with the same value, in order.
  const kept = new Set<number>();
  const inserts = new Map<number, string[]>();
  let cursor = 0;
  let anchor = items[0].index - 1;
  for (const value of after) {
    const found = items.findIndex((item, at) => at >= cursor && item.value === value);
    if (found >= 0) {
      kept.add(items[found].index);
      anchor = items[found].index;
      cursor = found + 1;
    } else {
      inserts.set(anchor, [...(inserts.get(anchor) ?? []), lineFor(value)]);
    }
  }
  const removed = new Set(items.filter((item) => !kept.has(item.index)).map((item) => item.index));
  const next: string[] = [];
  for (const [index, line] of span.entries()) {
    if (!removed.has(index)) next.push(line);
    next.push(...(inserts.get(index) ?? []));
  }
  return next;
}

/** The new lines for one key: item by item for block lists, else the value rewritten with its trailing comment kept. */
function editSpan(span: string[], key: string, before: unknown, after: Properties): string[] {
  if (!(key in after)) return [];
  const value = after[key];
  if (scalarList(before) && scalarList(value)) {
    const listed = editList(span, key, before, value);
    if (listed) return listed;
  }
  const flow = /^[^:]*:[ \t]*\[/.test(span[0]) && Array.isArray(value);
  const dumped = flow
    ? [`${span[0].slice(0, span[0].indexOf(':') + 1)} ${yaml.safeDump(value, { schema: yaml.CORE_SCHEMA, flowLevel: 0 }).trim()}`]
    : dump({ [key]: value }).trimEnd().split('\n');
  const comment = span.length === 1 ? trailingComment(span[0])?.comment : undefined;
  if (comment && dumped.length === 1) dumped[0] += comment;
  // Comment lines inside a rewritten value stay, after it.
  return [...dumped, ...span.slice(1).filter((line) => /^\s*#/.test(line))];
}

/**
 * Rewrite only the lines of the keys that changed, in the file's own style.
 * Returns null when the block is not plain enough to edit line by line.
 */
function editBlock(lines: string[], changed: string[], before: Properties, after: Properties): string[] | null {
  const spans = new Map<string, { start: number; end: number }>();
  let open: { start: number; end: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const key = KEY_LINE.exec(line)?.[2];
    if (key !== undefined) {
      if (spans.has(key)) return null;
      open = { start: index, end: index + 1 };
      spans.set(key, open);
    } else if (open && (line.trim() === '' || /^[\s#-]/.test(line))) {
      open.end = index + 1;
    } else if (line.trim() !== '' && !line.startsWith('#')) {
      // Something that can't be placed (a flow mapping, a stray line).
      return null;
    }
  }
  // Blank lines and comments at the end of a span stay where they are.
  for (const span of spans.values()) {
    while (span.end > span.start + 1 && /^\s*(#.*)?$/.test(lines[span.end - 1])) span.end -= 1;
  }
  const next = [...lines];
  const edits = changed.filter((key) => spans.has(key)).map((key) => ({ ...spans.get(key)!, key }));
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next.splice(edit.start, edit.end - edit.start, ...editSpan(lines.slice(edit.start, edit.end), edit.key, before[edit.key], after));
  }
  for (const key of changed) if (!spans.has(key) && key in after) next.push(...dump({ [key]: after[key] }).trimEnd().split('\n'));
  return next;
}

/**
 * The file with `after` as its properties, changing as little text as
 * possible: only the lines of keys whose value changed are rewritten, so key
 * order, list style, quoting, and comments survive. A file without
 * frontmatter gains a block only when a property is set. `body` replaces the
 * text after the block when given; the blank lines before it and the file's
 * ending are kept.
 */
export function rewriteDocument(raw: string, before: Properties, after: Properties, body?: string): string {
  const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
  const text = withoutBom(raw);
  const match = FRONTMATTER.exec(text);
  const rest = match ? text.slice(match[0].length) : text;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [...keys].filter((key) => !isDeepStrictEqual(before[key], after[key]));

  let head = match?.[0] ?? '';
  if (changed.length > 0) {
    const eol = match?.[0].includes('\r\n') ? '\r\n' : '\n';
    const inner = match?.[1] ?? '';
    const lines = inner === '' ? [] : inner.split(/\r?\n/);
    const edited = editBlock(lines, changed, before, after);
    // Keep the line edit only if it reads back as exactly the new properties.
    const reread = edited && loadBlock(edited.join(eol));
    const closing = match ? match[0].slice(match[0].lastIndexOf('---')) : `---${eol}`;
    const faithful = reread && isDeepStrictEqual(reread, after);
    head = Object.keys(after).length === 0 ? '' : faithful ? `---${eol}${edited.map((line) => line + eol).join('')}${closing}` : frontmatterBlock(after);
  }
  if (body === undefined) return bom + head + rest;

  const content = body.trim();
  if (!content) return bom + head;
  const separator = head && !head.endsWith('\n') ? '\n' : '';
  const lead = rest.trim() ? (/^(?:[ \t]*\r?\n)*/.exec(rest)?.[0] ?? '').replace(/[ \t]+/g, '') : '';
  const tail = rest.trim() ? (/(?:\r?\n)*$/.exec(rest)?.[0] ?? '') : '\n';
  return bom + head + separator + lead + content + tail;
}
