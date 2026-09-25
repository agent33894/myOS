import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import type { IpcEvent, IpcEventMap } from '../../shared/ipc/contracts';
import { attachAsset } from '../documents/assets';
import { capture, dailyNotePath } from '../documents/daily';
import {
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  listFiles,
  listHistory,
  moveFolder,
  moveNote,
  readHistory,
  readNote,
  restoreNote,
  restoreText,
  restoreVersion,
  saveNote,
} from '../documents/files';
import { appendToFile, editTask, setTaskDateOn, toggleTask } from '../documents/tasks';
import { exportDocument, revealExport } from '../export/export';
import { gitCommit, gitCommitDiff, gitCommitSummary, gitDiff, gitInit, gitLog, gitPull, gitPush, gitShow, gitStatus } from '../git/git';
import { getSettings, setSettings } from '../settings/settings';
import { openExternal, openInEditor, reveal } from '../shell/shell';
import { readOmarchyAccent } from '../utils/omarchy-theme';
import { watchWorkspace } from '../watch/watcher';
import { createStarterWorkspace, currentWorkspace, isObsidianVault, selectWorkspace } from '../workspace/root';
import { handle } from './handle';

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  const send = <E extends IpcEvent>(event: E, payload: IpcEventMap[E]) => getWindow()?.webContents.send(event, payload);
  const watch = () => watchWorkspace(currentWorkspace(), (change) => send('files:changed', change));
  watch();

  handle('files:list', [], listFiles);
  handle('files:read', ['path'], readNote);
  handle('files:create', ['path', 'string?'], createNote);
  handle('files:save', ['path', 'object', 'string'], saveNote);
  handle('files:move', ['path', 'path', 'string?'], moveNote);
  handle('files:delete', ['path', 'string?'], deleteNote);
  handle('files:restore', ['object'], restoreNote);
  handle('files:attach-asset', ['path'], attachAsset);
  handle('folders:create', ['path'], createFolder);
  handle('folders:move', ['path', 'path'], moveFolder);
  handle('folders:delete', ['path'], deleteFolder);

  handle('tasks:toggle', ['object', 'string?'], (task, expectRev) => toggleTask(task, expectRev));
  handle('tasks:set-date', ['object', 'string', 'string|null', 'string?'], setTaskDateOn);
  handle('tasks:edit', ['object', 'string', 'string?'], editTask);
  handle('tasks:append', ['path', 'string', 'string?'], appendToFile);
  handle('daily:path', ['string?'], dailyNotePath);
  handle('daily:capture', ['string', 'path?'], capture);

  handle('settings:get', [], getSettings);
  handle('settings:set', ['object'], setSettings);

  handle('git:status', [], gitStatus);
  handle('git:commit', ['string', 'strings?'], gitCommit);
  handle('git:log', ['path?', 'count?'], gitLog);
  handle('git:show', ['path', 'string'], gitShow);
  handle('git:diff', ['path?'], gitDiff);
  handle('git:commit-diff', ['string'], gitCommitDiff);
  handle('git:commit-summary', ['string'], gitCommitSummary);
  handle('git:restore', ['path', 'string', 'string?', 'path?'], async (path, hash, expectRev, from) => restoreText(path, await gitShow(from ?? path, hash), expectRev));
  handle('git:init', [], gitInit);
  handle('git:pull', [], gitPull);
  handle('git:push', [], gitPush);

  handle('history:list', ['path'], listHistory);
  handle('history:read', ['path', 'string'], readHistory);
  handle('history:restore', ['path', 'string', 'string?'], restoreVersion);

  handle('export:pdf', ['path', 'string'], (path, html) => exportDocument('pdf', path, html, getWindow()));
  handle('export:html', ['path', 'string'], (path, html) => exportDocument('html', path, html, getWindow()));
  handle('export:reveal', ['string'], (savedPath) => revealExport(savedPath));

  handle('workspace:current', [], currentWorkspace);
  handle('workspace:choose', [], async () => {
    const options: OpenDialogOptions = {
      title: 'Open a folder of Markdown files',
      buttonLabel: 'Open Folder',
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

  handle('workspace:obsidian', [], isObsidianVault);
  handle('shell:reveal', ['path'], reveal);
  handle('shell:open-external', ['string'], openExternal);
  handle('shell:open-in-editor', ['path'], openInEditor);
  handle('system:accent', [], readOmarchyAccent);
  handle('window:close', [], () => getWindow()?.close());
}
