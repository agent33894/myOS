import yaml from 'js-yaml';
import { basename, extname } from 'path';
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

/** New frontmatter over the file's body, byte for byte. */
export function replaceFrontmatter(text: string, artifact: Serializable): string {
  return frontmatterBlock(artifact) + withoutBom(text).replace(FRONTMATTER, '');
}
