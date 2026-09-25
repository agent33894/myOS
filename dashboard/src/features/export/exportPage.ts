import { format } from 'date-fns';
import type { Note } from '@shared/spec';
import { read } from '../../data/gateway';
import { buildExportDocument, copyAsMarkdown, copyAsRichText, exportHtml, exportPdf } from '../../data/exporter';
import { useSettings } from '../../store/settings';
import { captureEditor, findEditor, renderMarkdown } from './capture';
import { fontFaces } from './fonts';

// Page furniture around the reading rules: the title as the page shows it, a
// quiet line of context under it, and print-friendly rich blocks.
const PAGE_CSS = `
body { background: #ffffff; font-family: var(--font-sans); font-feature-settings: 'cv11', 'ss01', 'ss03'; }
main { max-width: 44rem; padding: 3.5rem 1.5rem 4rem; }
main > h1 { font-family: var(--font-sans); font-size: 2rem; line-height: 2.5rem; letter-spacing: -0.02em; font-weight: 600; margin: 0 0 0.5rem; color: var(--text); }
.export-meta { display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; margin: 0 0 2.25rem; color: var(--text-secondary); font: 500 0.8125rem/1.25rem var(--font-sans); }
.export-meta span + span::before { content: '·'; margin-right: 0.75rem; color: var(--text-tertiary); }
.prose { font-size: 1rem; }
.rich-block { margin: 2rem 0 1.5rem; break-inside: avoid; }
.rich-block svg { max-width: 100%; }
.recharts-responsive-container { height: auto !important; }
.recharts-responsive-container > div, .recharts-wrapper { width: 100% !important; height: auto !important; }
.recharts-surface { width: 100% !important; height: auto !important; }
.recharts-legend-wrapper { position: static !important; width: auto !important; }
figure.diagram { margin: 0; display: flex; justify-content: center; }
.block-source { margin: 1.5rem 0; }
.block-source figcaption { font: 500 0.75rem/1rem var(--font-sans); color: var(--text-secondary); margin: 0 0 0.375rem; }
.block-source pre { margin: 0; }
pre, table, img { break-inside: avoid; }
h1, h2, h3, h4 { break-after: avoid; }
@media print { main { padding: 0; } }
`;

function metaLine(note: Pick<Note, 'modified'>): string {
  const date = new Date(note.modified);
  return Number.isNaN(date.getTime()) ? '' : `<p class="export-meta"><span>${format(date, 'd MMMM yyyy')}</span></p>`;
}

interface PageExport {
  title: string;
  markdown: string;
  html: string;
}

/** The note as one self-contained HTML document, plus its Markdown. */
async function buildPage(path: string, flush: () => Promise<void>): Promise<PageExport> {
  await flush();
  const file = await read(path);
  const title = file.title.trim() || 'Untitled';
  const editor = findEditor();
  const body = editor ? await captureEditor(editor, file.content) : await renderMarkdown(file.content);
  const faces = await fontFaces({ serifBody: useSettings.getState().readingFont === 'serif', code: body.hasCode });
  const html = buildExportDocument({
    title,
    bodyHtml: `${metaLine(file)}<article class="prose">${body.html}</article>`,
    css: `${faces}\n${body.css}\n${PAGE_CSS}`,
  });
  return { title, markdown: file.content, html };
}

const asMarkdown = (title: string, body: string) => `# ${title}\n\n${body.replace(/^\n+/, '')}`;

export type ExportFormat = 'pdf' | 'html';

/** Export through the save dialog; resolves to the saved path, or null when cancelled. */
export async function exportPage(path: string, as: ExportFormat, flush: () => Promise<void>): Promise<string | null> {
  const page = await buildPage(path, flush);
  return as === 'pdf' ? exportPdf(path, page.html) : exportHtml(path, page.html);
}

export async function copyPageAsRichText(path: string, flush: () => Promise<void>): Promise<void> {
  const page = await buildPage(path, flush);
  await copyAsRichText(page.html, asMarkdown(page.title, page.markdown));
}

/** The file's body as it is on disk (frontmatter left out). */
export async function copyPageAsMarkdown(path: string, flush: () => Promise<void>): Promise<void> {
  await flush();
  await copyAsMarkdown((await read(path)).content);
}
