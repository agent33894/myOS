import type { ArtifactSummary } from '@shared/types';
import { invoke } from './ipc';

/** Save the page as PDF through the native save dialog; resolves to the saved path, or null when cancelled. */
export const exportPdf = (item: Pick<ArtifactSummary, 'filePath'>, html: string) => invoke('export:pdf', item.filePath, html);

/** Save the page as a single self-contained HTML file; resolves to the saved path, or null when cancelled. */
export const exportHtml = (item: Pick<ArtifactSummary, 'filePath'>, html: string) => invoke('export:html', item.filePath, html);

// The reading styles of the light theme (src/styles/tokens.css, _prose.css), inlined so the file stands alone.
const READING_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #fcfbf9; color: #1d1c1a; font: 16px/1.65 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
h1, h2, h3, h4 { line-height: 1.25; font-weight: 600; letter-spacing: -0.01em; margin: 1.8em 0 0.5em; }
h1 { font-size: 2rem; margin-top: 0; }
h2 { font-size: 1.4rem; }
h3 { font-size: 1.15rem; }
p, ul, ol, blockquote, pre, table, figure { margin: 0 0 1em; }
a { color: inherit; text-decoration-color: rgb(29 28 26 / 0.35); text-underline-offset: 0.15em; }
blockquote { margin-left: 0; padding-left: 1em; border-left: 3px solid rgb(29 28 26 / 0.18); color: #56534d; }
code { font: 0.9em/1.5 ui-monospace, "SF Mono", Menlo, monospace; background: #f1efeb; border-radius: 4px; padding: 0.1em 0.3em; }
pre { background: #f1efeb; border-radius: 8px; padding: 1em; overflow-x: auto; }
pre code { background: none; padding: 0; }
hr { border: 0; border-top: 1px solid rgb(29 28 26 / 0.1); margin: 2em 0; }
img, svg { max-width: 100%; height: auto; }
table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
th, td { border: 1px solid rgb(29 28 26 / 0.1); padding: 0.4em 0.6em; text-align: left; vertical-align: top; }
th { background: #f4f2ef; font-weight: 600; }
ul[data-type="taskList"] { list-style: none; padding-left: 0.2em; }
li > p { margin: 0; }
@media print { body { background: #ffffff; } main { padding: 0; max-width: none; } a { text-decoration: none; } }
`;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** A complete HTML document for export: the page title, its rendered body, and the reading styles (plus `css`). */
export function buildExportDocument({ title, bodyHtml, css = '' }: { title: string; bodyHtml: string; css?: string }): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${READING_CSS}${css}</style>`,
    '</head>',
    '<body>',
    `<main><h1>${escapeHtml(title)}</h1>${bodyHtml}</main>`,
    '</body>',
    '</html>',
  ].join('\n');
}

/** Put the page on the clipboard as formatted text, with Markdown for plain-text targets. */
export function copyAsRichText(html: string, markdown: string): Promise<void> {
  return navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([markdown], { type: 'text/plain' }),
    }),
  ]);
}

export const copyAsMarkdown = (markdown: string) => navigator.clipboard.writeText(markdown);
