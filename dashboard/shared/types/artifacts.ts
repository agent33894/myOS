/**
 * Core artifact types for the IPC boundary between renderer and main process.
 *
 * ArtifactCreateDraft: What the renderer sends when creating artifacts
 * Artifact: What the backend returns after processing (canonical form)
 */

import {
  Domain,
  ArtifactType,
  TodoPriority,
  TodoStatus,
  ArtifactStatus,
} from './enums';

/**
 * Task-specific fields (only apply to type=todo|project)
 */
interface TaskFields {
  priority?: TodoPriority;
  due?: string;
  parentId?: string;
  deferDate?: string;
  estimatedMinutes?: number;
  sequential?: boolean;
  flagged?: boolean;
  completedDate?: string;
  repeatRule?: string;
}

/**
 * External project linking fields
 */
interface ExternalProjectFields {
  localPath?: string;
  repoUrl?: string;
  isExternalProject?: boolean;
}

/**
 * Snippet-specific fields (only apply to type=snippet)
 */
interface SnippetFields {
  language?: string; // e.g., typescript, python, bash, etc.
}

/**
 * Special artifact type fields
 */
interface SpecialFields {
  analysisData?: unknown;
  sources?: string[];
}

export interface ArtifactAssetManifestEntry {
  localRelativePath: string;
  storagePath: string;
  bucket: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
  uploadedAt?: string;
}

interface AssetFields {
  assetManifest?: ArtifactAssetManifestEntry[];
}

/**
 * Artifact - The complete artifact as returned by the backend.
 * All fields are guaranteed to be set after backend processing.
 */
export interface Artifact
  extends TaskFields,
    ExternalProjectFields,
    SpecialFields,
    AssetFields,
    SnippetFields {
  id: string;
  title: string;
  type: ArtifactType;
  domain?: Domain;
  tags: string[];
  status: ArtifactStatus | TodoStatus;
  related: string[];
  content: string;
  project?: string;
  created: string;
  updated: string;
  filePath: string;
  order?: number;
  /** Sidebar pin — pinned projects render above the overflow disclosure, ordered by `order`. */
  pinned?: boolean;
  /** Explicit projectSwatches name; overrides the title-hash color so renames keep their ink. */
  swatch?: string;
  // Transient search index text (not persisted to artifact markdown).
  searchContent?: string;
}

/** Minimal create payload; the backend supplies all omitted canonical fields. */
export type ArtifactCreateDraft = Partial<Artifact> &
  Pick<Artifact, 'title' | 'type'>;
