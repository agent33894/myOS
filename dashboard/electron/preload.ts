import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcEventMap,
  IpcInvokeArgs,
  IpcInvokeChannel,
  IpcInvokeResult,
} from '../shared/ipc/contracts';

function invokeIpc<K extends IpcInvokeChannel>(
  channel: K,
  ...args: IpcInvokeArgs<K>
): Promise<IpcInvokeResult<K>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IpcInvokeResult<K>>;
}

// `myos --capture` can arrive before React subscribes; hold it until then.
let quickCaptureHandler: (() => void) | null = null;
let quickCaptureRequested = false;
ipcRenderer.on('quick-capture:open', () => {
  if (quickCaptureHandler) quickCaptureHandler();
  else quickCaptureRequested = true;
});

const electronAPI = {
  readAllArtifactMetadata: () => invokeIpc('artifacts:read-all-metadata'),
  readArtifact: (filePath: string) => invokeIpc('artifacts:read', filePath),
  readArtifactContent: (filePath: string) => invokeIpc('artifacts:read-content', filePath),
  createArtifact: (draft: IpcInvokeArgs<'artifacts:create'>[0]) =>
    invokeIpc('artifacts:create', draft),
  updateArtifact: (filePath: string, artifact: IpcInvokeArgs<'artifacts:update'>[1]) =>
    invokeIpc('artifacts:update', filePath, artifact),
  deleteArtifact: (filePath: string) => invokeIpc('artifacts:delete', filePath),
  attachLocalAsset: (request?: IpcInvokeArgs<'artifacts:attach-local-asset'>[0]) =>
    invokeIpc('artifacts:attach-local-asset', request),
  promoteInboxItem: (filePath: string, artifact: IpcInvokeArgs<'artifacts:promote-inbox'>[1]) =>
    invokeIpc('artifacts:promote-inbox', filePath, artifact),
  onFileChanged: (
    callback: (
      event: IpcEventMap['file-changed']['event'],
      data: IpcEventMap['file-changed']['data'],
    ) => void,
  ) => {
    ipcRenderer.on('file-changed', (_event, event, data) => callback(event, data));
  },
  removeFileChangedListener: () => ipcRenderer.removeAllListeners('file-changed'),
  getArtifactGitRules: () => invokeIpc('git:artifact-rules:get'),
  setArtifactGitRules: (rules: IpcInvokeArgs<'git:artifact-rules:set'>[0]) =>
    invokeIpc('git:artifact-rules:set', rules),
  getCommitSummary: (projectPath: string, commitHash: string) =>
    invokeIpc('git:commit-summary', projectPath, commitHash),
  getCommitDiff: (projectPath: string, commitHash: string) =>
    invokeIpc('git:commit-diff', projectPath, commitHash),
  showItemInFolder: (itemPath: string) => invokeIpc('shell:show-in-folder', itemPath),
  openExternalUrl: (url: string) => invokeIpc('shell:open-external-url', url),
  openArtifactFile: (filePath: string) => invokeIpc('shell:open-artifact-file', filePath),
  getSystemAccent: () => invokeIpc('system:get-accent'),
  onSystemAccentChanged: (callback: (data: IpcEventMap['system:accent-changed']) => void) => {
    const listener = (_event: unknown, data: IpcEventMap['system:accent-changed']) => callback(data);
    ipcRenderer.on('system:accent-changed', listener);
    return () => ipcRenderer.removeListener('system:accent-changed', listener);
  },
  onOpenQuickCapture: (callback: () => void) => {
    quickCaptureHandler = callback;
    if (quickCaptureRequested) {
      quickCaptureRequested = false;
      callback();
    }
    return () => {
      if (quickCaptureHandler === callback) quickCaptureHandler = null;
    };
  },
  showNotification: (options: { title: string; body: string }) =>
    invokeIpc('notifications:show', options),
  setVaultPath: (path: string) => invokeIpc('vault:set-path', path),
  getVaultPath: () => invokeIpc('vault:get-path'),
  chooseVaultFolder: () => invokeIpc('vault:choose-folder'),
  createDefaultVault: () => invokeIpc('vault:create-default'),
  closeWindow: () => invokeIpc('window:close'),
};

export type ElectronAPI = {
  [K in keyof typeof electronAPI]: (typeof electronAPI)[K];
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
