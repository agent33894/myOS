/**
 * Vault index contracts (P0-1a).
 *
 * Pure type definitions plus injectable filesystem/parser boundaries so the
 * index engine (P0-1b) can be tested without touching the real vault.
 * No renderer, IPC, schema, or Markdown serialization changes live here.
 */

export interface WorkspaceIdentity {
  readonly id: string;
  readonly root: string;
}

export interface StatResult {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  readonly mtimeMs: number;
  readonly size: number;
  readonly dev: number;
  readonly ino: number;
}

export interface DirEntry {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
}

export interface IndexFsAdapter {
  listDir(absolutePath: string): Promise<readonly DirEntry[]>;
  stat(absolutePath: string): Promise<StatResult>;
  realpath(absolutePath: string): Promise<string>;
  readFile(absolutePath: string): Promise<string>;
}

export interface IndexParser {
  parse(
    relativePath: string,
    content: string
  ): { metadata: unknown } | { error: string };
}

export interface FileFingerprint {
  readonly mtimeMs: number;
  readonly size: number;
  readonly fileKey: string;
}

export interface IndexEntry {
  readonly relativePath: string;
  readonly fingerprint: FileFingerprint;
  readonly metadata: unknown;
  readonly error?: string;
}

export interface IndexSnapshot {
  readonly workspaceId: string;
  readonly sequence: number;
  readonly entries: readonly IndexEntry[];
}

export type AffectedChangeKind = 'created' | 'updated' | 'deleted' | 'renamed';

export interface AffectedChange {
  readonly kind: AffectedChangeKind;
  readonly relativePath: string;
  readonly renamedFrom?: string;
}

export interface IndexIssue {
  readonly relativePath: string;
  readonly reason: string;
}

export interface WorkToken {
  readonly generation: number;
  isStale(): boolean;
}

/** Opaque filesystem identity (device + inode). Empty when unavailable. */
export function fileKeyOf(stat: StatResult): string {
  if (!Number.isFinite(stat.dev) || !Number.isFinite(stat.ino)) {
    return '';
  }
  return `${stat.dev}:${stat.ino}`;
}
