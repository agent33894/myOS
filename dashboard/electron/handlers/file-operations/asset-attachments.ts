import { dialog } from 'electron';
import { access, copyFile, mkdir, stat } from 'fs/promises';
import { constants } from 'fs';
import { basename, extname, parse, sep } from 'path';
import type {
  ArtifactAssetAttachmentRequest,
  ArtifactAssetAttachmentResult,
} from '../../../shared/ipc/contracts';
import { resolvePathWithinVault } from './path-safety.js';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.avif',
]);

function toPosixPath(value: string): string {
  return value.split(sep).join('/');
}

function sanitizeSegment(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);

  return sanitized || fallback;
}

function resolveArtifactKey(request?: ArtifactAssetAttachmentRequest): string {
  const fromId = request?.artifactId ? sanitizeSegment(request.artifactId, '') : '';
  if (fromId) {
    return fromId;
  }

  const rawFilePath = request?.artifactFilePath?.trim();
  if (rawFilePath) {
    const fromPath = sanitizeSegment(parse(rawFilePath).name, '');
    if (fromPath) {
      return fromPath;
    }
  }

  return `draft-${Date.now().toString(36)}`;
}

async function findUniqueRelativePath(
  baseDirRelative: string,
  filenameBase: string,
  extension: string
): Promise<string> {
  let index = 0;
  while (index < 5000) {
    const suffix = index === 0 ? '' : `-${index + 1}`;
    const candidateFileName = `${filenameBase}${suffix}${extension}`;
    const relativePath = toPosixPath(`${baseDirRelative}/${candidateFileName}`);
    const fullPath = resolvePathWithinVault(relativePath);

    try {
      await access(fullPath, constants.F_OK);
      index += 1;
    } catch {
      return relativePath;
    }
  }

  throw new Error('Failed to allocate a unique destination path for attachment');
}

function buildInsertMarkdown(
  fileNameBase: string,
  relativePath: string,
  isImage: boolean
): string {
  const label = fileNameBase.replace(/[-_]+/g, ' ').trim() || 'Attachment';
  if (isImage) {
    return `![${label}](${relativePath})`;
  }
  return `[${label}](${relativePath})`;
}

export async function attachLocalAsset(
  request?: ArtifactAssetAttachmentRequest
): Promise<ArtifactAssetAttachmentResult> {
  let sourcePath = request?.sourcePath?.trim();

  if (!sourcePath) {
    const selection = await dialog.showOpenDialog({
      title: 'Attach Local Asset',
      properties: ['openFile'],
    });

    if (selection.canceled || selection.filePaths.length === 0) {
      return { canceled: true };
    }

    sourcePath = selection.filePaths[0];
    if (!sourcePath) {
      return { canceled: true };
    }
  }

  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile()) {
    throw new Error('Selected asset is not a file');
  }

  const originalName = basename(sourcePath);
  const rawBase = parse(originalName).name || 'attachment';
  const fileNameBase = sanitizeSegment(rawBase, 'attachment');
  const rawExtension = extname(originalName).toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/.test(rawExtension) ? rawExtension : '';

  const artifactKey = resolveArtifactKey(request);
  const baseDirRelative = toPosixPath(`assets/artifacts/${artifactKey}`);
  const targetRelativePath = await findUniqueRelativePath(
    baseDirRelative,
    fileNameBase,
    extension
  );
  const targetFullPath = resolvePathWithinVault(targetRelativePath);

  await mkdir(resolvePathWithinVault(baseDirRelative), { recursive: true });
  await copyFile(sourcePath, targetFullPath);

  const isImage = IMAGE_EXTENSIONS.has(extension);
  const insertMarkdown = buildInsertMarkdown(
    fileNameBase,
    targetRelativePath,
    isImage
  );

  return {
    canceled: false,
    asset: {
      fileName: basename(targetRelativePath),
      originalName,
      relativePath: targetRelativePath,
      myosUrl: `myos://${encodeURI(targetRelativePath)}`,
      isImage,
      size: sourceStats.size,
      insertMarkdown,
    },
  };
}
