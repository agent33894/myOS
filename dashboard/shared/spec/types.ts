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

export const ARTIFACT_TYPES: Readonly<Record<ArtifactType, TypeSpec>> = {
  todo: {
    dir: 'todos',
    statuses: [TodoStatus.PENDING, TodoStatus.IN_PROGRESS, TodoStatus.DONE, TodoStatus.CANCELLED],
    defaultStatus: TodoStatus.PENDING,
    domain: Domain.WORK,
  },
  memo: { dir: 'memos', statuses: [...NOTE, DONE], defaultStatus: ACTIVE, domain: Domain.WORK },
  project: { dir: 'projects', statuses: [...NOTE, DONE, CANCELLED], defaultStatus: ACTIVE, domain: Domain.WORK },
  inbox: { dir: 'inbox', statuses: NOTE, defaultStatus: DRAFT, domain: null },
  decision: { dir: 'decisions', statuses: [ACTIVE, SUPERSEDED, ARCHIVED], defaultStatus: ACTIVE, domain: Domain.WORK },
  meeting: { dir: 'meetings', statuses: NOTE, defaultStatus: ACTIVE, domain: Domain.WORK },
  research: { dir: 'topics', statuses: NOTE, defaultStatus: ACTIVE, domain: Domain.RESEARCH },
  query: { dir: 'queries', statuses: REFERENCE, defaultStatus: ACTIVE, domain: Domain.WORK },
  snippet: { dir: 'code', statuses: REFERENCE, defaultStatus: ACTIVE, domain: Domain.WORK },
  prompt: { dir: 'prompts', statuses: NOTE, defaultStatus: ACTIVE, domain: Domain.WORK },
  development: { dir: 'development', statuses: [...NOTE, DONE], defaultStatus: ACTIVE, domain: Domain.WORK },
};

const TYPES = Object.keys(ARTIFACT_TYPES) as ArtifactType[];
const DOMAINS = Object.values(Domain);

export function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === 'string' && (TYPES as string[]).includes(value);
}

export function isDomain(value: unknown): value is Domain {
  return typeof value === 'string' && (DOMAINS as string[]).includes(value);
}

export function statusesFor(type: ArtifactType): readonly Status[] {
  return ARTIFACT_TYPES[type].statuses;
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
