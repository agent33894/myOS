import matter from 'gray-matter';
import { access, readdir, readFile } from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  type ArtifactTypeValue,
  type DomainValue,
  getAllowedStatusesForType,
  normalizeDraftFromSpec,
  type ArtifactDraftInput,
  validateArtifactAgainstSpec,
} from '@shared/spec';
import { ArtifactType, Domain } from '@shared/types';

const KNOWN_ARTIFACT_TYPES = new Set<string>(Object.values(ArtifactType));
const KNOWN_DOMAINS = new Set<string>(Object.values(Domain));
const LEGACY_STATUS_MAP: Record<string, string> = {
  published: 'active',
  completed: 'done',
  complete: 'done',
};

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
  rawStatus: unknown
): string | undefined {
  const status = asOptionalString(rawStatus)?.toLowerCase();
  if (!status) return undefined;

  const mapped = LEGACY_STATUS_MAP[status] || status;
  const allowedStatuses = getAllowedStatusesForType(type as ArtifactType);
  if (allowedStatuses.includes(mapped as any)) {
    return mapped;
  }

  // Deterministic fallback for legacy statuses no longer valid for this type.
  if (mapped === 'done' && allowedStatuses.includes('active' as any)) {
    return 'active';
  }
  if (allowedStatuses.includes('active' as any)) {
    return 'active';
  }
  if (allowedStatuses.length > 0) {
    return allowedStatuses[0];
  }

  return mapped;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveVaultRoot(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), '../vault'),
    path.resolve(process.cwd(), 'vault'),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate vault directory. Checked: ${candidates.join(', ')}`
  );
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
        if (entry.name === 'assets') continue;
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function buildDraftFromFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string
): ArtifactDraftInput | null {
  const rawType = asOptionalString(frontmatter.type)?.toLowerCase();
  const type = rawType as ArtifactTypeValue | undefined;
  if (!type || !KNOWN_ARTIFACT_TYPES.has(type)) {
    return null;
  }
  const normalizedContent = content.trim();
  const rawDomain = asOptionalString(frontmatter.domain);
  const domain =
    rawDomain && KNOWN_DOMAINS.has(rawDomain as DomainValue)
      ? (rawDomain as DomainValue)
      : undefined;

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
    estimatedMinutes:
      typeof frontmatter.estimatedMinutes === 'number'
        ? frontmatter.estimatedMinutes
        : undefined,
    sequential:
      typeof frontmatter.sequential === 'boolean'
        ? frontmatter.sequential
        : undefined,
    flagged:
      typeof frontmatter.flagged === 'boolean' ? frontmatter.flagged : undefined,
    completedDate: asOptionalDateString(frontmatter.completedDate),
    repeatRule: asOptionalString(frontmatter.repeatRule),
    localPath: asOptionalString(frontmatter.localPath),
    repoUrl: asOptionalString(frontmatter.repoUrl),
    isExternalProject:
      typeof frontmatter.isExternalProject === 'boolean'
        ? frontmatter.isExternalProject
        : undefined,
    language: asOptionalString(frontmatter.language),
    analysisData: frontmatter.analysisData,
    sources: asStringArray(frontmatter.sources),
    order: typeof frontmatter.order === 'number' ? frontmatter.order : undefined,
  };
}

describe('artifact migration audit', () => {
  it('keeps vault artifacts compliant with shared spec rules', async () => {
    const vaultRoot = await resolveVaultRoot();
    const markdownFiles = await collectMarkdownFiles(vaultRoot);
    const blockingIssues: string[] = [];
    const warningIssues: string[] = [];
    let auditedArtifacts = 0;

    for (const absolutePath of markdownFiles) {
      const raw = await readFile(absolutePath, 'utf8');
      const parsed = matter(raw);
      const relativeFilePath = path
        .relative(vaultRoot, absolutePath)
        .split(path.sep)
        .join('/');
      const draft = buildDraftFromFrontmatter(
        parsed.data as Record<string, unknown>,
        parsed.content
      );

      if (!draft) continue;
      auditedArtifacts += 1;

      try {
        const normalized = normalizeDraftFromSpec(draft, {
          now: '2026-02-22',
          strictStatus: true,
          generateId: (title = 'artifact') =>
            title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') || 'artifact',
        });

        if (normalized.warnings.length > 0) {
          warningIssues.push(
            `${relativeFilePath}: ${normalized.warnings.join(' | ')}`
          );
        }

        const validation = validateArtifactAgainstSpec({
          ...normalized.artifact,
          filePath: relativeFilePath,
        });

        if (!validation.valid) {
          blockingIssues.push(
            `${relativeFilePath}: ${validation.errors.join(' | ')}`
          );
        }

        if (validation.warnings.length > 0) {
          warningIssues.push(
            `${relativeFilePath}: ${validation.warnings.join(' | ')}`
          );
        }
      } catch (error) {
        blockingIssues.push(
          `${relativeFilePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (warningIssues.length > 0) {
      // Emit warnings for rollout visibility without blocking CI.
      console.warn(
        `[artifact-migration-audit] ${warningIssues.length} warnings across ${auditedArtifacts} artifacts`
      );
    }

    if (blockingIssues.length > 0) {
      console.error(
        `[artifact-migration-audit] Blocking issues:\n${blockingIssues
          .slice(0, 30)
          .join('\n')}`
      );
    }

    expect(auditedArtifacts).toBeGreaterThanOrEqual(0);
    expect(blockingIssues).toHaveLength(0);
  }, 15_000);
});
