import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import type { IpcEvent, IpcEventMap } from '../../shared/ipc/contracts';
import {
  createArtifact,
  deleteArtifact,
  listArtifacts,
  listHistory,
  moveArtifact,
  moveToArea,
  patchArtifact,
  readArtifact,
  readHistory,
  renameArtifact,
  restoreArtifact,
  restoreVersion,
  retypeArtifact,
  saveArtifact,
  toggleCheck,
} from '../documents/artifacts';
import { exportDocument } from '../export/export';
import { attachAsset } from '../documents/assets';
import { commitDiff, commitSummary } from '../git/commits';
import { getArtifactGitRules, setArtifactGitRules } from '../git/rules';
import { notify, openExternal, openInEditor, reveal } from '../shell/shell';
import { readOmarchyAccent } from '../utils/omarchy-theme';
import { watchWorkspace } from '../watch/watcher';
import { createStarterWorkspace, currentWorkspace, selectWorkspace } from '../workspace/root';
import { handle } from './handle';

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  const send = <E extends IpcEvent>(event: E, payload: IpcEventMap[E]) => getWindow()?.webContents.send(event, payload);
  const watch = () => watchWorkspace(currentWorkspace(), (change) => send('artifacts:changed', change));
  watch();

  handle('artifacts:list', [], listArtifacts);
  handle('artifacts:read', ['path'], readArtifact);
  handle('artifacts:create', ['object'], createArtifact);
  handle('artifacts:save', ['path', 'object', 'string'], saveArtifact);
  handle('artifacts:patch', ['path', 'object', 'string?'], patchArtifact);
  handle('artifacts:retype', ['path', 'object', 'string?'], retypeArtifact);
  handle('artifacts:delete', ['path', 'string?'], deleteArtifact);
  handle('artifacts:restore', ['object'], restoreArtifact);
  handle('artifacts:attach-asset', ['object'], attachAsset);
  handle('artifacts:toggle-check', ['path', 'line', 'string', 'string?'], toggleCheck);
  handle('artifacts:rename', ['path', 'string?'], renameArtifact);
  handle('artifacts:move', ['path', 'path', 'string?'], moveArtifact);
  handle('artifacts:move-area', ['path', 'string', 'string?'], moveToArea);

  handle('history:list', ['path'], listHistory);
  handle('history:read', ['path', 'string'], readHistory);
  handle('history:restore', ['path', 'string', 'string?'], restoreVersion);

  handle('export:pdf', ['path', 'string'], (path, html) => exportDocument('pdf', path, html, getWindow()));
  handle('export:html', ['path', 'string'], (path, html) => exportDocument('html', path, html, getWindow()));

  handle('workspace:current', [], currentWorkspace);
  handle('workspace:choose', [], async () => {
    const options: OpenDialogOptions = {
      title: 'Choose a Markdown folder',
      buttonLabel: 'Use This Folder',
      properties: ['openDirectory', 'createDirectory'],
    };
    const window = getWindow();
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    const root = selectWorkspace(result.filePaths[0]);
    watch();
    return root;
  });
  handle('workspace:create-starter', [], () => {
    const root = createStarterWorkspace();
    watch();
    return root;
  });

  handle('git:rules:get', [], getArtifactGitRules);
  handle('git:rules:set', ['array'], setArtifactGitRules);
  handle('git:commit-summary', ['path', 'string'], commitSummary);
  handle('git:commit-diff', ['path', 'string'], commitDiff);

  handle('shell:reveal', ['path'], reveal);
  handle('shell:open-external', ['string'], openExternal);
  handle('shell:open-in-editor', ['path'], openInEditor);
  handle('system:accent', [], readOmarchyAccent);
  handle('notifications:show', ['object'], (options) => notify(options, getWindow()));
  handle('window:close', [], () => getWindow()?.close());
}
