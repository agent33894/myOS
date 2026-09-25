import yaml from 'js-yaml';
import { basename, extname } from 'path';
import { isDeepStrictEqual } from 'util';
import type { Stats } from 'fs';
import { extractChecks } from '../../shared/checklist';
import { formatLocalDate } from '../../shared/date';
import { defaultStatusFor, domainFor, isArtifactType, isDomain, readFields, typeFromPath, writeFields } from '../../shared/spec';
import type { Artifact, ArtifactFields } from '../../shared/types';
import { DomainError } from '../errors';

const FRONTMATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export const revOf = (stats: Pick<Stats, 'mtimeMs' | 'size'>) => `${stats.mtimeMs}:${stats.size}`;

// Some Windows editors start files with a byte-order mark.
const withoutBom = (text: string) => text.replace(/^\uFEFF/, '');

function splitFrontmatter(raw: string, filePath: string): { data: Record<string, unknown>; body: string } {
  const text = withoutBom(raw);
  const match = FRONTMATTER.exec(text);
  if (!match) return { data: {}, body: text };
  let data: unknown;
  try {
    // CORE_SCHEMA keeps dates as the strings the user wrote.
    data = yaml.safeLoad(match[1] ?? '', { schema: yaml.CORE_SCHEMA }) ?? {};
  } catch (error) {
    throw new DomainError('INVALID', `${filePath} has unreadable frontmatter: ${(error as Error).message}`);
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new DomainError('INVALID', `${filePath} frontmatter is not a key/value map.`);
  }
  return { data: data as Record<string, unknown>, body: text.slice(match[0].length) };
}

function inferTitle(body: string, filePath: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return basename(filePath, extname(filePath))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const slugOf = (filePath: string) =>
  filePath.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type FileStats = Pick<Stats, 'mtimeMs' | 'size' | 'mtime' | 'birthtime'>;

/** Any Markdown file becomes an Artifact; missing frontmatter is inferred from the path and body. */
export function parseDocument(text: string, filePath: string, stats: FileStats): Artifact {
  const { data, body } = splitFrontmatter(text, filePath);
  const { fields, extra } = readFields(data);
  const known = fields as Partial<ArtifactFields>;
  const namedType = known.type?.toLowerCase();
  const type = isArtifactType(namedType) ? namedType : typeFromPath(filePath);
  // A type or domain myOS doesn't know (`type: book`) is written back as it was.
  if (known.type !== undefined && !isArtifactType(namedType)) extra.type = data.type;
  if (known.domain !== undefined && !isDomain(known.domain)) extra.domain = data.domain;
  const content = body.trim();
  const born = stats.birthtime.getTime() ? stats.birthtime : stats.mtime;
  const pathDomain = filePath.split('/')[0];
  // Checkbox lines in notes are tasks too; a task's own checklist and a template's are not.
  const checks = type === 'todo' || type === 'template' ? [] : extractChecks(text);

  return {
    ...known,
    id: known.id ?? slugOf(filePath),
    title: known.title ?? inferTitle(content, filePath),
    type,
    domain: isDomain(known.domain) ? known.domain : domainFor(type, isDomain(pathDomain) ? pathDomain : undefined),
    tags: known.tags ?? [],
    created: known.created ?? formatLocalDate(born),
    updated: known.updated ?? stats.mtime.toISOString(),
    status: known.status ?? defaultStatusFor(type),
    related: known.related ?? [],
    filePath,
    rev: revOf(stats),
    extra,
    content,
    ...(checks.length > 0 ? { checks } : {}),
  };
}

type Serializable = ArtifactFields & Pick<Artifact, 'extra'>;

const frontmatterBlock = (artifact: Serializable) => `---\n${yaml.safeDump(writeFields(artifact)).trim()}\n---\n`;

export function serializeDocument(artifact: Serializable & Pick<Artifact, 'content'>): string {
  const content = artifact.content.trim();
  return frontmatterBlock(artifact) + (content ? `${content}\n` : '');
}

type Fields = Record<string, unknown>;

const sameValue = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);

/** The keys whose written value differs between two versions of a file's fields. */
function changedKeys(before: Fields, after: Fields): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !sameValue(before[key], after[key]));
}

// A top-level key starts a line at column 0 (`key:`, `"key":`); list items, indented lines,
// comments, and blank lines after it belong to that key.
const KEY_LINE = /^(["']?)([^\s"'#:-][^:]*?|-[^\s:][^:]*?)\1[ \t]*:(?:[ \t]|$)/;

/**
 * Rewrite only the lines of the keys that changed, in the file's own style.
 * Returns null when the block is not plain enough to edit line by line.
 */
function editBlock(lines: string[], changed: string[], after: Fields): string[] | null {
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
      // Something myOS can't place (a flow mapping, a stray line).
      return null;
    }
  }
  // Blank lines and comments at the end of a span stay where they are.
  for (const span of spans.values()) {
    while (span.end > span.start + 1 && /^\s*(#.*)?$/.test(lines[span.end - 1])) span.end -= 1;
  }
  const dumped = (key: string) => (key in after ? yaml.safeDump({ [key]: after[key] }).trimEnd().split('\n') : []);
  const next = [...lines];
  const edits = changed.filter((key) => spans.has(key)).map((key) => ({ ...spans.get(key)!, key }));
  for (const edit of edits.sort((a, b) => b.start - a.start)) next.splice(edit.start, edit.end - edit.start, ...dumped(edit.key));
  for (const key of changed) if (!spans.has(key)) next.push(...dumped(key));
  return next;
}

function loadBlock(block: string): Fields | null {
  try {
    const data: unknown = yaml.safeLoad(block, { schema: yaml.CORE_SCHEMA }) ?? {};
    return typeof data === 'object' && !Array.isArray(data) ? (data as Fields) : null;
  } catch {
    return null;
  }
}

/**
 * The file with `after`'s frontmatter, changing as little text as possible.
 * Only the lines of keys whose value changed are rewritten (usually just
 * `updated:`), so key order, list style, quoting, and comments survive. A
 * plain Markdown file gains frontmatter only when a field other than
 * `updated` is set, and then only those keys. `body` replaces the text after
 * the block when given; the blank lines before it and the file's ending are kept.
 */
export function rewriteDocument(raw: string, before: Serializable, after: Serializable, body?: string): string {
  const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
  const text = withoutBom(raw);
  const match = FRONTMATTER.exec(text);
  const rest = match ? text.slice(match[0].length) : text;
  const fresh = writeFields(after);
  const changed = changedKeys(writeFields(before), fresh);

  let head = match?.[0] ?? '';
  if (match ? changed.length > 0 : changed.some((key) => key !== 'updated')) {
    const eol = match?.[0].includes('\r\n') ? '\r\n' : '\n';
    const inner = match?.[1] ?? '';
    const lines = inner === '' ? [] : inner.split(/\r?\n/);
    const edited = editBlock(lines, changed, fresh);
    // Keep the line edit only if it reads back as the old fields with exactly these changes.
    const expected = loadBlock(inner);
    for (const key of expected ? changed : []) {
      if (key in fresh) expected![key] = fresh[key];
      else delete expected![key];
    }
    const reread = edited && loadBlock(edited.join(eol));
    const faithful = reread && expected && isDeepStrictEqual(readFields(reread), readFields(expected));
    const closing = match ? match[0].slice(match[0].lastIndexOf('---')) : `---${eol}`;
    head = faithful ? `---${eol}${edited.map((line) => line + eol).join('')}${closing}` : frontmatterBlock(after);
  }
  if (body === undefined) return bom + head + rest;

  const content = body.trim();
  if (!content) return bom + head;
  const separator = head && !head.endsWith('\n') ? '\n' : '';
  const lead = rest.trim() ? (/^(?:[ \t]*\r?\n)*/.exec(rest)?.[0] ?? '').replace(/[ \t]+/g, '') : '';
  const tail = rest.trim() ? (/(?:\r?\n)*$/.exec(rest)?.[0] ?? '') : '\n';
  return bom + head + separator + lead + content + tail;
}
