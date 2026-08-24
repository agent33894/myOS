import { Stats } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, resolve } from 'path';
import matter from 'gray-matter';
import { formatLocalDate } from '../../../shared/date.js';
import type { Artifact } from '../../../shared/types/index.js';
import { getVaultPath } from '../../utils/paths.js';
import {
  buildArtifactFromData,
  getArtifactDateFallbacks,
} from './artifact-format.js';
import { getIsoTimestampString } from './dates.js';
import { resolvePathWithinVault } from './path-safety.js';

type ArtifactMetadata = Omit<Artifact, 'content'>;

interface MetadataCacheEntry {
  cacheKey: string;
  metadata: ArtifactMetadata;
}

const metadataCache = new Map<string, MetadataCacheEntry>();
const dirtyMetadataPaths = new Set<string>();

let cachedVaultPath: string | null = null;
let cachedMarkdownFiles: string[] | null = null;
let cachedMetadataSnapshot: ArtifactMetadata[] | null = null;
let fileListDirty = true;
const MAX_SEARCH_CONTENT_CHARS = 60_000;

function buildSearchContent(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= MAX_SEARCH_CONTENT_CHARS) {
    return trimmed;
  }

  const half = Math.floor(MAX_SEARCH_CONTENT_CHARS / 2);
  return `${trimmed.slice(0, half)}\n${trimmed.slice(-half)}`;
}

function hasSearchContent(
  metadata: ArtifactMetadata
): metadata is ArtifactMetadata & { searchContent: string } {
  return typeof metadata.searchContent === 'string';
}

function hasCompleteSearchIndex(metadataList: ArtifactMetadata[]): boolean {
  return metadataList.every((metadata) => hasSearchContent(metadata));
}

function resetCachesForVaultChange(vaultPath: string): void {
  const normalizedVault = resolve(vaultPath);
  if (cachedVaultPath === normalizedVault) {
    return;
  }

  cachedVaultPath = normalizedVault;
  cachedMarkdownFiles = null;
  cachedMetadataSnapshot = null;
  fileListDirty = true;
  metadataCache.clear();
  dirtyMetadataPaths.clear();
}

function getFileCacheKey(fileStats: Stats): string {
  return `${fileStats.mtimeMs}:${fileStats.size}`;
}

function buildDateFallbacksFromStats(fileStats: Stats): { mtime: string; ctime: string } {
  const mtime = getIsoTimestampString(fileStats.mtime);
  const hasDifferentBirthtime =
    fileStats.birthtime &&
    fileStats.birthtime.getTime() !== fileStats.mtime.getTime();
  const ctime = hasDifferentBirthtime
    ? formatLocalDate(fileStats.birthtime)
    : formatLocalDate(fileStats.mtime);
  return { mtime, ctime };
}

// Recursively read all markdown files from a directory
async function readMarkdownFiles(
  dir: string,
  basePath: string = ''
): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await readMarkdownFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return files;
}

// Parse a markdown file into an Artifact
async function parseArtifact(filePath: string): Promise<Artifact | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const vaultPath = getVaultPath();
    const relativePath = relative(vaultPath, filePath);
    const fallbacks = await getArtifactDateFallbacks(filePath);

    return buildArtifactFromData(data, body, relativePath, fallbacks);
  } catch (error) {
    console.error(`Error parsing artifact ${filePath}:`, error);
    return null;
  }
}

// Parse metadata only (no content) from a markdown file
async function parseArtifactMetadata(
  filePath: string,
  fileStats?: Stats
): Promise<ArtifactMetadata | null> {
  try {
    const stats = fileStats ?? await stat(filePath);
    const cacheKey = getFileCacheKey(stats);
    const cached = metadataCache.get(filePath);
    if (
      cached &&
      cached.cacheKey === cacheKey &&
      hasSearchContent(cached.metadata)
    ) {
      return cached.metadata;
    }

    const content = await readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const vaultPath = getVaultPath();
    const relativePath = relative(vaultPath, filePath);
    const fallbacks = buildDateFallbacksFromStats(stats);

    const artifact = buildArtifactFromData(data, '', relativePath, fallbacks);
    artifact.searchContent = buildSearchContent(body);
    const { content: _, ...metadata } = artifact;
    metadataCache.set(filePath, {
      cacheKey,
      metadata,
    });
    return metadata;
  } catch (error) {
    console.error(`Error parsing artifact metadata ${filePath}:`, error);
    return null;
  }
}

async function getMarkdownFilesCached(vaultPath: string): Promise<string[]> {
  if (!fileListDirty && cachedMarkdownFiles) {
    return cachedMarkdownFiles;
  }

  const files = await readMarkdownFiles(vaultPath);
  cachedMarkdownFiles = files;
  fileListDirty = false;
  return files;
}

/**
 * Invalidate artifact read caches when files change.
 * `relativePath` is expected to be vault-relative.
 */
export function invalidateArtifactReadCaches(
  relativePath?: string,
  changeType?: 'created' | 'updated' | 'deleted'
): void {
  const vaultPath = getVaultPath();
  resetCachesForVaultChange(vaultPath);

  if (!relativePath || relativePath.trim().length === 0) {
    fileListDirty = true;
    cachedMetadataSnapshot = null;
    metadataCache.clear();
    dirtyMetadataPaths.clear();
    return;
  }

  try {
    const fullPath = resolvePathWithinVault(relativePath);
    metadataCache.delete(fullPath);
    dirtyMetadataPaths.add(fullPath);
    cachedMetadataSnapshot = null;
  } catch {
    // Ignore invalid relative paths from watcher noise.
  }

  if (changeType === 'created' || changeType === 'deleted') {
    fileListDirty = true;
  }
}

// Read all artifact metadata (without content) from vault
export async function readAllArtifactMetadata(): Promise<Omit<Artifact, 'content'>[]> {
  const vaultPath = getVaultPath();
  resetCachesForVaultChange(vaultPath);
  const files = await getMarkdownFilesCached(vaultPath);

  if (
    cachedMetadataSnapshot &&
    dirtyMetadataPaths.size === 0 &&
    files.every((filePath) => metadataCache.has(filePath)) &&
    hasCompleteSearchIndex(cachedMetadataSnapshot)
  ) {
    return cachedMetadataSnapshot;
  }

  const metadata = await Promise.all(
    files.map(async (filePath) => {
      try {
        if (!dirtyMetadataPaths.has(filePath) && metadataCache.has(filePath)) {
          const cached = metadataCache.get(filePath)?.metadata;
          if (cached && hasSearchContent(cached)) {
            return cached;
          }
        }

        const fileStats = await stat(filePath);
        return parseArtifactMetadata(filePath, fileStats);
      } catch (error) {
        console.error(`Error getting file stats for ${filePath}:`, error);
        return null;
      }
    })
  );

  const activeFileSet = new Set(files);
  for (const cachedPath of metadataCache.keys()) {
    if (!activeFileSet.has(cachedPath)) {
      metadataCache.delete(cachedPath);
      dirtyMetadataPaths.delete(cachedPath);
    }
  }

  const filteredMetadata = metadata.filter(
    (artifact): artifact is Omit<Artifact, 'content'> => artifact !== null
  );

  cachedMetadataSnapshot = filteredMetadata;
  dirtyMetadataPaths.clear();
  return filteredMetadata;
}

// Read a single artifact
export async function readArtifact(filePath: string): Promise<Artifact | null> {
  const fullPath = resolvePathWithinVault(filePath);
  return parseArtifact(fullPath);
}

// Read just the content of a single artifact
export async function readArtifactContent(filePath: string): Promise<string> {
  const fullPath = resolvePathWithinVault(filePath);

  try {
    const content = await readFile(fullPath, 'utf-8');
    const { content: body } = matter(content);
    return body.trim();
  } catch (error) {
    console.error(`Error reading artifact content ${filePath}:`, error);
    throw error;
  }
}
