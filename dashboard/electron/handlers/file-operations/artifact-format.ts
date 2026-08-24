import { stat } from 'fs/promises';
import { basename, extname } from 'path';
import matter from 'gray-matter';
import type { Artifact } from '../../../shared/types';
import { ArtifactType, Domain } from '../../../shared/types';
import { formatLocalDate } from '../../../shared/date.js';
import { getIsoTimestampString, normalizeDate } from './dates.js';

/**
 * Normalize a type value to ensure it's a valid ArtifactType.
 */
function inferTypeFromPath(relativePath: string): ArtifactType {
  const segments = relativePath.toLowerCase().split(/[\\/]/);
  const directoryTypes: Array<[string, ArtifactType]> = [
    ['inbox', ArtifactType.INBOX],
    ['todos', ArtifactType.TODO],
    ['projects', ArtifactType.PROJECT],
    ['decisions', ArtifactType.DECISION],
    ['meetings', ArtifactType.MEETING],
    ['queries', ArtifactType.QUERY],
    ['code', ArtifactType.SNIPPET],
    ['prompts', ArtifactType.PROMPT],
    ['development', ArtifactType.DEVELOPMENT],
    ['topics', ArtifactType.RESEARCH],
  ];
  return directoryTypes.find(([directory]) => segments.includes(directory))?.[1] ?? ArtifactType.MEMO;
}

function normalizeType(typeValue: unknown, relativePath: string): ArtifactType {
  if (typeof typeValue === 'string') {
    const normalized = typeValue.toLowerCase().trim();
    if (Object.values(ArtifactType).includes(normalized as ArtifactType)) {
      return normalized as ArtifactType;
    }
  }
  return inferTypeFromPath(relativePath);
}

function inferTitle(dataTitle: unknown, body: string, relativePath: string): string {
  if (typeof dataTitle === 'string' && dataTitle.trim()) return dataTitle.trim();
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  const fileName = basename(relativePath, extname(relativePath));
  return fileName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferId(dataId: unknown, relativePath: string): string {
  if (typeof dataId === 'string' && dataId.trim()) return dataId.trim();
  return relativePath
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferDomain(dataDomain: unknown, relativePath: string): Domain {
  if (typeof dataDomain === 'string' && Object.values(Domain).includes(dataDomain as Domain)) {
    return dataDomain as Domain;
  }
  const firstDirectory = relativePath.toLowerCase().split(/[\\/]/)[0];
  return Object.values(Domain).includes(firstDirectory as Domain)
    ? firstDirectory as Domain
    : Domain.WORK;
}

/**
 * Get file timestamps for use as fallback dates.
 */
async function getFileDateFallbacks(
  filePath: string
): Promise<{ mtime: string; ctime: string }> {
  const nowTimestamp = getIsoTimestampString();
  const today = formatLocalDate();
  try {
    const fileStats = await stat(filePath);
    const mtime = getIsoTimestampString(fileStats.mtime);
    const hasDifferentBirthtime =
      fileStats.birthtime &&
      fileStats.birthtime.getTime() !== fileStats.mtime.getTime();
    const ctime = hasDifferentBirthtime
      ? formatLocalDate(fileStats.birthtime)
      : formatLocalDate(fileStats.mtime);
    return { mtime, ctime };
  } catch (error) {
    console.warn(
      `Could not get file stats for ${filePath}, using current date as fallback:`,
      error
    );
    return { mtime: nowTimestamp, ctime: today };
  }
}

/**
 * Build artifact object from parsed frontmatter data.
 */
export function buildArtifactFromData(
  data: Record<string, unknown>,
  body: string,
  relativePath: string,
  fallbacks: { mtime: string; ctime: string }
): Artifact {
  const type = normalizeType(data.type, relativePath);
  const isInbox = type === ArtifactType.INBOX;
  const knownFrontmatterFields = new Set([
    'id',
    'title',
    'domain',
    'type',
    'tags',
    'project',
    'created',
    'updated',
    'status',
    'related',
    'priority',
    'due',
    'analysisData',
    'sources',
    'assetManifest',
    'parentId',
    'deferDate',
    'estimatedMinutes',
    'sequential',
    'flagged',
    'completedDate',
    'repeatRule',
    'localPath',
    'repoUrl',
    'isExternalProject',
    'language',
    'searchContent',
  ]);

  const extraFrontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownFrontmatterFields.has(key)) {
      extraFrontmatter[key] = value;
    }
  }

  const updatedValue = normalizeDate(data.updated, fallbacks.mtime);
  const isDateOnlyUpdated = /^\d{4}-\d{2}-\d{2}$/.test(updatedValue);

  return {
    id: inferId(data.id, relativePath),
    title: inferTitle(data.title, body, relativePath),
    domain: isInbox ? undefined : inferDomain(data.domain, relativePath),
    type,
    tags: Array.isArray(data.tags) ? data.tags : [],
    project: (data.project as string) || undefined,
    created: normalizeDate(data.created, fallbacks.ctime),
    // Use file mtime precision for legacy date-only `updated` values.
    updated: isDateOnlyUpdated ? fallbacks.mtime : updatedValue,
    status: (data.status as string) || 'active',
    related: Array.isArray(data.related) ? data.related : [],
    priority: (data.priority as string) || undefined,
    due: data.due ? normalizeDate(data.due, fallbacks.mtime) : undefined,
    analysisData: data.analysisData || undefined,
    sources: Array.isArray(data.sources) ? data.sources : undefined,
    assetManifest: Array.isArray(data.assetManifest) ? data.assetManifest : undefined,
    filePath: relativePath,
    content: body.trim(),
    parentId: (data.parentId as string) || undefined,
    deferDate: data.deferDate
      ? normalizeDate(data.deferDate, fallbacks.mtime)
      : undefined,
    estimatedMinutes:
      typeof data.estimatedMinutes === 'number'
        ? data.estimatedMinutes
        : undefined,
    sequential:
      typeof data.sequential === 'boolean' ? data.sequential : undefined,
    flagged: typeof data.flagged === 'boolean' ? data.flagged : undefined,
    completedDate: data.completedDate
      ? normalizeDate(data.completedDate, fallbacks.mtime)
      : undefined,
    repeatRule: (data.repeatRule as string) || undefined,
    localPath: (data.localPath as string) || undefined,
    repoUrl: (data.repoUrl as string) || undefined,
    isExternalProject:
      typeof data.isExternalProject === 'boolean'
        ? data.isExternalProject
        : undefined,
    language: (data.language as string) || undefined,
    ...extraFrontmatter,
  } as Artifact;
}

export async function getArtifactDateFallbacks(
  filePath: string
): Promise<{ mtime: string; ctime: string }> {
  return getFileDateFallbacks(filePath);
}

export function artifactToMarkdown(artifact: Artifact): string {
  const frontmatter: Record<string, any> = {
    id: artifact.id,
    title: artifact.title,
    type: artifact.type,
    tags: artifact.tags,
    created: artifact.created,
    updated: artifact.updated,
    status: artifact.status,
    related: artifact.related,
  };

  if (artifact.domain) frontmatter.domain = artifact.domain;
  if (artifact.project) frontmatter.project = artifact.project;
  if (artifact.priority) frontmatter.priority = artifact.priority;
  if (artifact.due) frontmatter.due = artifact.due;
  if (artifact.analysisData) frontmatter.analysisData = artifact.analysisData;
  if (artifact.sources) frontmatter.sources = artifact.sources;
  if (artifact.assetManifest) frontmatter.assetManifest = artifact.assetManifest;

  if (artifact.parentId) frontmatter.parentId = artifact.parentId;
  if (artifact.deferDate) frontmatter.deferDate = artifact.deferDate;
  if (artifact.estimatedMinutes !== undefined)
    frontmatter.estimatedMinutes = artifact.estimatedMinutes;
  if (artifact.sequential !== undefined)
    frontmatter.sequential = artifact.sequential;
  if (artifact.flagged !== undefined) frontmatter.flagged = artifact.flagged;
  if (artifact.completedDate) frontmatter.completedDate = artifact.completedDate;
  if (artifact.repeatRule) frontmatter.repeatRule = artifact.repeatRule;

  if (artifact.localPath) frontmatter.localPath = artifact.localPath;
  if (artifact.repoUrl) frontmatter.repoUrl = artifact.repoUrl;
  if (artifact.isExternalProject !== undefined)
    frontmatter.isExternalProject = artifact.isExternalProject;

  if (artifact.language) frontmatter.language = artifact.language;

  const knownFields = [
    'id',
    'title',
    'type',
    'tags',
    'created',
    'updated',
    'status',
    'related',
    'domain',
    'project',
    'priority',
    'due',
    'analysisData',
    'sources',
    'assetManifest',
    'content',
    'filePath',
    'parentId',
    'deferDate',
    'estimatedMinutes',
    'sequential',
    'flagged',
    'completedDate',
    'repeatRule',
    'localPath',
    'repoUrl',
    'isExternalProject',
    'language',
    'searchContent',
  ];

  Object.keys(artifact).forEach((key) => {
    if (
      !knownFields.includes(key) &&
      artifact[key as keyof Artifact] !== undefined
    ) {
      frontmatter[key] = artifact[key as keyof Artifact];
    }
  });

  // Keep a body-leading thematic break from being parsed as host frontmatter.
  const body = artifact.content.startsWith('---\n')
    ? `\n${artifact.content}`
    : artifact.content;
  const matterResult = matter.stringify(body, frontmatter);
  return matterResult;
}
