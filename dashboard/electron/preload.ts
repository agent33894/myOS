import { contextBridge, ipcRenderer } from 'electron';
import { IPC_EVENTS, IPC_INVOKE_CHANNELS, type ElectronBridge, type IpcEvent } from '../shared/ipc/contracts';

const channels = new Set<string>(IPC_INVOKE_CHANNELS);
const events = new Set<string>(IPC_EVENTS);

// Requests from the command line (`--capture`, `open <path>`) can arrive before
// React subscribes; keep the latest of each until someone listens.
const BUFFERED: IpcEvent[] = ['app:capture', 'app:open-file'];
const held = new Map<string, unknown>();
const listeners = new Map<string, Set<(payload: unknown) => void>>();
for (const event of BUFFERED) {
  listeners.set(event, new Set());
  ipcRenderer.on(event, (_event, payload: unknown) => {
    const current = listeners.get(event)!;
    if (current.size === 0) held.set(event, payload);
    current.forEach((listener) => listener(payload));
  });
}

const bridge: ElectronBridge = {
  invoke(channel, ...args) {
    if (!channels.has(channel)) return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
  on(event, callback) {
    if (!events.has(event)) throw new Error(`Unknown IPC event: ${event}`);
    const buffered = listeners.get(event);
    if (buffered) {
      const listener = callback as (payload: unknown) => void;
      buffered.add(listener);
      if (held.has(event)) {
        const payload = held.get(event);
        held.delete(event);
        listener(payload);
      }
      return () => buffered.delete(listener);
    }
    const listener = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', bridge);
