import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { formatLocalDate } from '../../shared/date';
import type { ArtifactRetype, ArtifactSave } from '../../shared/ipc/contracts';
import {
  canonicalPath,
  defaultStatusFor,
  domainFor,
  isArtifactType,
  isDomain,
  isFieldName,
  isStatusAllowed,
  normalizeField,
} from '../../shared/spec';
import type { Artifact, ArtifactDraft, ArtifactPatch, ArtifactSummary, Domain } from '../../shared/types';
import { DomainError, isMissingFile } from '../errors';
import { resolveInWorkspace, scanMarkdown, toWorkspacePath } from '../workspace/paths';
import { parseDocument, replaceFrontmatter, revOf, serializeDocument } from './markdown';

async function load(path: string): Promise<{ absolute: string; artifact: Artifact; raw: string }> {
  const absolute = resolveInWorkspace(path);
  try {
    const [raw, stats] = await Promise.all([readFile(absolute, 'utf-8'), stat(absolute)]);
    return { absolute, artifact: parseDocument(raw, toWorkspacePath(absolute), stats), raw };
  } catch (error) {
    if (isMissingFile(error)) throw new DomainError('NOT_FOUND', `${path} no longer exists.`);
    throw error;
  }
}

function assertRev(artifact: Artifact, expectRev?: string) {
  if (expectRev !== undefined && artifact.rev !== expectRev) {
    throw new DomainError('CONFLICT', `“${artifact.title}” changed on disk.`);
  }
}

/** Write `text` and return what a fresh read would see. `wx` refuses to replace an existing file. */
async function write(path: string, text: string, flag: 'w' | 'wx'): Promise<Artifact> {
  const absolute = resolveInWorkspace(path);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    await writeFile(absolute, text, { encoding: 'utf-8', flag });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new DomainError('CONFLICT', `${path} already exists.`);
    throw error;
  }
  return parseDocument(text, toWorkspacePath(absolute), await stat(absolute));
}

const IMMUTABLE = new Set(['id', 'type', 'created', 'updated']);
const REQUIRED = new Set(['title', 'tags', 'status', 'related']);

function applyPatch(artifact: Artifact, patch: ArtifactPatch): Artifact {
  const next: Artifact = { ...artifact, extra: { ...artifact.extra }, updated: new Date().toISOString() };
  const fields = next as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (!isFieldName(key) || IMMUTABLE.has(key)) throw new DomainError('INVALID', `${key} cannot be changed here.`);
    // A patched key replaces any original value that failed to parse.
    delete next.extra[key];
    if (value === null || value === undefined) {
      if (REQUIRED.has(key)) throw new DomainError('INVALID', `${key} is required.`);
      delete fields[key];
      continue;
    }
    const normalized = normalizeField(key, value);
    if (normalized === undefined) throw new DomainError('INVALID', `${key} has an invalid value.`);
    fields[key] = normalized;
  }
  if (next.domain !== undefined && !isDomain(next.domain)) throw new DomainError('INVALID', `Unknown domain ${next.domain}.`);
  if (patch.status && !isStatusAllowed(next.type, next.status)) {
    throw new DomainError('INVALID', `A ${next.type} cannot be ${next.status}.`);
  }
  return next;
}

// ---- Listing ---------------------------------------------------------------

const SEARCH_TEXT_LIMIT = 60_000;
const listCache = new Map<string, ArtifactSummary>();

function summarize({ content, ...summary }: Artifact): ArtifactSummary {
  const half = SEARCH_TEXT_LIMIT / 2;
  const searchText = content.length <= SEARCH_TEXT_LIMIT ? content : `${content.slice(0, half)}\n${content.slice(-half)}`;
  return { ...summary, searchText };
}

/** Metadata and search text for every Markdown file; unchanged files come from a cache keyed by rev. */
export async function listArtifacts(): Promise<ArtifactSummary[]> {
  const files = await scanMarkdown();
  const summaries = await Promise.all(
    files.map(async (absolute) => {
      try {
        const cached = listCache.get(absolute);
        const stats = await stat(absolute);
        if (cached?.rev === revOf(stats)) return cached;
        const summary = summarize(parseDocument(await readFile(absolute, 'utf-8'), toWorkspacePath(absolute), stats));
        listCache.set(absolute, summary);
        return summary;
      } catch (error) {
        console.warn(`Skipping ${absolute}:`, (error as Error).message);
        return null;
      }
    }),
  );
  const live = new Set(files);
  for (const path of listCache.keys()) if (!live.has(path)) listCache.delete(path);
  return summaries.filter((summary): summary is ArtifactSummary => summary !== null);
}

async function projectDomain(ref: string | null | undefined): Promise<Domain | undefined> {
  if (!ref) return undefined;
  const project = (await listArtifacts()).find(
    (artifact) => artifact.type === 'project' && (artifact.id === ref || artifact.title === ref),
  );
  return project?.domain;
}

// ---- Operations --------------------------------------------------------------

export async function readArtifact(path: string): Promise<Artifact> {
  return (await load(path)).artifact;
}

const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'untitled';

/** New files start with an empty body; a task filed under a project inherits its domain. */
export async function createArtifact(draft: ArtifactDraft): Promise<Artifact> {
  const { type, content = '', domain, ...patch } = draft;
  if (!isArtifactType(type)) throw new DomainError('INVALID', `Unknown type ${String(type)}.`);
  const title = patch.title?.trim() || 'Untitled';
  const id = `${slugify(title)}-${Date.now().toString(36)}`;
  const resolvedDomain = domainFor(type, domain ?? (await projectDomain(patch.project)));
  const now = new Date();
  const base: Artifact = {
    id,
    title,
    type,
    tags: [],
    created: formatLocalDate(now),
    updated: now.toISOString(),
    status: defaultStatusFor(type),
    related: [],
    domain: resolvedDomain,
    filePath: canonicalPath(id, type, resolvedDomain),
    rev: '',
    extra: {},
    content,
  };
  const artifact = applyPatch(base, { ...patch, title });
  return write(artifact.filePath, serializeDocument(artifact), 'wx');
}

export async function saveArtifact(path: string, { fields, content }: ArtifactSave, expectRev: string): Promise<Artifact> {
  const { artifact } = await load(path);
  assertRev(artifact, expectRev);
  return write(artifact.filePath, serializeDocument({ ...applyPatch(artifact, fields), content }), 'w');
}

/** Frontmatter-only update; the body is written back exactly as it is on disk. */
export async function patchArtifact(path: string, fields: ArtifactPatch, expectRev?: string): Promise<Artifact> {
  const { artifact, raw } = await load(path);
  assertRev(artifact, expectRev);
  return write(artifact.filePath, replaceFrontmatter(raw, applyPatch(artifact, fields)), 'w');
}

/** Change type and move to that type's canonical path; the original is removed only after the copy lands. */
export async function retypeArtifact(path: string, change: ArtifactRetype, expectRev?: string): Promise<Artifact> {
  const { type, domain, ...patch } = change;
  if (!isArtifactType(type)) throw new DomainError('INVALID', `Unknown type ${String(type)}.`);
  const { absolute, artifact, raw } = await load(path);
  assertRev(artifact, expectRev);
  const nextDomain = domainFor(type, domain ?? artifact.domain ?? (await projectDomain(patch.project ?? artifact.project)));
  const next = applyPatch(
    {
      ...artifact,
      type,
      domain: nextDomain,
      status: isStatusAllowed(type, artifact.status) ? artifact.status : defaultStatusFor(type),
      filePath: canonicalPath(artifact.id, type, nextDomain),
    },
    patch,
  );
  const text = replaceFrontmatter(raw, next);
  if (next.filePath === artifact.filePath) return write(next.filePath, text, 'w');

  const moved = await write(next.filePath, text, 'wx');
  try {
    await unlink(absolute);
  } catch (error) {
    await unlink(resolveInWorkspace(moved.filePath));
    throw error;
  }
  return moved;
}

// Undo restores the exact bytes of recently deleted files, not a re-serialization.
const deletedText = new Map<string, string>();
const deletedKey = (artifact: Pick<Artifact, 'filePath' | 'rev'>) => `${artifact.filePath}\n${artifact.rev}`;

/** Remove the file and return a full snapshot for undo. */
export async function deleteArtifact(path: string, expectRev?: string): Promise<Artifact> {
  const { absolute, artifact, raw } = await load(path);
  assertRev(artifact, expectRev);
  await unlink(absolute);
  deletedText.set(deletedKey(artifact), raw);
  if (deletedText.size > 50) deletedText.delete(deletedText.keys().next().value!);
  return artifact;
}

/** Write a deleted snapshot back to its own path; refuses to replace a file that has appeared since. */
export async function restoreArtifact(snapshot: Artifact): Promise<Artifact> {
  const raw = deletedText.get(deletedKey(snapshot));
  const restored = await write(snapshot.filePath, raw ?? serializeDocument(snapshot), 'wx');
  deletedText.delete(deletedKey(snapshot));
  return restored;
}
