import { formatLocalDate } from '../date';
import type { ArtifactFields } from '../types';

type FieldKind = 'string' | 'strings' | 'date' | 'number' | 'boolean';

/**
 * Every frontmatter key myOS understands, in the order it writes them.
 * Parsing, serialization, and the known-key set all come from this table;
 * any other key round-trips untouched through `Artifact.extra`.
 */
const ARTIFACT_FIELDS = {
  id: 'string',
  title: 'string',
  type: 'string',
  tags: 'strings',
  created: 'date',
  updated: 'date',
  status: 'string',
  related: 'strings',
  domain: 'string',
  project: 'string',
  priority: 'string',
  due: 'date',
  parentId: 'string',
  deferDate: 'date',
  estimatedMinutes: 'number',
  sequential: 'boolean',
  flagged: 'boolean',
  completedDate: 'date',
  repeatRule: 'string',
  localPath: 'string',
  repoUrl: 'string',
  isExternalProject: 'boolean',
  language: 'string',
  order: 'number',
  pinned: 'boolean',
  swatch: 'string',
} as const satisfies Record<keyof ArtifactFields, FieldKind>;

type ArtifactFieldName = keyof typeof ARTIFACT_FIELDS;

const FIELD_NAMES = Object.keys(ARTIFACT_FIELDS) as ArtifactFieldName[];

export function isFieldName(key: string): key is ArtifactFieldName {
  return Object.prototype.hasOwnProperty.call(ARTIFACT_FIELDS, key);
}

function toDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : formatLocalDate(parsed);
}

// Numbers are accepted where text is expected: YAML reads `id: 2024` as a number.
const toText = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : value);

const NORMALIZE: Record<FieldKind, (value: unknown) => unknown> = {
  string: (value) => {
    const text = toText(value);
    return typeof text === 'string' ? text.trim() || undefined : undefined;
  },
  strings: (value) => {
    if (typeof value === 'string') return [value];
    const items = Array.isArray(value) ? value.map(toText) : [];
    // Anything else (`related: [[Note]]` parses as a nested list) stays raw rather than losing items.
    return Array.isArray(value) && items.every((item) => typeof item === 'string') ? items : undefined;
  },
  date: toDate,
  number: (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined),
  boolean: (value) => (typeof value === 'boolean' ? value : undefined),
};

/** The value as its field's kind, or undefined when it doesn't fit. */
export function normalizeField(key: ArtifactFieldName, value: unknown): unknown {
  return NORMALIZE[ARTIFACT_FIELDS[key]](value);
}

/**
 * Split parsed frontmatter into known fields and everything else. A known key
 * whose value doesn't fit its kind stays in `extra`, so it still round-trips.
 */
export function readFields(data: Record<string, unknown>): {
  fields: Partial<Record<ArtifactFieldName, unknown>>;
  extra: Record<string, unknown>;
} {
  const fields: Partial<Record<ArtifactFieldName, unknown>> = {};
  const extra: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(data)) {
    const value = isFieldName(key) ? normalizeField(key, raw) : undefined;
    if (value === undefined) extra[key] = raw;
    else fields[key as ArtifactFieldName] = value;
  }
  return { fields, extra };
}

/**
 * Frontmatter in canonical order: known fields, then extras. A known key
 * that is also in `extra` held a value myOS couldn't use, and is written back
 * as it was until something sets that field.
 */
export function writeFields(artifact: ArtifactFields & { extra: Record<string, unknown> }): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of FIELD_NAMES) {
    const value = key in artifact.extra ? artifact.extra[key] : artifact[key];
    if (value !== undefined) data[key] = value;
  }
  for (const [key, value] of Object.entries(artifact.extra)) {
    if (!(key in data) && value !== undefined) data[key] = value;
  }
  return data;
}
