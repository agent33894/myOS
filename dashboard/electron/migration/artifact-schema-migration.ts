import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import {
  type ArtifactDraftInput,
  type ArtifactTypeValue,
  type DomainValue,
  getAllowedStatusesForType,
  normalizeDraftFromSpec,
} from '../../shared/spec/index.ts';
import { ArtifactType, Domain } from '../../shared/types/enums.ts';

const execFileAsync = promisify(execFile);
const REPORT_VERSION = 1;
const SNAPSHOT_VERSION = 1;
const MANIFEST_FILE = 'artifact-migration-snapshot.json';

type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};

interface FrontmatterValue {
  present: boolean;
  value?: JsonValue;
}

interface FrontmatterChange {
  field: string;
  before: FrontmatterValue;
  after: FrontmatterValue;
}

interface ArtifactMigrationReportItem {
  id: string;
  action: 'move' | 'rewrite' | 'move-and-rewrite';
  path: {
    before: string;
    after: string;
  };
  frontmatterChanges: FrontmatterChange[];
  sourceSha256: string;
  resultSha256: string;
  warnings: string[];
}

interface DestinationCollision {
  destination: string;
  sources: string[];
  reason: 'multiple-sources' | 'existing-file';
}

interface DuplicateIdIssue {
  id: string;
  paths: string[];
}

interface ParseIssue {
  path: string;
  error: string;
}

interface ArtifactMigrationReport {
  formatVersion: number;
  mode: 'report-only';
  planHash: string;
  cleanPreflight: boolean;
  counts: {
    markdownFiles: number;
    auditedArtifacts: number;
    touchedArtifacts: number;
    movedArtifacts: number;
    frontmatterUpdates: number;
  };
  artifacts: ArtifactMigrationReportItem[];
  issues: {
    destinationCollisions: DestinationCollision[];
    duplicateIds: DuplicateIdIssue[];
    parseErrors: ParseIssue[];
  };
}

interface MigrationOperation {
  reportItem: ArtifactMigrationReportItem;
  beforeRaw: string;
  afterRaw: string;
}

interface ArtifactMigrationAnalysis {
  report: ArtifactMigrationReport;
  operations: readonly MigrationOperation[];
}

interface SnapshotEntry {
  sourcePath: string;
  destinationPath: string;
  sourceSha256: string;
  resultSha256: string;
  size: number;
  backupPath: string;
}

interface ArtifactMigrationSnapshotManifest {
  formatVersion: number;
  migrationPlanHash: string;
  vaultRoot: string;
  entries: SnapshotEntry[];
  restorationGuidance: string[];
}

interface ApplyMigrationOptions {
  recoverOnFailure?: boolean;
  onArtifactCommitted?: (item: ArtifactMigrationReportItem, index: number) => void | Promise<void>;
}

const KNOWN_ARTIFACT_TYPES = new Set<string>(Object.values(ArtifactType));
const KNOWN_DOMAINS = new Set<string>(Object.values(Domain));
const LEGACY_STATUS_MAP: Readonly<Record<string, string>> = Object.freeze({
  published: 'active',
  completed: 'done',
  complete: 'done',
});

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stablePathKey(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('en-US');
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function assertSafeRelativePath(relativePath: string): void {
  if (
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    relativePath.includes('/../')
  ) {
    throw new Error(`Unsafe migration path: "${relativePath}"`);
  }
}

function resolveWithin(root: string, relativePath: string): string {
  assertSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path escapes migration root: "${relativePath}"`);
  }
  return resolvedPath;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asOptionalDateString(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return asOptionalString(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function normalizeLegacyStatus(
  type: ArtifactTypeValue,
  rawStatus: unknown,
): string | undefined {
  const status = asOptionalString(rawStatus)?.toLowerCase();
  if (!status) return undefined;

  const mapped = LEGACY_STATUS_MAP[status] || status;
  const allowedStatuses = getAllowedStatusesForType(type as ArtifactType);
  if (allowedStatuses.includes(mapped as never)) return mapped;
  if (mapped === 'done' && allowedStatuses.includes('active' as never)) return 'active';
  if (allowedStatuses.includes('active' as never)) return 'active';
  return allowedStatuses[0] || mapped;
}

function buildDraftFromFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string,
): ArtifactDraftInput | null {
  const rawType = asOptionalString(frontmatter.type)?.toLowerCase();
  const type = rawType as ArtifactTypeValue | undefined;
  if (!type || !KNOWN_ARTIFACT_TYPES.has(type)) return null;

  const rawDomain = asOptionalString(frontmatter.domain);
  const domain = rawDomain && KNOWN_DOMAINS.has(rawDomain)
    ? rawDomain as DomainValue
    : undefined;
  const normalizedContent = content.trim();

  return {
    id: asOptionalString(frontmatter.id),
    title: asOptionalString(frontmatter.title),
    type,
    domain,
    tags: asStringArray(frontmatter.tags),
    project: asOptionalString(frontmatter.project),
    created: asOptionalDateString(frontmatter.created),
    updated: asOptionalDateString(frontmatter.updated),
    status: normalizeLegacyStatus(type, frontmatter.status),
    related: asStringArray(frontmatter.related),
    content: normalizedContent.length > 0 ? content : undefined,
    priority: asOptionalString(frontmatter.priority),
    due: asOptionalDateString(frontmatter.due),
    parentId: asOptionalString(frontmatter.parentId),
    deferDate: asOptionalDateString(frontmatter.deferDate),
    estimatedMinutes: typeof frontmatter.estimatedMinutes === 'number'
      ? frontmatter.estimatedMinutes
      : undefined,
    sequential: typeof frontmatter.sequential === 'boolean'
      ? frontmatter.sequential
      : undefined,
    flagged: typeof frontmatter.flagged === 'boolean' ? frontmatter.flagged : undefined,
    completedDate: asOptionalDateString(frontmatter.completedDate),
    repeatRule: asOptionalString(frontmatter.repeatRule),
    localPath: asOptionalString(frontmatter.localPath),
    repoUrl: asOptionalString(frontmatter.repoUrl),
    isExternalProject: typeof frontmatter.isExternalProject === 'boolean'
      ? frontmatter.isExternalProject
      : undefined,
    language: asOptionalString(frontmatter.language),
    analysisData: frontmatter.analysisData,
    sources: asStringArray(frontmatter.sources),
    order: typeof frontmatter.order === 'number' ? frontmatter.order : undefined,
  };
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }
  return String(value);
}

function frontmatterValue(
  frontmatter: Record<string, unknown>,
  field: string,
): FrontmatterValue {
  if (!Object.prototype.hasOwnProperty.call(frontmatter, field)) return { present: false };
  return { present: true, value: toJsonValue(frontmatter[field]) };
}

async function collectMarkdownFiles(rootPath: string): Promise<string[]> {
  const stack = [rootPath];
  const results: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'assets') stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((left, right) => toPosixPath(left).localeCompare(toPosixPath(right)));
}

function reportHashPayload(report: Omit<ArtifactMigrationReport, 'planHash'>): string {
  return JSON.stringify({
    formatVersion: report.formatVersion,
    counts: report.counts,
    artifacts: report.artifacts,
    issues: report.issues,
  });
}

export async function analyzeArtifactMigration(
  vaultRootInput: string,
): Promise<ArtifactMigrationAnalysis> {
  const vaultRoot = path.resolve(vaultRootInput);
  const markdownFiles = await collectMarkdownFiles(vaultRoot);
  const operations: MigrationOperation[] = [];
  const parseErrors: ParseIssue[] = [];
  const ids = new Map<string, { id: string; paths: string[] }>();
  const existingPaths = new Map<string, string>();
  let auditedArtifacts = 0;

  for (const absolutePath of markdownFiles) {
    const relativePath = toPosixPath(path.relative(vaultRoot, absolutePath));
    existingPaths.set(stablePathKey(relativePath), relativePath);
    const raw = await readFile(absolutePath, 'utf8');
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (error) {
      parseErrors.push({
        path: relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const frontmatter = parsed.data as Record<string, unknown>;
    const draft = buildDraftFromFrontmatter(frontmatter, parsed.content);
    if (!draft) continue;
    auditedArtifacts += 1;

    const existingUpdated = asOptionalDateString(frontmatter.updated);
    const existingCreated = asOptionalDateString(frontmatter.created);
    let normalized: ReturnType<typeof normalizeDraftFromSpec>;
    try {
      normalized = normalizeDraftFromSpec(draft, {
        now: existingUpdated || existingCreated || '1970-01-01',
        strictStatus: true,
        generateId: (title = 'artifact') => title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'artifact',
      });
    } catch (error) {
      parseErrors.push({
        path: relativePath,
        error: `Normalization failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    const idKey = stablePathKey(normalized.artifact.id);
    const idEntry = ids.get(idKey) || { id: normalized.artifact.id, paths: [] };
    idEntry.paths.push(relativePath);
    ids.set(idKey, idEntry);

    const nextFrontmatter = { ...frontmatter };
    const normalizedDomain = normalized.artifact.domain;
    const existingDomain = asOptionalString(frontmatter.domain);
    const frontmatterChanges: FrontmatterChange[] = [];
    if (typeof normalizedDomain === 'string' && existingDomain !== normalizedDomain) {
      nextFrontmatter.domain = normalizedDomain;
      frontmatterChanges.push({
        field: 'domain',
        before: frontmatterValue(frontmatter, 'domain'),
        after: frontmatterValue(nextFrontmatter, 'domain'),
      });
    } else if (
      typeof normalizedDomain !== 'string' &&
      Object.prototype.hasOwnProperty.call(frontmatter, 'domain')
    ) {
      delete nextFrontmatter.domain;
      frontmatterChanges.push({
        field: 'domain',
        before: frontmatterValue(frontmatter, 'domain'),
        after: frontmatterValue(nextFrontmatter, 'domain'),
      });
    }

    const destinationPath = normalized.artifact.filePath;
    assertSafeRelativePath(destinationPath);
    const moving = relativePath !== destinationPath;
    const rewriting = frontmatterChanges.length > 0;
    if (!moving && !rewriting) continue;

    const afterRaw = rewriting
      ? matter.stringify(parsed.content, nextFrontmatter)
      : raw;
    operations.push({
      beforeRaw: raw,
      afterRaw,
      reportItem: {
        id: normalized.artifact.id,
        action: moving && rewriting ? 'move-and-rewrite' : moving ? 'move' : 'rewrite',
        path: { before: relativePath, after: destinationPath },
        frontmatterChanges,
        sourceSha256: sha256(raw),
        resultSha256: sha256(afterRaw),
        warnings: [...normalized.warnings].sort(),
      },
    });
  }

  operations.sort((left, right) => left.reportItem.path.before.localeCompare(right.reportItem.path.before));
  const movingSourceKeys = new Set(
    operations
      .filter(({ reportItem }) => reportItem.path.before !== reportItem.path.after)
      .map(({ reportItem }) => stablePathKey(reportItem.path.before)),
  );
  const targetOwners = new Map<string, { destination: string; sources: string[] }>();
  for (const { reportItem } of operations) {
    if (reportItem.path.before === reportItem.path.after) continue;
    const key = stablePathKey(reportItem.path.after);
    const owner = targetOwners.get(key) || { destination: reportItem.path.after, sources: [] };
    owner.sources.push(reportItem.path.before);
    targetOwners.set(key, owner);
  }

  const destinationCollisions: DestinationCollision[] = [];
  for (const [targetKey, owner] of targetOwners) {
    owner.sources.sort();
    if (owner.sources.length > 1) {
      destinationCollisions.push({
        destination: owner.destination,
        sources: owner.sources,
        reason: 'multiple-sources',
      });
      continue;
    }
    const existingPath = existingPaths.get(targetKey);
    if (existingPath && !movingSourceKeys.has(targetKey)) {
      destinationCollisions.push({
        destination: owner.destination,
        sources: [owner.sources[0], existingPath].sort(),
        reason: 'existing-file',
      });
    }
  }
  destinationCollisions.sort((left, right) => left.destination.localeCompare(right.destination));

  const duplicateIds = [...ids.values()]
    .filter(({ paths }) => paths.length > 1)
    .map(({ id, paths }) => ({ id, paths: [...paths].sort() }))
    .sort((left, right) => left.id.localeCompare(right.id));
  parseErrors.sort((left, right) => left.path.localeCompare(right.path));

  const reportWithoutHash: Omit<ArtifactMigrationReport, 'planHash'> = {
    formatVersion: REPORT_VERSION,
    mode: 'report-only',
    cleanPreflight:
      destinationCollisions.length === 0 && duplicateIds.length === 0 && parseErrors.length === 0,
    counts: {
      markdownFiles: markdownFiles.length,
      auditedArtifacts,
      touchedArtifacts: operations.length,
      movedArtifacts: operations.filter(({ reportItem }) => reportItem.path.before !== reportItem.path.after).length,
      frontmatterUpdates: operations.filter(({ reportItem }) => reportItem.frontmatterChanges.length > 0).length,
    },
    artifacts: operations.map(({ reportItem }) => reportItem),
    issues: { destinationCollisions, duplicateIds, parseErrors },
  };
  const report: ArtifactMigrationReport = {
    ...reportWithoutHash,
    planHash: sha256(reportHashPayload(reportWithoutHash)),
  };
  return { report, operations };
}

async function writeFileAtomically(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporaryPath, 'wx');
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, filePath);
}

function assertCleanPreflight(analysis: ArtifactMigrationAnalysis): void {
  if (analysis.report.cleanPreflight) return;
  const issues = analysis.report.issues;
  throw new Error(
    'Artifact migration preflight failed: ' +
    `${issues.destinationCollisions.length} destination collision(s), ` +
    `${issues.duplicateIds.length} duplicate ID(s), and ` +
    `${issues.parseErrors.length} parse error(s).`,
  );
}

export async function createArtifactMigrationSnapshot(
  vaultRootInput: string,
  snapshotRootInput: string,
  analysis: ArtifactMigrationAnalysis,
): Promise<ArtifactMigrationSnapshotManifest> {
  assertCleanPreflight(analysis);
  const vaultRoot = path.resolve(vaultRootInput);
  const snapshotRoot = path.resolve(snapshotRootInput);
  const snapshotRelativeToVault = path.relative(vaultRoot, snapshotRoot);
  if (
    snapshotRelativeToVault === '' ||
    (!snapshotRelativeToVault.startsWith('..') && !path.isAbsolute(snapshotRelativeToVault))
  ) {
    throw new Error('Snapshot directory must be outside the vault.');
  }

  try {
    await access(snapshotRoot);
    throw new Error(`Snapshot directory already exists: ${snapshotRoot}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Snapshot directory already exists:')) throw error;
  }

  const entries: SnapshotEntry[] = [];
  try {
    await mkdir(snapshotRoot, { recursive: false });
    for (const operation of analysis.operations) {
      const sourcePath = operation.reportItem.path.before;
      const sourceAbsolutePath = resolveWithin(vaultRoot, sourcePath);
      const sourceRaw = await readFile(sourceAbsolutePath);
      const sourceHash = sha256(sourceRaw);
      if (sourceHash !== operation.reportItem.sourceSha256) {
        throw new Error(`Source changed after planning: "${sourcePath}"`);
      }
      const backupPath = `files/${sourcePath}`;
      const backupAbsolutePath = resolveWithin(snapshotRoot, backupPath);
      await mkdir(path.dirname(backupAbsolutePath), { recursive: true });
      await copyFile(sourceAbsolutePath, backupAbsolutePath);
      entries.push({
        sourcePath,
        destinationPath: operation.reportItem.path.after,
        sourceSha256: sourceHash,
        resultSha256: operation.reportItem.resultSha256,
        size: (await stat(sourceAbsolutePath)).size,
        backupPath,
      });
    }

    const manifest: ArtifactMigrationSnapshotManifest = {
      formatVersion: SNAPSHOT_VERSION,
      migrationPlanHash: analysis.report.planHash,
      vaultRoot,
      entries,
      restorationGuidance: [
        'Stop myOS before recovery so file watchers cannot race restoration.',
        'Run the migration CLI with --recover, the original --vault, and this --snapshot directory.',
        'Recovery refuses to overwrite content whose hash is not part of the recorded before/after plan.',
        'After recovery, rerun report-only mode and confirm the original plan is reproduced.',
      ],
    };
    await writeFileAtomically(
      path.join(snapshotRoot, MANIFEST_FILE),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return manifest;
  } catch (error) {
    await rm(snapshotRoot, { recursive: true, force: true });
    throw error;
  }
}

async function readArtifactMigrationSnapshot(
  snapshotRootInput: string,
): Promise<ArtifactMigrationSnapshotManifest> {
  const snapshotRoot = path.resolve(snapshotRootInput);
  const raw = await readFile(path.join(snapshotRoot, MANIFEST_FILE), 'utf8');
  const manifest = JSON.parse(raw) as Partial<ArtifactMigrationSnapshotManifest>;
  if (
    manifest.formatVersion !== SNAPSHOT_VERSION ||
    typeof manifest.migrationPlanHash !== 'string' ||
    typeof manifest.vaultRoot !== 'string' ||
    !Array.isArray(manifest.entries) ||
    !Array.isArray(manifest.restorationGuidance)
  ) {
    throw new Error('Invalid artifact migration snapshot manifest.');
  }
  return manifest as ArtifactMigrationSnapshotManifest;
}

async function verifySnapshotBackups(
  snapshotRoot: string,
  manifest: ArtifactMigrationSnapshotManifest,
): Promise<void> {
  for (const entry of manifest.entries) {
    const backupRaw = await readFile(resolveWithin(snapshotRoot, entry.backupPath));
    if (sha256(backupRaw) !== entry.sourceSha256 || backupRaw.byteLength !== entry.size) {
      throw new Error(`Snapshot verification failed for "${entry.sourcePath}".`);
    }
  }
}

async function verifyArtifactMigrationSnapshot(
  vaultRootInput: string,
  snapshotRootInput: string,
  analysis: ArtifactMigrationAnalysis,
): Promise<ArtifactMigrationSnapshotManifest> {
  assertCleanPreflight(analysis);
  const vaultRoot = path.resolve(vaultRootInput);
  const snapshotRoot = path.resolve(snapshotRootInput);
  const manifest = await readArtifactMigrationSnapshot(snapshotRoot);
  if (path.resolve(manifest.vaultRoot) !== vaultRoot) {
    throw new Error('Snapshot was created for a different vault root.');
  }
  if (manifest.migrationPlanHash !== analysis.report.planHash) {
    throw new Error('Snapshot migration plan hash does not match the current report.');
  }
  if (manifest.entries.length !== analysis.operations.length) {
    throw new Error('Snapshot entry count does not match the current report.');
  }
  await verifySnapshotBackups(snapshotRoot, manifest);

  for (let index = 0; index < analysis.operations.length; index += 1) {
    const operation = analysis.operations[index];
    const entry = manifest.entries[index];
    if (
      entry.sourcePath !== operation.reportItem.path.before ||
      entry.destinationPath !== operation.reportItem.path.after ||
      entry.sourceSha256 !== operation.reportItem.sourceSha256 ||
      entry.resultSha256 !== operation.reportItem.resultSha256
    ) {
      throw new Error(`Snapshot entry ${index + 1} does not match the current report.`);
    }
    const currentRaw = await readFile(resolveWithin(vaultRoot, entry.sourcePath));
    if (sha256(currentRaw) !== entry.sourceSha256) {
      throw new Error(`Vault source no longer matches snapshot: "${entry.sourcePath}".`);
    }
  }
  return manifest;
}

export async function recoverArtifactMigration(
  vaultRootInput: string,
  snapshotRootInput: string,
): Promise<{ restoredArtifacts: number }> {
  const vaultRoot = path.resolve(vaultRootInput);
  const snapshotRoot = path.resolve(snapshotRootInput);
  const manifest = await readArtifactMigrationSnapshot(snapshotRoot);
  if (path.resolve(manifest.vaultRoot) !== vaultRoot) {
    throw new Error('Snapshot was created for a different vault root.');
  }
  await verifySnapshotBackups(snapshotRoot, manifest);

  const allowedHashes = new Set(
    manifest.entries.flatMap((entry) => [entry.sourceSha256, entry.resultSha256]),
  );
  const relatedPaths = [...new Set(
    manifest.entries.flatMap((entry) => [entry.sourcePath, entry.destinationPath]),
  )].sort();
  for (const relatedPath of relatedPaths) {
    const absolutePath = resolveWithin(vaultRoot, relatedPath);
    try {
      const currentHash = sha256(await readFile(absolutePath));
      if (!allowedHashes.has(currentHash)) {
        throw new Error(
          `Recovery refuses to overwrite unrecognized content at "${relatedPath}".`,
        );
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  const transactionRoot = path.join(
    vaultRoot,
    `.artifact-migration-transaction-${manifest.migrationPlanHash.slice(0, 12)}`,
  );
  const recoveryStageRoot = path.join(transactionRoot, 'recovery-stage');
  await rm(recoveryStageRoot, { recursive: true, force: true });
  for (const entry of manifest.entries) {
    const stagedPath = resolveWithin(recoveryStageRoot, entry.sourcePath);
    await mkdir(path.dirname(stagedPath), { recursive: true });
    await copyFile(resolveWithin(snapshotRoot, entry.backupPath), stagedPath);
  }
  for (const relatedPath of relatedPaths) {
    await rm(resolveWithin(vaultRoot, relatedPath), { force: true });
  }
  for (const entry of manifest.entries) {
    const sourcePath = resolveWithin(vaultRoot, entry.sourcePath);
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await rename(resolveWithin(recoveryStageRoot, entry.sourcePath), sourcePath);
  }
  await rm(transactionRoot, { recursive: true, force: true });
  return { restoredArtifacts: manifest.entries.length };
}

export async function applyArtifactMigration(
  vaultRootInput: string,
  snapshotRootInput: string,
  analysis: ArtifactMigrationAnalysis,
  options: ApplyMigrationOptions = {},
): Promise<{ movedArtifacts: number; frontmatterUpdates: number }> {
  const vaultRoot = path.resolve(vaultRootInput);
  await verifyArtifactMigrationSnapshot(vaultRoot, snapshotRootInput, analysis);
  if (analysis.operations.length === 0) {
    return { movedArtifacts: 0, frontmatterUpdates: 0 };
  }

  const transactionRoot = path.join(
    vaultRoot,
    `.artifact-migration-transaction-${analysis.report.planHash.slice(0, 12)}`,
  );
  try {
    await access(transactionRoot);
    throw new Error(
      `Incomplete migration transaction exists at ${transactionRoot}. Run --recover first.`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Incomplete migration transaction')) throw error;
  }

  const stagedRoot = path.join(transactionRoot, 'staged');
  const originalsRoot = path.join(transactionRoot, 'originals');
  try {
    await mkdir(transactionRoot, { recursive: false });
    for (const operation of analysis.operations) {
      await writeFileAtomically(
        resolveWithin(stagedRoot, operation.reportItem.path.after),
        operation.afterRaw,
      );
    }
    for (const operation of analysis.operations) {
      const originalPath = resolveWithin(originalsRoot, operation.reportItem.path.before);
      await mkdir(path.dirname(originalPath), { recursive: true });
      await rename(resolveWithin(vaultRoot, operation.reportItem.path.before), originalPath);
    }
    for (let index = 0; index < analysis.operations.length; index += 1) {
      const operation = analysis.operations[index];
      const destinationPath = resolveWithin(vaultRoot, operation.reportItem.path.after);
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await rename(resolveWithin(stagedRoot, operation.reportItem.path.after), destinationPath);
      await options.onArtifactCommitted?.(operation.reportItem, index);
    }
    await rm(transactionRoot, { recursive: true, force: true });
    return {
      movedArtifacts: analysis.report.counts.movedArtifacts,
      frontmatterUpdates: analysis.report.counts.frontmatterUpdates,
    };
  } catch (error) {
    if (options.recoverOnFailure === false) throw error;
    try {
      await recoverArtifactMigration(vaultRoot, snapshotRootInput);
    } catch (recoveryError) {
      const rootMessage = error instanceof Error ? error.message : String(error);
      const recoveryMessage = recoveryError instanceof Error
        ? recoveryError.message
        : String(recoveryError);
      throw new Error(
        `Artifact migration failed: ${rootMessage}. Automatic recovery also failed: ${recoveryMessage}`,
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Artifact migration failed and was recovered from snapshot: ${message}`);
  }
}

export async function assertCleanGitCheckout(vaultRootInput: string): Promise<void> {
  const vaultRoot = path.resolve(vaultRootInput);
  let repositoryRoot: string;
  try {
    const result = await execFileAsync('git', ['-C', vaultRoot, 'rev-parse', '--show-toplevel']);
    repositoryRoot = result.stdout.trim();
  } catch {
    return;
  }
  const status = await execFileAsync('git', [
    '-C',
    repositoryRoot,
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  if (status.stdout.trim().length > 0) {
    throw new Error(
      `Apply requires a clean git checkout at ${repositoryRoot}. Commit or safely snapshot all changes first.`,
    );
  }
}
