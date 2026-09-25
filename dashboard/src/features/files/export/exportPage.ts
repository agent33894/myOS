import { format } from 'date-fns';
import { AREAS } from '@shared/spec';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { read } from '../../../data/gateway';
import { buildExportDocument, copyAsMarkdown, copyAsRichText, exportHtml, exportPdf } from '../../../data/exporter';
import { useDataStore } from '../../../data/store';
import { useSettingsStore } from '../../../store/settings';
import { projectColor } from '../../tasks/projectRefs';
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
.export-meta .project { display: inline-flex; align-items: center; gap: 0.375rem; }
.export-meta .dot { width: 0.5rem; height: 0.5rem; border-radius: 9999px; }
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

function metaLine(item: ArtifactSummary): string {
  const parts: string[] = [];
  const project = item.project
    ? Object.values(useDataStore.getState().byPath).find((entry) => entry.type === ArtifactType.PROJECT && entry.id === item.project)
    : undefined;
  if (project) {
    const color = projectColor(project);
    parts.push(
      `<span class="project">${color ? `<span class="dot" style="background:${color}"></span>` : ''}${escape(project.title)}</span>`,
    );
  }
  const stamp = item.updated || item.created;
  if (stamp) {
    const date = new Date(stamp.length <= 10 ? `${stamp}T12:00:00` : stamp);
    if (!Number.isNaN(date.getTime())) parts.push(`<span>${format(date, 'd MMMM yyyy')}</span>`);
  }
  if (item.domain && item.type !== ArtifactType.JOURNAL && item.type !== ArtifactType.TEMPLATE) parts.push(`<span>${AREAS[item.domain]}</span>`);
  return parts.length ? `<p class="export-meta">${parts.join('')}</p>` : '';
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

interface PageExport {
  title: string;
  markdown: string;
  html: string;
}

/** The page as one self-contained HTML document, plus its Markdown. */
async function buildPage(item: ArtifactSummary, flush: () => Promise<void>): Promise<PageExport> {
  await flush();
  const file = await read(item.filePath);
  const title = file.title.trim() || 'Untitled';
  const editor = findEditor();
  const body = editor ? await captureEditor(editor, file.content) : await renderMarkdown(file.content);
  const faces = await fontFaces({ serifBody: useSettingsStore.getState().readingFont === 'serif', code: body.hasCode });
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
export async function exportPage(item: ArtifactSummary, as: ExportFormat, flush: () => Promise<void>): Promise<string | null> {
  const page = await buildPage(item, flush);
  return as === 'pdf' ? exportPdf(item, page.html) : exportHtml(item, page.html);
}

export async function copyPageAsRichText(item: ArtifactSummary, flush: () => Promise<void>): Promise<void> {
  const page = await buildPage(item, flush);
  await copyAsRichText(page.html, asMarkdown(page.title, page.markdown));
}

export async function copyPageAsMarkdown(item: ArtifactSummary, flush: () => Promise<void>): Promise<void> {
  await flush();
  const file = await read(item.filePath);
  await copyAsMarkdown(asMarkdown(file.title.trim() || 'Untitled', file.content));
}
