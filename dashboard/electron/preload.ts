import { contextBridge, ipcRenderer } from 'electron';
import { IPC_EVENTS, IPC_INVOKE_CHANNELS, type ElectronBridge } from '../shared/ipc/contracts';

const channels = new Set<string>(IPC_INVOKE_CHANNELS);
const events = new Set<string>(IPC_EVENTS);

// `myos --capture` can arrive before React subscribes; hold it until then.
let captureRequested = false;
const captureListeners = new Set<() => void>();
ipcRenderer.on('capture:open', () => {
  if (captureListeners.size === 0) captureRequested = true;
  captureListeners.forEach((listener) => listener());
});

const bridge: ElectronBridge = {
  invoke(channel, ...args) {
    if (!channels.has(channel)) return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
  on(event, callback) {
    if (!events.has(event)) throw new Error(`Unknown IPC event: ${event}`);
    if (event === 'capture:open') {
      const listener = callback as () => void;
      captureListeners.add(listener);
      if (captureRequested) {
        captureRequested = false;
        listener();
      }
      return () => captureListeners.delete(listener);
    }
    const listener = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', bridge);
