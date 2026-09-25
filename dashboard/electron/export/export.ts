import { app, BrowserWindow, dialog, type SaveDialogOptions } from 'electron';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { resolveInWorkspace } from '../workspace/paths';

// Countries that print on US Letter; everyone else gets A4.
const LETTER = new Set(['US', 'CA', 'MX', 'PH']);

/** Print self-contained HTML to PDF in a hidden window that runs no scripts. */
async function renderPdf(html: string): Promise<Buffer> {
  // A temporary file rather than a data: URL, which Chromium caps in size (inlined images add up).
  const folder = await mkdtemp(join(tmpdir(), 'myos-export-'));
  const view = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } });
  try {
    const file = join(folder, 'export.html');
    await writeFile(file, html, 'utf-8');
    await view.loadFile(file);
    return await view.webContents.printToPDF({
      printBackground: true,
      pageSize: LETTER.has(app.getLocaleCountryCode()) ? 'Letter' : 'A4',
      margins: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.7 },
    });
  } finally {
    view.destroy();
    await rm(folder, { recursive: true, force: true });
  }
}

/**
 * Ask where to save the page `path` as PDF or HTML (the renderer builds the
 * HTML) and write it there. Resolves to the saved path, or null when cancelled.
 */
export async function exportDocument(format: 'pdf' | 'html', path: string, html: string, window: BrowserWindow | null): Promise<string | null> {
  const name = basename(resolveInWorkspace(path)).replace(/\.md$/i, '');
  const options: SaveDialogOptions = {
    title: format === 'pdf' ? 'Export as PDF' : 'Export as HTML',
    defaultPath: join(app.getPath('documents'), `${name}.${format}`),
    filters: [{ name: format === 'pdf' ? 'PDF' : 'HTML', extensions: [format] }],
  };
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, format === 'pdf' ? await renderPdf(html) : html);
  return result.filePath;
}
