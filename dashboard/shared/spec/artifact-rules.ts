import { ArtifactStatus, ArtifactType, Domain, TodoStatus } from '../types';
import type { ArtifactAssetManifestEntry } from '../types';
import type {
  ArtifactSpec,
  ArtifactStatusValue,
  ArtifactTypeValue,
  DomainValue,
  FieldRule,
} from './artifact-spec';
import { buildScaffoldFromSpec, type BuildScaffoldOptions } from './artifact-scaffold';

interface NormalizeDraftOptions {
  now: string;
  generateId: (title?: string) => string;
  strictStatus?: boolean;
}

interface NormalizeDraftResult {
  artifact: SpecArtifact;
  warnings: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SpecArtifact {
  id: string;
  title: string;
  type: ArtifactTypeValue;
  domain?: DomainValue;
  tags: string[];
  project?: string;
  created: string;
  updated: string;
  status: string;
  related: string[];
  filePath: string;
  content: string;
  priority?: string;
  due?: string;
  parentId?: string;
  deferDate?: string;
  estimatedMinutes?: number;
  sequential?: boolean;
  flagged?: boolean;
  completedDate?: string;
  repeatRule?: string;
  localPath?: string;
  repoUrl?: string;
  isExternalProject?: boolean;
  language?: string;
  analysisData?: unknown;
  sources?: string[];
  assetManifest?: ArtifactAssetManifestEntry[];
  order?: number;
}

export interface ArtifactDraftInput
  extends Partial<Omit<SpecArtifact, 'filePath' | 'created' | 'updated'>> {
  type: ArtifactTypeValue;
  created?: string;
  updated?: string;
}

const DOMAIN_DIRS: Readonly<Record<DomainValue, string>> = Object.freeze({
  work: 'work',
  personal: 'personal',
  research: 'research',
  creative: 'creative',
});

const COMMON_FIELDS: readonly FieldRule[] = Object.freeze([
  { name: 'id', required: true },
  { name: 'title', required: true },
  { name: 'type', required: true },
  { name: 'tags', required: true },
  { name: 'status', required: true },
  { name: 'related', required: true },
  { name: 'created', required: true },
  { name: 'updated', required: true },
  { name: 'content', required: true },
  { name: 'filePath', required: true },
]);

const TODO_SCaffold = Object.freeze([
  { heading: '## Task', required: true, placeholder: '[Clear description of what needs to be done]' },
  { heading: '## Context', required: false, placeholder: '[Background and rationale]' },
  { heading: '## Acceptance Criteria', required: false, placeholder: '- [ ] [Criterion]' },
  { heading: '## Notes', required: false, placeholder: '[Additional context]' },
]);

export const ARTIFACT_SPECS: Readonly<Record<ArtifactTypeValue, ArtifactSpec>> = Object.freeze({
  todo: {
    type: ArtifactType.TODO,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.PERSONAL, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: TodoStatus.PENDING,
      allowedStatuses: [
        TodoStatus.PENDING,
        TodoStatus.IN_PROGRESS,
        TodoStatus.DONE,
        TodoStatus.CANCELLED,
      ],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'todos',
    },
    scaffoldRules: TODO_SCaffold,
  },
  query: {
    type: ArtifactType.QUERY,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.RESEARCH],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'queries',
    },
    scaffoldRules: [
      { heading: '## Context', required: false, placeholder: '[What question this answers]' },
      { heading: '## The Query', required: true, placeholder: '```sql\n-- query\n```' },
      { heading: '## Notes', required: false, placeholder: '[Usage notes]' },
    ],
  },
  snippet: {
    type: ArtifactType.SNIPPET,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.PERSONAL, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'code',
    },
    scaffoldRules: [
      { heading: '## Context', required: false, placeholder: '[Problem this solves]' },
      { heading: '## The Code', required: true, placeholder: '```ts\n// code\n```' },
      { heading: '## Usage', required: false, placeholder: '[How to use this snippet]' },
    ],
  },
  decision: {
    type: ArtifactType.DECISION,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.PERSONAL, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.ACTIVE, ArtifactStatus.SUPERSEDED, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'decisions',
    },
    scaffoldRules: [
      { heading: '## Context', required: true, placeholder: '[What decision needed to be made]' },
      { heading: '## Decision', required: true, placeholder: '[Decision statement]' },
      { heading: '## Rationale', required: false, placeholder: '[Why this option was chosen]' },
      { heading: '## Consequences', required: false, placeholder: '[Follow-on impacts]' },
    ],
  },
  meeting: {
    type: ArtifactType.MEETING,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.DRAFT, ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'meetings',
    },
    scaffoldRules: [
      { heading: '## Meeting Details', required: true, placeholder: '- Date:\n- Participants:' },
      { heading: '## Discussion Points', required: true, placeholder: '[Key discussion notes]' },
      { heading: '## Action Items', required: false, placeholder: '- [ ] [Owner]: [Action]' },
    ],
  },
  memo: {
    type: ArtifactType.MEMO,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.PERSONAL, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [
        ArtifactStatus.DRAFT,
        ArtifactStatus.ACTIVE,
        ArtifactStatus.ARCHIVED,
        ArtifactStatus.DONE,
      ],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'memos',
    },
    scaffoldRules: [
      { heading: '## Purpose', required: false, placeholder: '[What this memo covers]' },
      { heading: '## Summary', required: false, placeholder: '[Key summary]' },
      { heading: '## Main Content', required: true, placeholder: '[Detailed content]' },
    ],
  },
  research: {
    type: ArtifactType.RESEARCH,
    domainRequired: true,
    defaultDomain: Domain.RESEARCH,
    allowedDomains: [Domain.RESEARCH, Domain.WORK],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.DRAFT, ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'topics',
    },
    scaffoldRules: [
      { heading: '## Research Question', required: true, placeholder: '[Question being explored]' },
      { heading: '## Key Findings', required: true, placeholder: '[Top findings]' },
      {
        heading: '## Data Visualization',
        required: false,
        placeholder: '```chart\n{\n  "type": "line",\n  "title": "Key Metric Trend",\n  "data": [{"label":"A","value":1}],\n  "xKey": "label",\n  "series": [{"key":"value","label":"Value"}],\n  "height": 300\n}\n```\n\n[If no meaningful quantitative data exists, explain why no chart is included.]',
      },
      { heading: '## Sources', required: false, placeholder: '- [Source Name](https://example.com)' },
      { heading: '## Next Steps', required: false, placeholder: '[Follow-up work]' },
    ],
  },
  project: {
    type: ArtifactType.PROJECT,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.PERSONAL, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [
        ArtifactStatus.DRAFT,
        ArtifactStatus.ACTIVE,
        ArtifactStatus.ARCHIVED,
        ArtifactStatus.DONE,
        ArtifactStatus.CANCELLED,
      ],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'projects',
    },
    scaffoldRules: [
      {
        heading: '## Intent',
        required: true,
        placeholder: '[What are you trying to change or make true?]',
      },
      { heading: '## Outcomes', required: false, placeholder: '- [Observable result]' },
      { heading: '## Rationale', required: false, placeholder: '[Why is this worth doing now?]' },
    ],
  },
  prompt: {
    type: ArtifactType.PROMPT,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK, Domain.RESEARCH, Domain.CREATIVE],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [ArtifactStatus.DRAFT, ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'prompts',
    },
    scaffoldRules: [
      { heading: '## Prompt', required: true, placeholder: '[Prompt text]' },
      { heading: '## Variables', required: false, placeholder: '- {{variable_name}}: [description]' },
      { heading: '## Notes', required: false, placeholder: '[Usage guidance]' },
    ],
  },
  development: {
    type: ArtifactType.DEVELOPMENT,
    domainRequired: true,
    defaultDomain: Domain.WORK,
    allowedDomains: [Domain.WORK],
    fieldRules: [...COMMON_FIELDS, { name: 'domain', required: true }],
    statusRule: {
      defaultStatus: ArtifactStatus.ACTIVE,
      allowedStatuses: [
        ArtifactStatus.DRAFT,
        ArtifactStatus.ACTIVE,
        ArtifactStatus.ARCHIVED,
        ArtifactStatus.DONE,
      ],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'development',
    },
    scaffoldRules: [
      { heading: '## Overview', required: true, placeholder: '[What changed and why]' },
      { heading: '## Notes', required: false, placeholder: '[Implementation details]' },
    ],
  },
  inbox: {
    type: ArtifactType.INBOX,
    domainRequired: false,
    allowedDomains: [],
    fieldRules: COMMON_FIELDS,
    statusRule: {
      defaultStatus: ArtifactStatus.DRAFT,
      allowedStatuses: [ArtifactStatus.DRAFT, ArtifactStatus.ACTIVE, ArtifactStatus.ARCHIVED],
    },
    storageRule: {
      domainDirs: DOMAIN_DIRS,
      typeDir: 'inbox',
      fixedDir: 'inbox',
    },
    scaffoldRules: [],
  },
});

export const DOMAIN_DIRECTORY_MAP = DOMAIN_DIRS;
export const TYPE_DIRECTORY_MAP: Readonly<Record<ArtifactTypeValue, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(ARTIFACT_SPECS).map(([type, spec]) => [type, spec.storageRule.typeDir])
  ) as Record<ArtifactTypeValue, string>
);

export function getArtifactSpec(type: ArtifactTypeValue): ArtifactSpec {
  const spec = ARTIFACT_SPECS[type];
  if (!spec) {
    throw new Error(`Unsupported artifact type: ${type}`);
  }
  return spec;
}

export function getDefaultStatusForType(type: ArtifactTypeValue): ArtifactStatusValue {
  return getArtifactSpec(type).statusRule.defaultStatus;
}

export function getDefaultDomainForType(
  type: ArtifactTypeValue
): DomainValue | undefined {
  const spec = getArtifactSpec(type);
  return spec.domainRequired ? spec.defaultDomain || Domain.WORK : undefined;
}

export function getAllowedStatusesForType(
  type: ArtifactTypeValue
): readonly ArtifactStatusValue[] {
  return getArtifactSpec(type).statusRule.allowedStatuses;
}

export function isStatusAllowedForType(
  type: ArtifactTypeValue,
  status: string
): boolean {
  return getAllowedStatusesForType(type).includes(status as ArtifactStatusValue);
}

export function deriveArtifactPathFromSpec(args: {
  id: string;
  type: ArtifactTypeValue;
  domain?: DomainValue;
}): string {
  const { id, type, domain } = args;
  const spec = getArtifactSpec(type);
  const cleanId = id.trim();

  if (!cleanId) {
    throw new Error('Artifact id is required to derive a file path');
  }

  if (spec.storageRule.fixedDir) {
    return `${spec.storageRule.fixedDir}/${cleanId}.md`;
  }

  const effectiveDomain = domain || spec.defaultDomain || Domain.WORK;
  const domainDir = spec.storageRule.domainDirs[effectiveDomain];

  if (!domainDir) {
    throw new Error(`No storage directory configured for domain: ${effectiveDomain}`);
  }

  return `${domainDir}/${spec.storageRule.typeDir}/${cleanId}.md`;
}

export function buildScaffoldForType(
  type: ArtifactTypeValue,
  options?: BuildScaffoldOptions
): string {
  return buildScaffoldFromSpec(getArtifactSpec(type), options);
}

function normalizeStatus(
  type: ArtifactTypeValue,
  status: unknown,
  strictStatus: boolean,
  warnings: string[]
): ArtifactStatusValue {
  const defaultStatus = getDefaultStatusForType(type);
  if (typeof status !== 'string' || !status.trim()) {
    return defaultStatus;
  }

  if (isStatusAllowedForType(type, status)) {
    return status as ArtifactStatusValue;
  }

  const message = `Invalid status "${status}" for type "${type}"`;
  if (strictStatus) {
    throw new Error(message);
  }

  warnings.push(`${message}. Falling back to "${defaultStatus}".`);
  return defaultStatus;
}

function normalizeDomain(
  spec: ArtifactSpec,
  domain: unknown,
  warnings: string[]
): DomainValue | undefined {
  if (!spec.domainRequired) {
    return undefined;
  }

  if (typeof domain === 'string' && spec.allowedDomains.includes(domain as DomainValue)) {
    return domain as DomainValue;
  }

  if (typeof domain === 'string' && domain.trim()) {
    warnings.push(
      `Invalid domain "${domain}" for type "${spec.type}". Falling back to "${spec.defaultDomain || Domain.WORK}".`
    );
  }

  return spec.defaultDomain || Domain.WORK;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const GENERIC_TITLE_VALUES = new Set([
  'untitled',
  'untitled capture',
  'untitled task',
  'note',
  'notes',
  'memo',
  'research',
  'draft',
]);

const TYPE_TITLE_MAP: Readonly<Record<ArtifactTypeValue, string>> = Object.freeze({
  todo: 'Todo',
  query: 'Query',
  snippet: 'Snippet',
  decision: 'Decision',
  meeting: 'Meeting',
  memo: 'Memo',
  research: 'Research',
  project: 'Project',
  prompt: 'Prompt',
  development: 'Development Log',
  inbox: 'Inbox Capture',
});

function toHumanTitle(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sanitizeTitleCandidate(value: unknown, maxLength = 100): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return null;
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function isGenericTitle(title: string): boolean {
  const normalized = title.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    GENERIC_TITLE_VALUES.has(normalized) ||
    normalized.startsWith('untitled ')
  );
}

function extractContextTitleFromContent(content: unknown): string | null {
  if (typeof content !== 'string' || !content.trim()) {
    return null;
  }

  const lines = content.split('\n').map((line) => line.trim());
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('```')) continue;
    if (/^\[.*\]$/.test(line)) continue;

    const withoutMarkdown = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*]\s+/, '')
      .replace(/`+/g, '')
      .trim();

    if (!withoutMarkdown || withoutMarkdown.length < 3) {
      continue;
    }

    if (/^(task|context|notes|overview|summary|main content|details)$/i.test(withoutMarkdown)) {
      continue;
    }

    return sanitizeTitleCandidate(withoutMarkdown);
  }

  return null;
}

function buildContextualTitle(
  draft: ArtifactDraftInput,
  domain: DomainValue | undefined,
  tags: string[],
  now: string
): string {
  const typeTitle = TYPE_TITLE_MAP[draft.type] || toHumanTitle(draft.type);
  const contentTitle = extractContextTitleFromContent(draft.content);
  if (contentTitle && !isGenericTitle(contentTitle)) {
    return contentTitle;
  }

  const projectContext = sanitizeTitleCandidate(draft.project);
  if (projectContext) {
    return `${typeTitle}: ${projectContext}`;
  }

  const tagContext = tags
    .filter((tag) => tag && tag.toLowerCase() !== 'auto-generated')
    .slice(0, 2)
    .map(toHumanTitle)
    .join(' + ');
  if (tagContext) {
    return `${typeTitle}: ${tagContext}`;
  }

  if (domain) {
    return `${typeTitle} (${toHumanTitle(domain)})`;
  }

  return `${typeTitle} (${now})`;
}

function normalizeTitle(
  draft: ArtifactDraftInput,
  domain: DomainValue | undefined,
  tags: string[],
  now: string
): string {
  const providedTitle = sanitizeTitleCandidate(draft.title);
  if (providedTitle && !isGenericTitle(providedTitle)) {
    return providedTitle;
  }

  return buildContextualTitle(draft, domain, tags, now);
}

export function normalizeDraftFromSpec(
  draft: ArtifactDraftInput,
  options: NormalizeDraftOptions
): NormalizeDraftResult {
  const warnings: string[] = [];
  const spec = getArtifactSpec(draft.type);
  const domain = normalizeDomain(spec, draft.domain, warnings);
  const tags = toStringArray(draft.tags);
  const title = normalizeTitle(draft, domain, tags, options.now);
  const id = typeof draft.id === 'string' && draft.id.trim()
    ? draft.id.trim()
    : options.generateId(title);
  const status = normalizeStatus(
    draft.type,
    draft.status,
    options.strictStatus ?? true,
    warnings
  );
  const related = toStringArray(draft.related);
  const content =
    typeof draft.content === 'string'
      ? draft.content
      : buildScaffoldForType(draft.type, { title, fallbackContent: '' });

  const artifact: SpecArtifact = {
    id,
    title,
    type: draft.type,
    domain,
    tags,
    project:
      typeof draft.project === 'string' && draft.project.trim()
        ? draft.project.trim()
        : undefined,
    created: draft.created || options.now,
    updated: options.now,
    status,
    related,
    content,
    filePath: deriveArtifactPathFromSpec({
      id,
      type: draft.type,
      domain,
    }),
  };

  if (typeof draft.priority === 'string') artifact.priority = draft.priority;
  if (typeof draft.due === 'string') artifact.due = draft.due;
  if (typeof draft.parentId === 'string') artifact.parentId = draft.parentId;
  if (typeof draft.deferDate === 'string') artifact.deferDate = draft.deferDate;
  if (typeof draft.estimatedMinutes === 'number' && draft.estimatedMinutes > 0) {
    artifact.estimatedMinutes = draft.estimatedMinutes;
  }
  if (typeof draft.sequential === 'boolean') artifact.sequential = draft.sequential;
  if (typeof draft.flagged === 'boolean') artifact.flagged = draft.flagged;
  if (typeof draft.completedDate === 'string') artifact.completedDate = draft.completedDate;
  if (typeof draft.repeatRule === 'string') artifact.repeatRule = draft.repeatRule;
  if (typeof draft.analysisData !== 'undefined') artifact.analysisData = draft.analysisData;
  if (Array.isArray(draft.sources)) artifact.sources = draft.sources;
  if (Array.isArray(draft.assetManifest)) artifact.assetManifest = draft.assetManifest;
  if (typeof draft.localPath === 'string') artifact.localPath = draft.localPath;
  if (typeof draft.repoUrl === 'string') artifact.repoUrl = draft.repoUrl;
  if (typeof draft.isExternalProject === 'boolean') {
    artifact.isExternalProject = draft.isExternalProject;
  }
  if (typeof draft.language === 'string') artifact.language = draft.language;

  return { artifact, warnings };
}

function hasRequiredValue(artifact: SpecArtifact, field: FieldRule): boolean {
  const value = artifact[field.name as keyof SpecArtifact];
  if (Array.isArray(value)) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
}

export function validateArtifactAgainstSpec(
  artifact: SpecArtifact
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const spec = getArtifactSpec(artifact.type as ArtifactTypeValue);

  for (const field of spec.fieldRules) {
    if (!field.required) continue;
    if (!hasRequiredValue(artifact, field)) {
      errors.push(`Missing required field "${field.name}" for type "${artifact.type}"`);
    }
  }

  if (spec.domainRequired) {
    if (!artifact.domain) {
      errors.push(`Domain is required for type "${artifact.type}"`);
    } else if (!spec.allowedDomains.includes(artifact.domain as DomainValue)) {
      errors.push(`Domain "${artifact.domain}" is not allowed for type "${artifact.type}"`);
    }
  }

  if (!isStatusAllowedForType(artifact.type as ArtifactTypeValue, artifact.status)) {
    errors.push(`Status "${artifact.status}" is not allowed for type "${artifact.type}"`);
  }

  const expectedPath = deriveArtifactPathFromSpec({
    id: artifact.id,
    type: artifact.type as ArtifactTypeValue,
    domain: artifact.domain as DomainValue | undefined,
  });

  if (artifact.filePath && artifact.filePath !== expectedPath) {
    warnings.push(
      `Non-canonical file path "${artifact.filePath}" for type "${artifact.type}". Expected "${expectedPath}".`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
