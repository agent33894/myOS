import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { dirname, posix } from 'path';
import { toggleCheckLine } from '../../shared/checklist';
import { formatLocalDate } from '../../shared/date';
import type { ArtifactRetype, ArtifactSave, VersionInfo } from '../../shared/ipc/contracts';
import {
  ARTIFACT_TYPES,
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
import { listVersions, moveHistory, readVersion, snapshotBeforeWrite } from '../history/history';
import { resolveInWorkspace, scanMarkdown, toWorkspacePath } from '../workspace/paths';
import { parseDocument, replaceFrontmatter, revOf, serializeDocument } from './markdown';

/** Documents are Markdown files outside dot-folders; nothing here may touch `.git/` or other files. */
function resolveDocument(path: string): string {
  if (!/\.md$/i.test(path) || /(^|[\\/])(\.|node_modules[\\/])/.test(path)) {
    throw new DomainError('INVALID', `${path} is not a workspace Markdown file.`);
  }
  return resolveInWorkspace(path);
}

async function load(path: string): Promise<{ absolute: string; artifact: Artifact; raw: string }> {
  const absolute = resolveDocument(path);
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
  const absolute = resolveDocument(path);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    await writeFile(absolute, text, { encoding: 'utf-8', flag });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new DomainError('CONFLICT', `${path} already exists.`);
    throw error;
  }
  return parseDocument(text, toWorkspacePath(absolute), await stat(absolute));
}

type Loaded = Awaited<ReturnType<typeof load>>;

/** Write `text` at `to` (which must not exist), then remove the original; its history follows. */
async function relocate({ absolute, artifact }: Loaded, to: string, text: string): Promise<Artifact> {
  const moved = await write(to, text, 'wx');
  try {
    await unlink(absolute);
  } catch (error) {
    await unlink(resolveDocument(moved.filePath));
    throw error;
  }
  await moveHistory(artifact.filePath, moved.filePath);
  return moved;
}

/** Keep the file as it is now in version history before a change that replaces or moves it. */
const keepVersion = ({ artifact, raw }: Loaded) => snapshotBeforeWrite(artifact.filePath, raw);

const IMMUTABLE = new Set(['id', 'type', 'created', 'updated']);
const REQUIRED = new Set(['title', 'tags', 'status', 'related']);

function applyPatch(artifact: Artifact, patch: ArtifactPatch): Artifact {
  const next: Artifact = { ...artifact, extra: { ...artifact.extra }, updated: new Date().toISOString() };
  delete next.extra.updated;
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
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50).replace(/-$/, '') || 'untitled';

const ID = /^[a-z0-9][a-z0-9-]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * New files start with an empty body. The area comes from the item's project,
 * then the draft's `domain` (the user's default area), then the type's default.
 */
export async function createArtifact(draft: ArtifactDraft): Promise<Artifact> {
  const { type, content = '', domain, id: requestedId, ...patch } = draft;
  if (!isArtifactType(type)) throw new DomainError('INVALID', `Unknown type ${String(type)}.`);
  const title = patch.title?.trim() || 'Untitled';
  const journal = type === 'journal';
  const id = requestedId ?? (journal ? formatLocalDate() : `${slugify(title)}-${Date.now().toString(36)}`);
  if (!ID.test(id) || (journal && !DATE.test(id))) throw new DomainError('INVALID', `${id} cannot name a ${type}.`);
  const resolvedDomain = domainFor(type, (await projectDomain(patch.project)) ?? domain);
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
  const loaded = await load(path);
  const { artifact } = loaded;
  assertRev(artifact, expectRev);
  // Saves arrive every second while typing; history keeps one per ten minutes, and never blocks a save.
  await snapshotBeforeWrite(artifact.filePath, loaded.raw, { throttle: true }).catch((error: unknown) =>
    console.warn(`Could not keep a version of ${artifact.filePath}:`, (error as Error).message),
  );
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
  const loaded = await load(path);
  const { artifact, raw } = loaded;
  assertRev(artifact, expectRev);
  const nextDomain = domainFor(type, artifact.domain ?? (await projectDomain(patch.project ?? artifact.project)) ?? domain);
  const { type: _type, domain: _domain, status: _status, ...extra } = artifact.extra;
  const next = applyPatch(
    {
      ...artifact,
      extra,
      type,
      domain: nextDomain,
      status: isStatusAllowed(type, artifact.status) ? artifact.status : defaultStatusFor(type),
      filePath: canonicalPath(artifact.id, type, nextDomain),
    },
    patch,
  );
  await keepVersion(loaded);
  const text = replaceFrontmatter(raw, next);
  return next.filePath === artifact.filePath ? write(next.filePath, text, 'w') : relocate(loaded, next.filePath, text);
}

/** Flip the checkbox on `line` and nothing else, provided that line still reads `expectedText`. */
export async function toggleCheck(path: string, line: number, expectedText: string, expectRev?: string): Promise<Artifact> {
  const { artifact, raw } = await load(path);
  assertRev(artifact, expectRev);
  const text = toggleCheckLine(raw, line, expectedText);
  if (text === null) throw new DomainError('CONFLICT', `“${expectedText}” changed in “${artifact.title}”.`);
  return write(artifact.filePath, text, 'w');
}

const fileName = (path: string) => posix.basename(path, '.md');

async function exists(path: string): Promise<boolean> {
  return stat(resolveDocument(path)).then(
    () => true,
    (error: unknown) => {
      if (isMissingFile(error)) return false;
      throw error;
    },
  );
}

/** Name the file after its title: `<slug>.md` in the same folder, `<slug>-2.md` and on when taken. */
export async function renameArtifact(path: string, expectRev?: string): Promise<Artifact> {
  const loaded = await load(path);
  const { artifact, raw } = loaded;
  assertRev(artifact, expectRev);
  const slug = slugify(artifact.title);
  const current = fileName(artifact.filePath);
  if (artifact.type === 'journal' || current === slug || new RegExp(`^${slug}-\\d+$`).test(current)) return artifact;
  const folder = posix.dirname(artifact.filePath);
  const at = (name: string) => (folder === '.' ? `${name}.md` : `${folder}/${name}.md`);
  let target = at(slug);
  for (let suffix = 2; await exists(target); suffix += 1) target = at(`${slug}-${suffix}`);
  await keepVersion(loaded);
  return relocate(loaded, target, raw);
}

/** Move the file, bytes unchanged, to `to`; refuses to replace a file already there. */
export async function moveArtifact(path: string, to: string, expectRev?: string): Promise<Artifact> {
  const loaded = await load(path);
  assertRev(loaded.artifact, expectRev);
  const target = toWorkspacePath(resolveDocument(to));
  return target === loaded.artifact.filePath ? loaded.artifact : relocate(loaded, target, loaded.raw);
}

/** Set the area and move the file into that area's folder for its type, keeping its name. */
export async function moveToArea(path: string, domain: Domain, expectRev?: string): Promise<Artifact> {
  if (!isDomain(domain)) throw new DomainError('INVALID', `Unknown area ${String(domain)}.`);
  const loaded = await load(path);
  const { artifact, raw } = loaded;
  assertRev(artifact, expectRev);
  if (ARTIFACT_TYPES[artifact.type].domain === null) throw new DomainError('INVALID', `A ${artifact.type} has no area.`);
  const folder = posix.dirname(canonicalPath(artifact.id, artifact.type, domain));
  const target = `${folder}/${posix.basename(artifact.filePath)}`;
  const text = replaceFrontmatter(raw, applyPatch(artifact, { domain }));
  await keepVersion(loaded);
  return target === artifact.filePath ? write(target, text, 'w') : relocate(loaded, target, text);
}

// ---- Version history ---------------------------------------------------------

export const listHistory = (path: string): Promise<VersionInfo[]> => listVersions(toWorkspacePath(resolveDocument(path)));

export const readHistory = (path: string, id: string): Promise<string> => readVersion(toWorkspacePath(resolveDocument(path)), id);

/** Write a saved version back as the file; the text it replaces becomes the newest version. */
export async function restoreVersion(path: string, id: string, expectRev?: string): Promise<Artifact> {
  const loaded = await load(path);
  assertRev(loaded.artifact, expectRev);
  const text = await readVersion(loaded.artifact.filePath, id);
  await keepVersion(loaded);
  return write(loaded.artifact.filePath, text, 'w');
}

// Undo restores the exact bytes of recently deleted files, not a re-serialization.
const deletedText = new Map<string, string>();
const deletedKey = (artifact: Pick<Artifact, 'filePath' | 'rev'>) => `${artifact.filePath}\n${artifact.rev}`;

/** Remove the file and return a full snapshot for undo. */
export async function deleteArtifact(path: string, expectRev?: string): Promise<Artifact> {
  const loaded = await load(path);
  const { absolute, artifact, raw } = loaded;
  assertRev(artifact, expectRev);
  await keepVersion(loaded);
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
