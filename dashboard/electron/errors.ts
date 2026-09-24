import type { IpcErrorCode } from '../shared/ipc/contracts';

/** An expected failure with a code the renderer can act on. */
export class DomainError extends Error {
  constructor(
    readonly code: IpcErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}
