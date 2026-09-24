import type { ArtifactStatus, ArtifactType, Domain, TodoPriority, TodoStatus } from './enums';

/**
 * The frontmatter keys myOS understands. `ARTIFACT_FIELDS` in shared/spec
 * lists the same keys in on-disk order and owns their parsing.
 */
export interface ArtifactFields {
  id: string;
  title: string;
  type: ArtifactType;
  tags: string[];
  created: string;
  updated: string;
  status: ArtifactStatus | TodoStatus;
  related: string[];
  domain?: Domain;
  project?: string;
  priority?: TodoPriority;
  due?: string;
  parentId?: string;
  deferDate?: string;
  estimatedMinutes?: number;
  sequential?: boolean;
  flagged?: boolean;
  completedDate?: string;
  repeatRule?: string;
  localPath?: string;
  repoUrl?: string;
  isExternalProject?: boolean;
  language?: string;
  order?: number;
  pinned?: boolean;
  swatch?: string;
}

/** One Markdown file: known fields, unknown frontmatter, and the body. */
export interface Artifact extends ArtifactFields {
  /** Workspace-relative path. */
  filePath: string;
  /** File revision, `${mtimeMs}:${size}`, stamped by the main process on every read and write. */
  rev: string;
  /** Frontmatter keys myOS does not know, written back unchanged. */
  extra: Record<string, unknown>;
  content: string;
}

/** Listing shape: everything but the body, plus text for full-text search. */
export type ArtifactSummary = Omit<Artifact, 'content'> & { searchText?: string };

type EditableFields = Omit<ArtifactFields, 'id' | 'type' | 'created' | 'updated'>;

/** Frontmatter changes; `null` (or `undefined`) removes an optional key. */
export type ArtifactPatch = { [K in keyof EditableFields]?: EditableFields[K] | null };

/** What the renderer sends to create a file; the main process fills the rest. */
export type ArtifactDraft = ArtifactPatch & { type: ArtifactType; content?: string };
