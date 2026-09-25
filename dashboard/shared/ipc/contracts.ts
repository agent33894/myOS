import type { Settings } from '../settings';
import type { Note, NoteSummary, PropertiesPatch } from '../spec';
import type { TaskDateField } from '../tasks';

export type IpcErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'OUTSIDE_WORKSPACE' | 'GIT' | 'INTERNAL';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: IpcErrorCode; message: string } };

/** Every folder and Markdown file under the open folder, skipping dot folders and node_modules. */
export interface FolderListing {
  /** Folder paths, parents before children; empty folders included. */
  folders: string[];
  notes: NoteSummary[];
}

/** A write from the editor: the body, property changes, or both. */
export interface NoteSave {
  content?: string;
  properties?: PropertiesPatch;
}

/** Which task an edit is for: the line and its exact text, as last read. Line 0 is a `type: todo` file. */
export interface TaskRef {
  path: string;
  line: number;
  raw: string;
}

/** One saved local copy of a file, from `history:list`. */
export interface VersionInfo {
  id: string;
  /** ISO timestamp. */
  savedAt: string;
  /** Bytes. */
  size: number;
}

export interface AssetAttachment {
  originalName: string;
  relativePath: string;
  insertMarkdown: string;
}

export type AssetAttachmentResult = { canceled: true } | { canceled: false; asset: AssetAttachment };

export type GitChange = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';

export interface GitFileStatus {
  /** Folder-relative path. */
  path: string;
  /** For a rename, the path it had. */
  from?: string;
  change: GitChange;
  /** Whether the change is staged. */
  staged: boolean;
}

export interface GitStatus {
  /** False when the folder is not inside a Git repository; the rest is then empty. */
  repo: boolean;
  /** Null on a detached HEAD. */
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export interface GitCommit {
  hash: string;
  /** ISO date. */
  date: string;
  author: string;
  subject: string;
}

export interface CommitFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface CommitSummary {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: CommitFileStat[];
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Every invoke channel: arguments and success value. Paths are relative to
 * the open folder. Writes that take `expectRev` fail with CONFLICT when the
 * file changed since that revision was read.
 */
export interface IpcInvokeMap {
  'files:list': { args: []; value: FolderListing };
  'files:read': { args: [path: string]; value: Note };
  /** A new Markdown file; CONFLICT when the path is taken. Missing folders are made. */
  'files:create': { args: [path: string, content?: string]; value: Note };
  'files:save': { args: [path: string, change: NoteSave, expectRev: string]; value: Note };
  /** Move or rename a file, bytes unchanged; the target must not exist. History follows. */
  'files:move': { args: [path: string, to: string, expectRev?: string]; value: Note };
  /** Keep a local copy, then remove the file; returns it for `files:restore`. */
  'files:delete': { args: [path: string, expectRev?: string]; value: Note };
  /** Put a deleted file back, byte for byte, at its path; CONFLICT when something is there now. */
  'files:restore': { args: [snapshot: Note]; value: Note };
  'files:attach-asset': { args: [notePath: string]; value: AssetAttachmentResult };
  'folders:create': { args: [path: string]; value: string };
  /** Move or rename a folder and everything in it; the target must not exist. Returns the new path. */
  'folders:move': { args: [path: string, to: string]; value: string };
  /** Keep a local copy of every Markdown file inside, then remove the folder. Returns the removed note paths. */
  'folders:delete': { args: [path: string]; value: string[] };
  /** Check or uncheck; a repeating task gets its next occurrence on a new line above. */
  'tasks:toggle': { args: [task: TaskRef, expectRev?: string]; value: Note };
  /** Set or (null) clear a date token on the task line. */
  'tasks:set-date': { args: [task: TaskRef, field: TaskDateField, date: string | null, expectRev?: string]; value: Note };
  /** Replace the text after the checkbox. */
  'tasks:edit': { args: [task: TaskRef, text: string, expectRev?: string]; value: Note };
  /** Add a line at the end of a file, or of a heading's section; the file is made when missing. */
  'tasks:append': { args: [path: string, line: string, heading?: string]; value: Note };
  /** The daily note path for a date (YYYY-MM-DD; today when omitted). The file may not exist yet. */
  'daily:path': { args: [date?: string]; value: string };
  /** Append a capture line to today's daily note or `target`; returns the file written. */
  'daily:capture': { args: [text: string, target?: string]; value: Note };
  'settings:get': { args: []; value: Settings };
  'settings:set': { args: [patch: Partial<Settings>]; value: Settings };
  'git:status': { args: []; value: GitStatus };
  /** Commit `paths` (all changes in the folder when omitted) with `message`; returns the new commit hash. */
  'git:commit': { args: [message: string, paths?: string[]]; value: string };
  /** Commits touching `path` (or the folder), newest first. */
  'git:log': { args: [path?: string, limit?: number]; value: GitCommit[] };
  /** A file's text at a commit. */
  'git:show': { args: [path: string, hash: string]; value: string };
  /** Unified diff of the working tree against HEAD, for one file or the folder. */
  'git:diff': { args: [path?: string]; value: string };
  'git:commit-diff': { args: [hash: string]; value: string };
  'git:commit-summary': { args: [hash: string]; value: CommitSummary };
  /** `git pull --rebase --autostash`; returns Git's output. */
  'git:pull': { args: []; value: string };
  'git:push': { args: []; value: string };
  /** Local copies of a file, newest first. */
  'history:list': { args: [path: string]; value: VersionInfo[] };
  'history:read': { args: [path: string, id: string]; value: string };
  /** Write a local copy back over the file, keeping the current text as a copy first. */
  'history:restore': { args: [path: string, id: string, expectRev?: string]; value: Note };
  /** Ask where to save, then write the file; null when the user cancels. */
  'export:pdf': { args: [path: string, html: string]; value: string | null };
  'export:html': { args: [path: string, html: string]; value: string | null };
  /** Show a file this session exported (only those) in the system file manager. */
  'export:reveal': { args: [savedPath: string]; value: void };
  'workspace:current': { args: []; value: string | null };
  'workspace:choose': { args: []; value: string | null };
  /** Create (or reuse) `~/Documents/myOS Next` with a welcome note and select it. */
  'workspace:create-starter': { args: []; value: string };
  'shell:reveal': { args: [path: string]; value: void };
  'shell:open-external': { args: [url: string]; value: void };
  'shell:open-in-editor': { args: [path: string]; value: void };
  'system:accent': { args: []; value: string | null };
  'window:close': { args: []; value: void };
}

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcInvokeArgs<K extends IpcInvokeChannel> = IpcInvokeMap[K]['args'];
export type IpcValue<K extends IpcInvokeChannel> = IpcInvokeMap[K]['value'];

/** Runtime allow-list for the preload bridge; `satisfies` keeps it equal to the map. */
export const IPC_INVOKE_CHANNELS = Object.keys({
  'files:list': 1,
  'files:read': 1,
  'files:create': 1,
  'files:save': 1,
  'files:move': 1,
  'files:delete': 1,
  'files:restore': 1,
  'files:attach-asset': 1,
  'folders:create': 1,
  'folders:move': 1,
  'folders:delete': 1,
  'tasks:toggle': 1,
  'tasks:set-date': 1,
  'tasks:edit': 1,
  'tasks:append': 1,
  'daily:path': 1,
  'daily:capture': 1,
  'settings:get': 1,
  'settings:set': 1,
  'git:status': 1,
  'git:commit': 1,
  'git:log': 1,
  'git:show': 1,
  'git:diff': 1,
  'git:commit-diff': 1,
  'git:commit-summary': 1,
  'git:pull': 1,
  'git:push': 1,
  'history:list': 1,
  'history:read': 1,
  'history:restore': 1,
  'export:pdf': 1,
  'export:html': 1,
  'export:reveal': 1,
  'workspace:current': 1,
  'workspace:choose': 1,
  'workspace:create-starter': 1,
  'shell:reveal': 1,
  'shell:open-external': 1,
  'shell:open-in-editor': 1,
  'system:accent': 1,
  'window:close': 1,
} satisfies Record<IpcInvokeChannel, 1>) as IpcInvokeChannel[];

export interface IpcEventMap {
  /** A file or folder changed on disk (debounced). Files carry their new `rev`. */
  'files:changed': { path: string; entry: 'file' | 'folder'; kind: 'created' | 'updated' | 'deleted'; rev?: string };
  /** `myos-next --capture`: open quick capture. */
  'app:capture': void;
  /** `myos-next open <path>` or a `myos-next://open?path=` link: show that file. */
  'app:open-file': { path: string };
  'system:accent-changed': { accent: string | null };
}

export type IpcEvent = keyof IpcEventMap;

export const IPC_EVENTS = Object.keys({
  'files:changed': 1,
  'app:capture': 1,
  'app:open-file': 1,
  'system:accent-changed': 1,
} satisfies Record<IpcEvent, 1>) as IpcEvent[];

/** What the preload exposes as `window.electronAPI`. */
export interface ElectronBridge {
  invoke<K extends IpcInvokeChannel>(channel: K, ...args: IpcInvokeArgs<K>): Promise<Result<IpcValue<K>>>;
  on<E extends IpcEvent>(event: E, callback: (payload: IpcEventMap[E]) => void): () => void;
}
