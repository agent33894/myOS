import { app, BrowserWindow, dialog, shell, type SaveDialogOptions } from 'electron';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { DomainError } from '../errors';
import { resolveInWorkspace } from '../workspace/paths';

// Countries that print on US Letter; everyone else gets A4.
const LETTER = new Set(['US', 'CA', 'MX', 'PH']);

const LOAD_TIMEOUT_MS = 20_000;

/**
 * Print self-contained HTML to PDF in a hidden window that runs no scripts,
 * opens nothing, and navigates nowhere. A failure (the page never loads, the
 * renderer goes away) becomes an error the page shows, never a crash.
 */
async function renderPdf(html: string): Promise<Buffer> {
  // A temporary file rather than a data: URL, which Chromium caps in size (inlined images add up).
  const folder = await mkdtemp(join(tmpdir(), 'myos-export-'));
  const view = new BrowserWindow({
    show: false,
    focusable: false,
    skipTaskbar: true,
    paintWhenInitiallyHidden: true,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  const { webContents } = view;
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  webContents.on('will-navigate', (event) => event.preventDefault());
  let timer: NodeJS.Timeout | undefined;
  const gone = new Promise<never>((_, reject) => {
    webContents.once('render-process-gone', (_event, details) => reject(new Error(`The export page stopped (${details.reason}).`)));
    timer = setTimeout(() => reject(new Error('The export took too long.')), LOAD_TIMEOUT_MS);
  });
  // Handled by the races below; this keeps an early rejection from being reported as unhandled.
  gone.catch(() => undefined);
  try {
    const file = join(folder, 'export.html');
    await writeFile(file, html, 'utf-8');
    await Promise.race([view.loadFile(file), gone]);
    return await Promise.race([
      webContents.printToPDF({
        printBackground: true,
        pageSize: LETTER.has(app.getLocaleCountryCode()) ? 'Letter' : 'A4',
        margins: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.7 },
      }),
      gone,
    ]);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new DomainError('INVALID', `Could not make the PDF. ${(error as Error).message}`.trim());
  } finally {
    clearTimeout(timer);
    if (!view.isDestroyed()) view.destroy();
    await rm(folder, { recursive: true, force: true }).catch(() => undefined);
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
  exported.add(result.filePath);
  return result.filePath;
}

// Exports usually land outside the workspace, so "Show in folder" is limited to files this session wrote.
const exported = new Set<string>();

/** Show an exported file in the system file manager. */
export function revealExport(savedPath: string): void {
  if (!exported.has(savedPath)) throw new DomainError('NOT_FOUND', 'That export is no longer available.');
  shell.showItemInFolder(savedPath);
}
