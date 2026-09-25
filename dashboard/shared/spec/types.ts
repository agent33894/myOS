import { ArtifactStatus, ArtifactType, Domain, TodoStatus } from '../types';
import type { ArtifactFields } from '../types';

type Status = ArtifactFields['status'];

interface TypeSpec {
  /** Storage folder: `<domain>/<dir>/`, or `<dir>/` for types without a domain. */
  dir: string;
  statuses: readonly Status[];
  defaultStatus: Status;
  /** Domain for new files of this type; null when the type carries none. */
  domain: Domain | null;
}

const { DRAFT, ACTIVE, ARCHIVED, DONE, CANCELLED, SUPERSEDED } = ArtifactStatus;
const NOTE = [DRAFT, ACTIVE, ARCHIVED] as const;
const REFERENCE = [ACTIVE, ARCHIVED] as const;
// Without a chosen area (the renderer sends the user's default), new files land here.
const FALLBACK = Domain.PERSONAL;

/** Domains as the UI names them: Areas. */
export const AREAS: Readonly<Record<Domain, string>> = {
  [Domain.WORK]: 'Work',
  [Domain.PERSONAL]: 'Personal',
  [Domain.RESEARCH]: 'Learning',
  [Domain.CREATIVE]: 'Creative',
};

export const ARTIFACT_TYPES: Readonly<Record<ArtifactType, TypeSpec>> = {
  todo: {
    dir: 'todos',
    statuses: [TodoStatus.PENDING, TodoStatus.IN_PROGRESS, TodoStatus.DONE, TodoStatus.CANCELLED, TodoStatus.SOMEDAY],
    defaultStatus: TodoStatus.PENDING,
    domain: FALLBACK,
  },
  memo: { dir: 'memos', statuses: [...NOTE, DONE], defaultStatus: ACTIVE, domain: FALLBACK },
  project: { dir: 'projects', statuses: [...NOTE, DONE, CANCELLED], defaultStatus: ACTIVE, domain: FALLBACK },
  inbox: { dir: 'inbox', statuses: NOTE, defaultStatus: DRAFT, domain: null },
  decision: { dir: 'decisions', statuses: [ACTIVE, SUPERSEDED, ARCHIVED], defaultStatus: ACTIVE, domain: FALLBACK },
  meeting: { dir: 'meetings', statuses: NOTE, defaultStatus: ACTIVE, domain: FALLBACK },
  research: { dir: 'topics', statuses: NOTE, defaultStatus: ACTIVE, domain: Domain.RESEARCH },
  query: { dir: 'queries', statuses: REFERENCE, defaultStatus: ACTIVE, domain: FALLBACK },
  snippet: { dir: 'code', statuses: REFERENCE, defaultStatus: ACTIVE, domain: FALLBACK },
  prompt: { dir: 'prompts', statuses: NOTE, defaultStatus: ACTIVE, domain: FALLBACK },
  development: { dir: 'development', statuses: [...NOTE, DONE], defaultStatus: ACTIVE, domain: FALLBACK },
  // One page per day at `journal/<YYYY-MM-DD>.md`.
  journal: { dir: 'journal', statuses: REFERENCE, defaultStatus: ACTIVE, domain: null },
  template: { dir: 'templates', statuses: REFERENCE, defaultStatus: ACTIVE, domain: null },
};

const TYPES = Object.keys(ARTIFACT_TYPES) as ArtifactType[];
const DOMAINS = Object.values(Domain);

/** Terminal project statuses; 'completed' is a legacy alias found in older folders. */
export const PROJECT_CLOSED_STATUSES: ReadonlySet<string> = new Set(['done', 'cancelled', 'archived', 'completed']);

export function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === 'string' && (TYPES as string[]).includes(value);
}

export function isDomain(value: unknown): value is Domain {
  return typeof value === 'string' && (DOMAINS as string[]).includes(value);
}

export function defaultStatusFor(type: ArtifactType): Status {
  return ARTIFACT_TYPES[type].defaultStatus;
}

export function isStatusAllowed(type: ArtifactType, status: string): boolean {
  return (ARTIFACT_TYPES[type].statuses as readonly string[]).includes(status);
}

/** The domain a file of `type` carries, preferring `domain` when the type has one. */
export function domainFor(type: ArtifactType, domain?: Domain | null): Domain | undefined {
  const fallback = ARTIFACT_TYPES[type].domain;
  return fallback === null ? undefined : domain ?? fallback;
}

export function canonicalPath(id: string, type: ArtifactType, domain?: Domain | null): string {
  const { dir } = ARTIFACT_TYPES[type];
  const folder = domainFor(type, domain);
  return folder ? `${folder}/${dir}/${id}.md` : `${dir}/${id}.md`;
}

/** Untyped files take the type of the storage folder they sit in; anything else is a note. */
export function typeFromPath(relativePath: string): ArtifactType {
  const segments = relativePath.toLowerCase().split(/[\\/]/).slice(0, -1);
  return TYPES.find((type) => segments.includes(ARTIFACT_TYPES[type].dir)) ?? ArtifactType.MEMO;
}
