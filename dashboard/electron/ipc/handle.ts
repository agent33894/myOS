import { ipcMain } from 'electron';
import type { IpcErrorCode, IpcInvokeArgs, IpcInvokeChannel, IpcValue, Result } from '../../shared/ipc/contracts';
import { DomainError, isMissingFile } from '../errors';

/** `path`: non-empty string. `count`: a positive integer. A trailing `?` allows undefined; `string|null` allows null. */
type ArgKind = 'path' | 'string' | 'object' | 'string?' | 'path?' | 'count?' | 'strings?' | 'string|null';

const CHECKS: Record<ArgKind, (value: unknown) => boolean> = {
  path: (value) => typeof value === 'string' && value.trim().length > 0,
  string: (value) => typeof value === 'string',
  object: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  'string?': (value) => value === undefined || typeof value === 'string',
  'path?': (value) => value === undefined || CHECKS.path(value),
  'count?': (value) => value === undefined || (Number.isInteger(value) && (value as number) > 0),
  'strings?': (value) => value === undefined || (Array.isArray(value) && value.every(CHECKS.path)),
  'string|null': (value) => value === null || typeof value === 'string',
};

function failure(code: IpcErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

/**
 * Register a handler for a contracted channel. The implementation's signature
 * is checked against `IpcInvokeMap`; `argKinds` guards the untrusted runtime
 * values; thrown `DomainError`s become typed failures.
 */
export function handle<K extends IpcInvokeChannel>(
  channel: K,
  argKinds: readonly ArgKind[],
  impl: (...args: IpcInvokeArgs<K>) => Promise<IpcValue<K>> | IpcValue<K>,
): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]): Promise<Result<IpcValue<K>>> => {
    const bad = argKinds.findIndex((kind, index) => !CHECKS[kind](args[index]));
    if (bad >= 0) return failure('INVALID', `${channel}: argument ${bad + 1} is invalid.`);
    if (args.length > argKinds.length) return failure('INVALID', `${channel}: too many arguments.`);
    try {
      return { ok: true, value: await impl(...(args as IpcInvokeArgs<K>)) };
    } catch (error) {
      if (error instanceof DomainError) return failure(error.code, error.message);
      if (isMissingFile(error)) return failure('NOT_FOUND', (error as Error).message);
      console.error(`[ipc] ${channel} failed:`, error);
      return failure('INTERNAL', error instanceof Error ? error.message : String(error));
    }
  });
}
