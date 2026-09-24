import { dialog } from 'electron';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, parse } from 'path';
import type { AssetAttachmentRequest, AssetAttachmentResult } from '../../shared/ipc/contracts';
import { resolveInWorkspace } from '../workspace/paths';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);

const sanitize = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 96);

/** Copy a user-picked file into `assets/artifacts/<artifact>/` and return Markdown that embeds it. */
export async function attachAsset(request: AssetAttachmentRequest): Promise<AssetAttachmentResult> {
  const selection = await dialog.showOpenDialog({ title: 'Attach Local Asset', properties: ['openFile'] });
  const source = selection.filePaths[0];
  if (selection.canceled || !source) return { canceled: true };

  const originalName = basename(source);
  const name = sanitize(parse(originalName).name) || 'attachment';
  const extension = /^\.[a-z0-9]{1,10}$/.test(extname(originalName).toLowerCase()) ? extname(originalName).toLowerCase() : '';
  const owner =
    sanitize(request.artifactId ?? '') ||
    sanitize(parse(request.artifactFilePath ?? '').name) ||
    `draft-${Date.now().toString(36)}`;
  const folder = `assets/artifacts/${owner}`;

  let relativePath = `${folder}/${name}${extension}`;
  for (let index = 2; existsSync(resolveInWorkspace(relativePath)); index += 1) {
    relativePath = `${folder}/${name}-${index}${extension}`;
  }
  await mkdir(resolveInWorkspace(folder), { recursive: true });
  await copyFile(source, resolveInWorkspace(relativePath));

  const label = name.replace(/[-_]+/g, ' ').trim() || 'Attachment';
  const insertMarkdown = IMAGE_EXTENSIONS.has(extension) ? `![${label}](${relativePath})` : `[${label}](${relativePath})`;
  return { canceled: false, asset: { originalName, relativePath, insertMarkdown } };
}
