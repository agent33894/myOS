import type { Artifact, ArtifactCreateDraft } from '../types';

export interface ArtifactAssetAttachmentRequest {
  artifactId?: string;
  artifactFilePath?: string;
  sourcePath?: string;
}

export interface ArtifactAssetAttachment {
  fileName: string;
  originalName: string;
  relativePath: string;
  myosUrl: string;
  isImage: boolean;
  size: number;
  insertMarkdown: string;
}

export interface ArtifactAssetAttachmentResult {
  canceled: boolean;
  asset?: ArtifactAssetAttachment;
}

export type ArtifactGitRuleMode = 'exclude' | 'include';

export interface ArtifactGitRule {
  mode: ArtifactGitRuleMode;
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

interface IpcOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IpcInvokeMap {
  'artifacts:read-all-metadata': { args: []; result: Artifact[] };
  'artifacts:read': { args: [filePath: string]; result: Artifact | null };
  'artifacts:read-content': { args: [filePath: string]; result: string };
  'artifacts:create': { args: [draft: ArtifactCreateDraft]; result: Artifact };
  'artifacts:update': { args: [filePath: string, artifact: Artifact]; result: Artifact };
  'artifacts:delete': { args: [filePath: string]; result: void };
  'artifacts:promote-inbox': { args: [filePath: string, artifact: Artifact]; result: Artifact };
  'artifacts:attach-local-asset': {
    args: [request?: ArtifactAssetAttachmentRequest];
    result: ArtifactAssetAttachmentResult;
  };
  'git:artifact-rules:get': { args: []; result: ArtifactGitRulesConfig };
  'git:artifact-rules:set': { args: [rules: ArtifactGitRule[]]; result: ArtifactGitRulesConfig };
  'git:commit-summary': {
    args: [projectPath: string, commitHash: string];
    result: IpcOperationResult<CommitSummary>;
  };
  'git:commit-diff': {
    args: [projectPath: string, commitHash: string];
    result: IpcOperationResult<string>;
  };
  'shell:show-in-folder': { args: [itemPath: string]; result: boolean };
  'shell:open-external-url': { args: [url: string]; result: boolean };
  'shell:open-artifact-file': { args: [filePath: string]; result: void };
  'system:get-accent': { args: []; result: string | null };
  'notifications:show': { args: [options: { title: string; body: string }]; result: boolean };
  'vault:set-path': { args: [path: string]; result: boolean };
  'vault:get-path': { args: []; result: string };
  'vault:choose-folder': { args: []; result: string | null };
  'vault:create-default': { args: []; result: string };
}

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcInvokeArgs<K extends IpcInvokeChannel> = IpcInvokeMap[K]['args'];
export type IpcInvokeResult<K extends IpcInvokeChannel> = IpcInvokeMap[K]['result'];

export const IPC_INVOKE_CHANNELS = [
  'artifacts:read-all-metadata',
  'artifacts:read',
  'artifacts:read-content',
  'artifacts:create',
  'artifacts:update',
  'artifacts:delete',
  'artifacts:promote-inbox',
  'artifacts:attach-local-asset',
  'git:artifact-rules:get',
  'git:artifact-rules:set',
  'git:commit-summary',
  'git:commit-diff',
  'shell:show-in-folder',
  'shell:open-external-url',
  'shell:open-artifact-file',
  'system:get-accent',
  'notifications:show',
  'vault:set-path',
  'vault:get-path',
  'vault:choose-folder',
  'vault:create-default',
] as const satisfies readonly IpcInvokeChannel[];

export interface IpcEventMap {
  'file-changed': {
    event: 'created' | 'updated' | 'deleted';
    data: { filePath: string };
  };
  'quick-capture:open': Record<string, never>;
  'system:accent-changed': { accent: string | null };
}
