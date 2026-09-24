import type { Artifact, ArtifactDraft, ArtifactPatch, ArtifactSummary, ArtifactType } from '../types';

export type IpcErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'OUTSIDE_WORKSPACE' | 'INTERNAL';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: IpcErrorCode; message: string } };

/** Full-document write: frontmatter changes plus the whole body. */
export interface ArtifactSave {
  fields: ArtifactPatch;
  content: string;
}

/** Converting a file to another type, e.g. an Inbox capture into a task. */
export type ArtifactRetype = ArtifactPatch & { type: ArtifactType };

export interface AssetAttachmentRequest {
  artifactId?: string;
  artifactFilePath?: string;
}

export interface AssetAttachment {
  originalName: string;
  relativePath: string;
  insertMarkdown: string;
}

export type AssetAttachmentResult = { canceled: true } | { canceled: false; asset: AssetAttachment };

export interface ArtifactGitRule {
  mode: 'exclude' | 'include';
  pattern: string;
}

export interface ArtifactGitRulesConfig {
  gitignorePath: string;
  artifactRootPrefix: string;
  rules: ArtifactGitRule[];
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
 * Every invoke channel: arguments and success value. Paths are
 * workspace-relative. Writes that take `expectRev` fail with CONFLICT when the
 * file changed since that revision was read.
 */
export interface IpcInvokeMap {
  'artifacts:list': { args: []; value: ArtifactSummary[] };
  'artifacts:read': { args: [path: string]; value: Artifact };
  'artifacts:create': { args: [draft: ArtifactDraft]; value: Artifact };
  'artifacts:save': { args: [path: string, change: ArtifactSave, expectRev: string]; value: Artifact };
  'artifacts:patch': { args: [path: string, fields: ArtifactPatch, expectRev?: string]; value: Artifact };
  'artifacts:retype': { args: [path: string, change: ArtifactRetype, expectRev?: string]; value: Artifact };
  'artifacts:delete': { args: [path: string, expectRev?: string]; value: Artifact };
  'artifacts:restore': { args: [snapshot: Artifact]; value: Artifact };
  'artifacts:attach-asset': { args: [request: AssetAttachmentRequest]; value: AssetAttachmentResult };
  'workspace:current': { args: []; value: string | null };
  'workspace:choose': { args: []; value: string | null };
  'workspace:create-starter': { args: []; value: string };
  'git:rules:get': { args: []; value: ArtifactGitRulesConfig };
  'git:rules:set': { args: [rules: ArtifactGitRule[]]; value: ArtifactGitRulesConfig };
  'git:commit-summary': { args: [repoPath: string, hash: string]; value: CommitSummary };
  'git:commit-diff': { args: [repoPath: string, hash: string]; value: string };
  'shell:reveal': { args: [path: string]; value: void };
  'shell:open-external': { args: [url: string]; value: void };
  'shell:open-in-editor': { args: [path: string]; value: void };
  'system:accent': { args: []; value: string | null };
  'notifications:show': { args: [options: { title: string; body: string }]; value: boolean };
  'window:close': { args: []; value: void };
}

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcInvokeArgs<K extends IpcInvokeChannel> = IpcInvokeMap[K]['args'];
export type IpcValue<K extends IpcInvokeChannel> = IpcInvokeMap[K]['value'];

/** Runtime allow-list for the preload bridge; `satisfies` keeps it equal to the map. */
export const IPC_INVOKE_CHANNELS = Object.keys({
  'artifacts:list': 1,
  'artifacts:read': 1,
  'artifacts:create': 1,
  'artifacts:save': 1,
  'artifacts:patch': 1,
  'artifacts:retype': 1,
  'artifacts:delete': 1,
  'artifacts:restore': 1,
  'artifacts:attach-asset': 1,
  'workspace:current': 1,
  'workspace:choose': 1,
  'workspace:create-starter': 1,
  'git:rules:get': 1,
  'git:rules:set': 1,
  'git:commit-summary': 1,
  'git:commit-diff': 1,
  'shell:reveal': 1,
  'shell:open-external': 1,
  'shell:open-in-editor': 1,
  'system:accent': 1,
  'notifications:show': 1,
  'window:close': 1,
} satisfies Record<IpcInvokeChannel, 1>) as IpcInvokeChannel[];

export interface IpcEventMap {
  'artifacts:changed': { path: string; kind: 'created' | 'updated' | 'deleted'; rev?: string };
  'capture:open': void;
  'system:accent-changed': { accent: string | null };
}

export type IpcEvent = keyof IpcEventMap;

export const IPC_EVENTS = Object.keys({
  'artifacts:changed': 1,
  'capture:open': 1,
  'system:accent-changed': 1,
} satisfies Record<IpcEvent, 1>) as IpcEvent[];

/** What the preload exposes as `window.electronAPI`. */
export interface ElectronBridge {
  invoke<K extends IpcInvokeChannel>(channel: K, ...args: IpcInvokeArgs<K>): Promise<Result<IpcValue<K>>>;
  on<E extends IpcEvent>(event: E, callback: (payload: IpcEventMap[E]) => void): () => void;
}
