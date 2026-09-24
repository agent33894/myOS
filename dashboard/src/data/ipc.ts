import type {
  ElectronBridge,
  IpcErrorCode,
  IpcEvent,
  IpcEventMap,
  IpcInvokeArgs,
  IpcInvokeChannel,
  IpcValue,
} from '@shared/ipc/contracts';

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}

export class IpcError extends Error {
  constructor(
    readonly code: IpcErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

export const isConflict = (error: unknown) => error instanceof IpcError && error.code === 'CONFLICT';

/** The renderer's only door to the main process: typed, and failures arrive as thrown `IpcError`s. */
export async function invoke<K extends IpcInvokeChannel>(channel: K, ...args: IpcInvokeArgs<K>): Promise<IpcValue<K>> {
  const bridge = window.electronAPI;
  if (!bridge) throw new IpcError('INTERNAL', 'myOS is not running inside its desktop shell.');
  const result = await bridge.invoke(channel, ...args);
  if (!result.ok) throw new IpcError(result.error.code, result.error.message);
  return result.value;
}

export function subscribe<E extends IpcEvent>(event: E, callback: (payload: IpcEventMap[E]) => void): () => void {
  return window.electronAPI?.on(event, callback) ?? (() => undefined);
}
