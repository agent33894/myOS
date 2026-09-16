/**
 * Workspace-rooted path validation for the vault index (P0-1a).
 *
 * Every discovered or event-supplied path is validated lexically AND against
 * the realpath of its nearest existing ancestor, so symlink escapes can
 * never reach the filesystem adapter. Rejects sibling-prefix escapes
 * (e.g. `<root>-backup`) via strict relative-path checks. Note: an
 * in-vault symlink cycle may pass validation (it anchors to a contained
 * parent) and then fails observably when the filesystem is actually
 * accessed — containment holds, availability errors surface at use.
 */
import { isAbsolute, relative, resolve, sep } from 'path';

export type ValidationFailureReason =
  | 'empty-path'
  | 'absolute-path'
  | 'lexical-escape'
  | 'realpath-escape'
  | 'ancestor-missing';

export interface ValidatedAbsolutePath {
  readonly absolutePath: string;
  readonly relativePath: string;
}

function isWithinRoot(root: string, target: string): boolean {
  if (root === target) {
    return true;
  }
  const rel = relative(root, target);
  // Reject only a true parent escape (`..` or `../...`); contained names
  // such as `..draft.md` or `..notes/file.md` are valid.
  return rel.length > 0 && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function toVaultRelative(root: string, absolutePath: string): string {
  if (root === absolutePath) {
    return '';
  }
  return relative(root, absolutePath);
}

export interface ValidationFs {
  exists(absolutePath: string): Promise<boolean>;
  realpath(absolutePath: string): Promise<string>;
}

/**
 * Find the nearest existing ancestor of a possibly-missing path, staying
 * within maxDepth hops to bound traversal on adversarial inputs.
 */
async function findExistingAncestor(
  fs: ValidationFs,
  startPath: string,
  maxDepth: number
): Promise<string | null> {
  let current = resolve(startPath);
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    if (await fs.exists(current)) {
      return current;
    }
    const parent = resolve(current, '..');
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  return null;
}

export interface ValidatePathOptions {
  readonly captureRoot: string;
  readonly captureRootReal: string;
  readonly candidate: string;
  readonly fs: ValidationFs;
  /** Max ancestor hops for missing paths. Defaults to 64. */
  readonly maxAncestorDepth?: number;
}

export interface ValidatePathResult {
  readonly ok: boolean;
  readonly reason?: ValidationFailureReason;
  readonly validated?: ValidatedAbsolutePath;
}

/**
 * Validate a vault-relative candidate against the captured workspace root.
 * Returns the resolved absolute path plus its vault-relative form on success.
 */
export async function validateIndexPath(
  options: ValidatePathOptions
): Promise<ValidatePathResult> {
  const { captureRoot, captureRootReal, candidate, fs } = options;
  const maxAncestorDepth = options.maxAncestorDepth ?? 64;

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return { ok: false, reason: 'empty-path' };
  }
  if (isAbsolute(candidate)) {
    return { ok: false, reason: 'absolute-path' };
  }

  const absolutePath = resolve(captureRoot, candidate);
  if (!isWithinRoot(captureRoot, absolutePath)) {
    return { ok: false, reason: 'lexical-escape' };
  }

  const anchor = await findExistingAncestor(fs, absolutePath, maxAncestorDepth);
  if (anchor === null) {
    return { ok: false, reason: 'ancestor-missing' };
  }
  if (!isWithinRoot(captureRoot, anchor)) {
    return { ok: false, reason: 'lexical-escape' };
  }

  let anchorReal: string;
  try {
    anchorReal = resolve(await fs.realpath(anchor));
  } catch {
    return { ok: false, reason: 'ancestor-missing' };
  }
  if (!isWithinRoot(captureRootReal, anchorReal)) {
    return { ok: false, reason: 'realpath-escape' };
  }

  return {
    ok: true,
    validated: {
      absolutePath,
      relativePath: toVaultRelative(captureRoot, absolutePath),
    },
  };
}
