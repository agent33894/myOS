import { dialog } from 'electron';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, parse } from 'path';
import type { AssetAttachmentResult } from '../../shared/ipc/contracts';
import { resolveInWorkspace } from '../workspace/paths';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);

const sanitize = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 96);

/** Copy a picked file into `assets/<note name>/` and return Markdown that embeds or links it. */
export async function attachAsset(notePath: string): Promise<AssetAttachmentResult> {
  const selection = await dialog.showOpenDialog({ title: 'Attach a file', properties: ['openFile'] });
  const source = selection.filePaths[0];
  if (selection.canceled || !source) return { canceled: true };

  const originalName = basename(source);
  const name = sanitize(parse(originalName).name) || 'attachment';
  const extension = /^\.[a-z0-9]{1,10}$/.test(extname(originalName).toLowerCase()) ? extname(originalName).toLowerCase() : '';
  const folder = `assets/${sanitize(parse(notePath).name) || 'note'}`;

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
