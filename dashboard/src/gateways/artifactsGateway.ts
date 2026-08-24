/**
 * Artifacts Gateway - Centralized IPC operations for artifacts.
 *
 * All artifact creation, update, and delete operations should go through
 * this gateway to ensure consistent validation and error handling.
 */

import type { Artifact, ArtifactCreateDraft } from '@/types/artifacts';

// ============================================================================
// Types
// ============================================================================

export type ArtifactDraft = ArtifactCreateDraft;

/**
 * Error class for gateway operations
 */
class ArtifactGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: ArtifactErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ArtifactGatewayError';
  }
}

enum ArtifactErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  IPC_UNAVAILABLE = 'IPC_UNAVAILABLE',
  IPC_ERROR = 'IPC_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
}

function formatMutationError(operation: 'update' | 'delete' | 'promote', error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (rawMessage.includes('ARTIFACT_NOT_FOUND')) {
    return 'Artifact changed or missing; refresh and retry.';
  }
  return `Failed to ${operation} artifact: ${rawMessage}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a draft before sending to IPC
 */
function validateDraft(draft: ArtifactDraft): void {
  if (!draft.title?.trim()) {
    throw new ArtifactGatewayError(
      'Title is required',
      ArtifactErrorCode.VALIDATION_FAILED,
      { field: 'title' }
    );
  }

  if (!draft.type) {
    throw new ArtifactGatewayError(
      'Type is required',
      ArtifactErrorCode.VALIDATION_FAILED,
      { field: 'type' }
    );
  }
}

/**
 * Type guard to validate an Artifact response
 */
function isValidArtifact(value: unknown): value is Artifact {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.filePath === 'string' &&
    typeof obj.created === 'string' &&
    typeof obj.updated === 'string' &&
    Array.isArray(obj.tags) &&
    Array.isArray(obj.related)
  );
}

// ============================================================================
// Gateway Functions
// ============================================================================

/**
 * Create a new artifact via IPC.
 *
 * @param draft - The artifact draft to create
 * @returns The created artifact with all fields normalized
 * @throws ArtifactGatewayError if validation or IPC fails
 */
export async function createArtifact(draft: ArtifactDraft): Promise<Artifact> {
  if (!window.electronAPI) {
    throw new ArtifactGatewayError(
      'Electron API not available',
      ArtifactErrorCode.IPC_UNAVAILABLE
    );
  }

  validateDraft(draft);

  try {
    const result = await window.electronAPI.createArtifact(draft);

    if (!isValidArtifact(result)) {
      throw new ArtifactGatewayError(
        'Backend returned invalid artifact',
        ArtifactErrorCode.INVALID_RESPONSE,
        { result }
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ArtifactGatewayError) {
      throw error;
    }
    throw new ArtifactGatewayError(
      `Failed to create artifact: ${error instanceof Error ? error.message : String(error)}`,
      ArtifactErrorCode.IPC_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update an existing artifact via IPC.
 *
 * @param filePath - The file path of the artifact to update
 * @param artifact - The updated artifact data
 * @returns The updated artifact
 */
export async function updateArtifact(
  filePath: string,
  artifact: Artifact
): Promise<Artifact> {
  if (!window.electronAPI) {
    throw new ArtifactGatewayError(
      'Electron API not available',
      ArtifactErrorCode.IPC_UNAVAILABLE
    );
  }

  if (!filePath?.trim()) {
    throw new ArtifactGatewayError(
      'filePath is required for update',
      ArtifactErrorCode.VALIDATION_FAILED,
      { field: 'filePath' }
    );
  }

  try {
    const result = await window.electronAPI.updateArtifact(filePath, artifact);
    if (!isValidArtifact(result)) {
      throw new ArtifactGatewayError(
        'Backend returned invalid artifact',
        ArtifactErrorCode.INVALID_RESPONSE,
        { result }
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ArtifactGatewayError) {
      throw error;
    }
    throw new ArtifactGatewayError(
      formatMutationError('update', error),
      ArtifactErrorCode.IPC_ERROR,
      { originalError: error, filePath }
    );
  }
}

/**
 * Delete an artifact via IPC.
 *
 * @param filePath - The file path of the artifact to delete
 */
export async function deleteArtifact(filePath: string): Promise<void> {
  if (!window.electronAPI) {
    throw new ArtifactGatewayError(
      'Electron API not available',
      ArtifactErrorCode.IPC_UNAVAILABLE
    );
  }

  if (!filePath?.trim()) {
    throw new ArtifactGatewayError(
      'filePath is required for delete',
      ArtifactErrorCode.VALIDATION_FAILED,
      { field: 'filePath' }
    );
  }

  try {
    await window.electronAPI.deleteArtifact(filePath);
  } catch (error) {
    throw new ArtifactGatewayError(
      formatMutationError('delete', error),
      ArtifactErrorCode.IPC_ERROR,
      { originalError: error, filePath }
    );
  }
}

export async function promoteInboxItem(
  filePath: string,
  artifact: Artifact
): Promise<Artifact> {
  if (!window.electronAPI) {
    throw new ArtifactGatewayError(
      'Electron API not available',
      ArtifactErrorCode.IPC_UNAVAILABLE
    );
  }

  if (!filePath?.trim()) {
    throw new ArtifactGatewayError(
      'filePath is required for promote',
      ArtifactErrorCode.VALIDATION_FAILED,
      { field: 'filePath' }
    );
  }

  try {
    const result = await window.electronAPI.promoteInboxItem(filePath, artifact);
    if (!isValidArtifact(result)) {
      throw new ArtifactGatewayError(
        'Backend returned invalid artifact',
        ArtifactErrorCode.INVALID_RESPONSE,
        { result }
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ArtifactGatewayError) {
      throw error;
    }
    throw new ArtifactGatewayError(
      formatMutationError('promote', error),
      ArtifactErrorCode.IPC_ERROR,
      { originalError: error, filePath }
    );
  }
}
