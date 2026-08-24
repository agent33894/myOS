import {
  ArtifactStatus,
  ArtifactType,
  Domain,
  TodoStatus,
} from '../types';

export type ArtifactTypeValue = typeof ArtifactType[keyof typeof ArtifactType];
export type DomainValue = typeof Domain[keyof typeof Domain];
export type ArtifactStatusValue =
  | typeof ArtifactStatus[keyof typeof ArtifactStatus]
  | typeof TodoStatus[keyof typeof TodoStatus];

export type ArtifactFieldName =
  | 'id'
  | 'title'
  | 'type'
  | 'domain'
  | 'tags'
  | 'project'
  | 'created'
  | 'updated'
  | 'status'
  | 'related'
  | 'content'
  | 'priority'
  | 'due'
  | 'parentId'
  | 'deferDate'
  | 'estimatedMinutes'
  | 'sequential'
  | 'flagged'
  | 'completedDate'
  | 'repeatRule'
  | 'analysisData'
  | 'sources'
  | 'assetManifest'
  | 'localPath'
  | 'repoUrl'
  | 'isExternalProject'
  | 'language'
  | 'filePath';

export interface FieldRule {
  name: ArtifactFieldName;
  required: boolean;
}

export interface StatusRule {
  defaultStatus: ArtifactStatusValue;
  allowedStatuses: readonly ArtifactStatusValue[];
}

export interface StorageRule {
  domainDirs: Readonly<Record<DomainValue, string>>;
  typeDir: string;
  fixedDir?: string;
}

export interface ScaffoldRule {
  heading: string;
  required: boolean;
  placeholder?: string;
  minChars?: number;
}

export interface ArtifactSpec {
  type: ArtifactTypeValue;
  domainRequired: boolean;
  defaultDomain?: DomainValue;
  allowedDomains: readonly DomainValue[];
  fieldRules: readonly FieldRule[];
  statusRule: StatusRule;
  storageRule: StorageRule;
  scaffoldRules: readonly ScaffoldRule[];
}
