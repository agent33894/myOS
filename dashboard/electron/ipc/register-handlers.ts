import { BrowserWindow, Notification, dialog, ipcMain } from 'electron';
import { createDefaultWorkspace, getVaultPath, setVaultPath } from '../utils/paths.js';

import * as fileOperations from '../handlers/file-operations.js';
import * as watcher from '../handlers/watcher.js';
import * as artifactGitignore from '../handlers/artifact-gitignore.js';
import * as gitDiff from '../handlers/git-diff.js';
import * as shellOperations from '../handlers/shell-operations.js';
import { attachLocalAsset } from '../handlers/file-operations/asset-attachments.js';
import { readOmarchyAccent } from '../utils/omarchy-theme.js';
import type { IpcInvokeArgs } from '../../shared/ipc/contracts';

interface RegisterIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
}

export function registerIpcHandlers({ getMainWindow }: RegisterIpcHandlersOptions) {
  const startWatcher = () => {
    watcher.setupFileWatcher((event, data) => {
      fileOperations.invalidateArtifactReadCaches(data.filePath, event);
      getMainWindow()?.webContents.send('file-changed', event, data);
    });
  };

  // File operations handlers
  ipcMain.handle('artifacts:read-all-metadata', () => fileOperations.readAllArtifactMetadata());
  ipcMain.handle('artifacts:read', (_event, filePath: string) => fileOperations.readArtifact(filePath));
  ipcMain.handle('artifacts:read-content', (_event, filePath: string) => fileOperations.readArtifactContent(filePath));
  ipcMain.handle('artifacts:create', (_event, draft: IpcInvokeArgs<'artifacts:create'>[0]) => fileOperations.createArtifact(draft));
  ipcMain.handle('artifacts:update', (_event, filePath: string, artifact: IpcInvokeArgs<'artifacts:update'>[1]) =>
    fileOperations.updateArtifact(filePath, artifact)
  );
  ipcMain.handle('artifacts:delete', (_event, filePath: string) => fileOperations.deleteArtifact(filePath));
  ipcMain.handle('artifacts:promote-inbox', (_event, filePath: string, artifact: IpcInvokeArgs<'artifacts:promote-inbox'>[1]) =>
    fileOperations.promoteInboxItem(filePath, artifact)
  );
  ipcMain.handle(
    'artifacts:attach-local-asset',
    (_event, request: IpcInvokeArgs<'artifacts:attach-local-asset'>[0]) =>
      attachLocalAsset(request)
  );

  // File watcher
  startWatcher();
  // Git stats handlers
  ipcMain.handle('git:artifact-rules:get', () => artifactGitignore.getArtifactGitRules());
  ipcMain.handle('git:artifact-rules:set', (_event, rules: IpcInvokeArgs<'git:artifact-rules:set'>[0]) =>
    artifactGitignore.setArtifactGitRules(rules)
  );

  // Git diff handlers (for commit diff viewer)
  ipcMain.handle('git:commit-summary', (_event, projectPath: string, commitHash: string) =>
    gitDiff.getCommitSummary(projectPath, commitHash)
  );
  ipcMain.handle('git:commit-diff', (_event, projectPath: string, commitHash: string) =>
    gitDiff.getCommitDiff(projectPath, commitHash)
  );

  // Shell operations handlers (Finder, external URLs)
  ipcMain.handle('shell:show-in-folder', (_event, itemPath: string) =>
    shellOperations.showItemInFolder(itemPath)
  );
  ipcMain.handle('shell:open-external-url', (_event, url: string) =>
    shellOperations.openExternalUrl(url)
  );
  ipcMain.handle('shell:open-artifact-file', (_event, filePath: string) =>
    shellOperations.openArtifactFile(filePath)
  );
  ipcMain.handle('system:get-accent', () => readOmarchyAccent());
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  // Workspace path handlers shared by the renderer and main process.
  ipcMain.handle('vault:set-path', (_event, path: string) => {
    const success = setVaultPath(path);
    if (success) {
      fileOperations.invalidateArtifactReadCaches();
      // Reinitialize file watcher with new path
      startWatcher();
    }
    return success;
  });
  ipcMain.handle('vault:get-path', () => getVaultPath());
  ipcMain.handle('vault:choose-folder', async () => {
    const options = {
      title: 'Choose a Markdown folder',
      buttonLabel: 'Use This Folder',
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>,
    };
    const mainWindow = getMainWindow();
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    const selectedPath = result.canceled ? undefined : result.filePaths[0];
    if (!selectedPath || !setVaultPath(selectedPath)) {
      return null;
    }
    fileOperations.invalidateArtifactReadCaches();
    startWatcher();
    return selectedPath;
  });
  ipcMain.handle('vault:create-default', () => {
    const workspacePath = createDefaultWorkspace();
    fileOperations.invalidateArtifactReadCaches();
    startWatcher();
    return workspacePath;
  });

  // Desktop notifications handler
  ipcMain.handle('notifications:show', (_event, options: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: false,
      });
      notification.show();

      // When notification is clicked, focus the main window
      notification.on('click', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });

      return true;
    }
    return false;
  });
}
