/**
 * Shared types for the Electron IPC boundary.
 * Import from '@shared/types' in both electron/ and src/ code.
 */

export {
  Domain,
  ArtifactType,
  TodoPriority,
  TodoStatus,
  ArtifactStatus,
} from './enums';

export type {
  ArtifactCreateDraft,
  Artifact,
  ArtifactAssetManifestEntry,
} from './artifacts';
