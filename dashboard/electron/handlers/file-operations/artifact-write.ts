import { mkdir, open, readFile, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path';
import matter from 'gray-matter';
import { formatLocalDate } from '../../../shared/date.js';
import type { Artifact, ArtifactCreateDraft } from '../../../shared/types/index.js';
import { ArtifactType } from '../../../shared/types/index.js';
import { artifactToMarkdown } from './artifact-format.js';
import { getIsoTimestampString } from './dates.js';
import {
  buildScaffoldForType,
  deriveArtifactPathFromSpec,
  getArtifactSpec,
  getDefaultStatusForType,
  isStatusAllowedForType,
  normalizeDraftFromSpec,
  validateArtifactAgainstSpec,
  type ArtifactDraftInput,
} from '../../../shared/spec';
import { resolvePathWithinVault } from './path-safety.js';
import { invalidateArtifactReadCaches } from './artifact-read.js';

const ARTIFACT_NOT_FOUND_CODE = 'ARTIFACT_NOT_FOUND';

class ArtifactMutationError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ArtifactMutationError';
    this.code = code;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function createArtifactNotFoundError(cause?: unknown): ArtifactMutationError {
  return new ArtifactMutationError(
    ARTIFACT_NOT_FOUND_CODE,
    `[${ARTIFACT_NOT_FOUND_CODE}] Artifact changed or missing; refresh and retry.`,
    cause === undefined ? undefined : { cause }
  );
}

async function writeExistingFileStrict(filePath: string, content: string): Promise<void> {
  const handle = await open(filePath, 'r+');
  try {
    await handle.truncate(0);
    await handle.writeFile(content, 'utf-8');
  } finally {
    await handle.close();
  }
}

/**
 * Generate a unique ID for an artifact.
 */
function generateArtifactId(title?: string): string {
  if (title && title.trim()) {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    if (slug) {
      return `${slug}-${Date.now().toString(36)}`;
    }
  }
  return `artifact-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/**
 * Normalize a draft artifact into a canonical Artifact.
 * This is the single source of truth for artifact field defaults.
 */
function normalizeArtifact(draft: ArtifactCreateDraft): Artifact {
  const { artifact, warnings } = normalizeDraftFromSpec(
    draft as ArtifactDraftInput,
    {
      now: formatLocalDate(),
      generateId: generateArtifactId,
      strictStatus: true,
    }
  );

  if (warnings.length > 0) {
    console.warn('Artifact draft normalization warnings:', warnings);
  }

  return artifact as Artifact;
}

/**
 * Create a new artifact from a draft.
 * Normalizes all fields to canonical values and returns the persisted artifact.
 */
export async function createArtifact(draft: ArtifactCreateDraft): Promise<Artifact> {
  const artifact = normalizeArtifact(draft);

  const validation = validateArtifactAgainstSpec(artifact);
  if (!validation.valid) {
    throw new Error(
      `Artifact validation failed: ${validation.errors.join('; ')}`
    );
  }
  if (validation.warnings.length > 0) {
    console.warn('Artifact validation warnings:', validation.warnings);
  }

  const fullPath = resolvePathWithinVault(artifact.filePath);
  const dir = dirname(fullPath);

  await mkdir(dir, { recursive: true });

  const markdown = artifactToMarkdown(artifact);
  await writeFile(fullPath, markdown, 'utf-8');
  invalidateArtifactReadCaches(artifact.filePath, 'created');

  return artifact;
}

// Update an existing artifact
export async function updateArtifact(
  filePath: string,
  artifact: Artifact
): Promise<Artifact> {
  const fullPath = resolvePathWithinVault(filePath);
  let existingBody = '';

  try {
    const existingContent = await readFile(fullPath, 'utf-8');
    const parsed = matter(existingContent);
    existingBody = parsed.content.trim();
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      throw createArtifactNotFoundError(error);
    }
    throw error;
  }

  const nextArtifact: Artifact = {
    ...artifact,
    filePath,
  };

  nextArtifact.updated = getIsoTimestampString();

  const spec = getArtifactSpec(nextArtifact.type);
  if (
    !isStatusAllowedForType(nextArtifact.type, nextArtifact.status)
  ) {
    const fallbackStatus = getDefaultStatusForType(nextArtifact.type);
    console.warn(
      `Invalid status "${nextArtifact.status}" for type "${nextArtifact.type}". Falling back to "${fallbackStatus}".`
    );
    nextArtifact.status = fallbackStatus as Artifact['status'];
  }

  if (spec.domainRequired) {
    const domain = nextArtifact.domain;
    if (!domain || !spec.allowedDomains.includes(domain)) {
      const fallbackDomain = spec.defaultDomain || 'work';
      console.warn(
        `Invalid domain "${String(domain)}" for type "${nextArtifact.type}". Falling back to "${fallbackDomain}".`
      );
      nextArtifact.domain = fallbackDomain as Artifact['domain'];
    }
  } else {
    nextArtifact.domain = undefined;
  }

  if (typeof nextArtifact.content !== 'string' || nextArtifact.content.trim().length === 0) {
    nextArtifact.content =
      existingBody.length > 0
        ? existingBody
        : buildScaffoldForType(nextArtifact.type, {
            title: nextArtifact.title,
            fallbackContent: nextArtifact.title?.trim()
              ? `# ${nextArtifact.title.trim()}`
              : '[Content unavailable]',
          });
  }


  const expectedPath = deriveArtifactPathFromSpec({
    id: nextArtifact.id,
    type: nextArtifact.type,
    domain: nextArtifact.domain,
  });
  if (nextArtifact.filePath !== expectedPath) {
    console.warn(
      `Artifact filePath "${nextArtifact.filePath}" does not match canonical path "${expectedPath}". Keeping existing path for low-risk compatibility.`
    );
  }

  const validation = validateArtifactAgainstSpec(nextArtifact);
  if (!validation.valid) {
    throw new Error(
      `Artifact validation failed: ${validation.errors.join('; ')}`
    );
  }
  if (validation.warnings.length > 0) {
    console.warn('Artifact validation warnings:', validation.warnings);
  }

  const markdown = artifactToMarkdown(nextArtifact);
  try {
    await writeExistingFileStrict(fullPath, markdown);
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      throw createArtifactNotFoundError(error);
    }
    throw error;
  }

  invalidateArtifactReadCaches(filePath, 'updated');
  return nextArtifact;
}

// Delete an artifact
export async function deleteArtifact(filePath: string): Promise<void> {
  const fullPath = resolvePathWithinVault(filePath);
  try {
    await unlink(fullPath);
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      throw createArtifactNotFoundError(error);
    }
    throw error;
  }
  invalidateArtifactReadCaches(filePath, 'deleted');
}

// Promote an inbox item to a proper artifact
export async function promoteInboxItem(
  filePath: string,
  artifact: Artifact
): Promise<Artifact> {
  const oldFullPath = resolvePathWithinVault(filePath);

  if (!artifact.domain) {
    throw new Error('Domain is required to promote inbox item');
  }
  if (artifact.type === ArtifactType.INBOX) {
    throw new Error('Cannot promote an inbox item that is still type inbox');
  }

  const now = formatLocalDate();
  const promotedArtifact: Artifact = {
    ...artifact,
    updated: getIsoTimestampString(),
  };
  if (!promotedArtifact.created) {
    promotedArtifact.created = now;
  }

  const spec = getArtifactSpec(promotedArtifact.type);
  if (!isStatusAllowedForType(promotedArtifact.type, promotedArtifact.status)) {
    const fallbackStatus = getDefaultStatusForType(promotedArtifact.type);
    console.warn(
      `Invalid status "${promotedArtifact.status}" for type "${promotedArtifact.type}" during inbox promotion. Falling back to "${fallbackStatus}".`
    );
    promotedArtifact.status = fallbackStatus as Artifact['status'];
  }

  if (spec.domainRequired) {
    const domain = promotedArtifact.domain;
    if (!domain || !spec.allowedDomains.includes(domain)) {
      const fallbackDomain = spec.defaultDomain || 'work';
      console.warn(
        `Invalid domain "${String(domain)}" for type "${promotedArtifact.type}" during inbox promotion. Falling back to "${fallbackDomain}".`
      );
      promotedArtifact.domain = fallbackDomain as Artifact['domain'];
    }
  } else {
    promotedArtifact.domain = undefined;
  }

  if (typeof promotedArtifact.content !== 'string' || promotedArtifact.content.trim().length === 0) {
    promotedArtifact.content = buildScaffoldForType(promotedArtifact.type, {
      title: promotedArtifact.title,
      fallbackContent: promotedArtifact.title?.trim()
        ? `# ${promotedArtifact.title.trim()}`
        : '[Content unavailable]',
    });
  }


  const canonicalPath = deriveArtifactPathFromSpec({
    id: promotedArtifact.id,
    type: promotedArtifact.type,
    domain: promotedArtifact.domain,
  });
  promotedArtifact.filePath = canonicalPath;

  const validation = validateArtifactAgainstSpec(promotedArtifact);
  if (!validation.valid) {
    throw new Error(
      `Artifact validation failed during inbox promotion: ${validation.errors.join('; ')}`
    );
  }
  if (validation.warnings.length > 0) {
    console.warn('Artifact promotion validation warnings:', validation.warnings);
  }

  const newFullPath = resolvePathWithinVault(canonicalPath);
  const newDir = dirname(newFullPath);

  await mkdir(newDir, { recursive: true });

  const markdown = artifactToMarkdown(promotedArtifact);
  await writeFile(newFullPath, markdown, 'utf-8');

  if (oldFullPath !== newFullPath) {
    try {
      await unlink(oldFullPath);
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      try {
        await unlink(newFullPath);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }

      if (isErrnoException(error) && error.code === 'ENOENT') {
        throw createArtifactNotFoundError(error);
      }

      const rootMessage = error instanceof Error ? error.message : String(error);
      if (rollbackErrors.length === 0) {
        throw new Error(
          `Failed to finalize inbox promotion: ${rootMessage}. Promotion was rolled back.`
        );
      }

      const rollbackMessage = rollbackErrors
        .map((rollbackError, index) => `rollback-${index + 1}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
        .join('; ');
      throw new Error(
        `Failed to finalize inbox promotion: ${rootMessage}. Rollback encountered ${rollbackErrors.length} error(s): ${rollbackMessage}`
      );
    }
  }

  invalidateArtifactReadCaches(filePath, 'deleted');
  invalidateArtifactReadCaches(canonicalPath, 'created');
  return promotedArtifact;
}
