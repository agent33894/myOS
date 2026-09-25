import { marked, type Token, type Tokens } from 'marked';
import { blockKind, type BlockKind } from '../../editor/blocks/registry';

/*
 * The page as it reads in the app, as static HTML. When the page is open, the
 * editor's rendered DOM is serialized: prose keeps its semantic tags and takes
 * the app's own `.prose` rules, and rich blocks (charts, KPIs, roadmaps,
 * diagrams, callouts) keep their look through inlined computed styles. All of
 * it is captured in the light theme. Without an editor on screen, the Markdown
 * is rendered directly and rich blocks show their source.
 */

interface RichSource {
  kind: BlockKind;
  source: string;
}

/** Rich-block fences in document order, to pair with the rendered blocks. */
function richSources(markdown: string): RichSource[] {
  const found: RichSource[] = [];
  const walk = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === 'code') {
        const code = token as Tokens.Code;
        const kind = blockKind(code.lang, code.text);
        if (kind) found.push({ kind, source: code.text });
      }
      const nested = (token as { tokens?: Token[] }).tokens;
      if (nested) walk(nested);
    }
  };
  walk(marked.lexer(markdown));
  return found;
}

/** Run `read` with the document in the light theme, restoring the theme before anything paints. */
function inLightTheme<T>(read: () => T): T {
  const root = document.documentElement;
  const previous = root.dataset.theme;
  if (previous === 'light') return read();
  root.dataset.theme = 'light';
  try {
    return read();
  } finally {
    root.dataset.theme = previous;
  }
}

const isDark = () => document.documentElement.dataset.theme === 'dark';

// ---- Styles ----------------------------------------------------------------

/** The app's reading rules (`.prose …`) as CSS text. */
function proseRules(): string[] {
  const rules: string[] = [];
  const visit = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule && /\.prose\b/.test(rule.selectorText) && !/ProseMirror|is-empty|is-editor-empty/.test(rule.selectorText)) {
        rules.push(rule.cssText);
      } else if (rule instanceof CSSStyleRule && rule.selectorText === ':root' && rule.style.getPropertyValue('--code-foreground')) {
        rules.push(rule.cssText);
      } else if (rule instanceof CSSLayerBlockRule || (rule instanceof CSSMediaRule && !/print/.test(rule.conditionText))) {
        visit(rule.cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A sheet we cannot read (none today) is skipped.
    }
  }
  return rules;
}

const VAR = /var\((--[\w-]+)/g;

/** Every custom property `css` refers to, with its light-theme value. */
function tokenBlock(css: string): string {
  const names = new Set(Array.from(css.matchAll(VAR), (match) => match[1]));
  const style = getComputedStyle(document.documentElement);
  const declarations = Array.from(names)
    .map((name) => [name, style.getPropertyValue(name).trim()] as const)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`);
  return `:root{${declarations.join(';')}}`;
}

// Computed properties copied onto rich-block elements. Sizes stay with the
// element's own inline style so blocks reflow to the page width.
const BOX = [
  'display', 'position', 'box-sizing', 'overflow-x', 'overflow-y',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'background-color', 'background-image', 'box-shadow', 'opacity',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'justify-content',
  'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-column-start', 'grid-column-end',
  'grid-row-start', 'grid-row-end', 'grid-auto-flow', 'grid-auto-columns', 'place-items',
  'min-width', 'max-width', 'min-height',
];
const TEXT = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align',
  'text-transform', 'text-decoration-line', 'text-overflow', 'white-space', 'vertical-align', 'font-variant-numeric',
  'font-feature-settings', 'overflow-wrap', 'word-break',
];
const SVG = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'fill-opacity', 'stroke-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'color'];
const POSITIONED = ['top', 'right', 'bottom', 'left'];

const SIZED_WIDTH = /(^|\s)(w|size|min-w|max-w|basis)-/;
const SIZED_HEIGHT = /(^|\s)(h|size|min-h|max-h)-/;

function inlineStyles(original: Element, copy: Element): void {
  // Diagrams bring their own stylesheet; leave them exactly as drawn.
  if (original instanceof SVGSVGElement && original.querySelector(':scope > style')) return;
  const computed = getComputedStyle(original);
  if (computed.display === 'none') return copy.remove();
  const own = (copy as HTMLElement).style;
  // An <svg> placed in the page lays out like a box; the shapes inside only need paint.
  const outerSvg = original instanceof SVGSVGElement && !(original.parentNode instanceof SVGElement);
  const svg = original instanceof SVGElement && !outerSvg;
  const properties = svg ? SVG : outerSvg ? [...BOX, ...SVG] : [...BOX, ...TEXT, ...(computed.position === 'absolute' ? POSITIONED : [])];
  const declarations: string[] = [];
  for (const property of properties) {
    if (own?.getPropertyValue(property)) continue;
    const value = computed.getPropertyValue(property);
    if (value) declarations.push(`${property}:${value}`);
  }
  if (outerSvg) {
    // Icons and meters keep their drawn size (the export's `svg { height: auto }` would stretch them).
    if (!own?.width) declarations.push(`width:${computed.width}`);
    if (!own?.height) declarations.push(`height:${computed.height}`);
  } else if (!svg) {
    // Sizes from utility classes (bars, dots, rings); flexible boxes reflow to the page width.
    const classes = original.getAttribute('class') ?? '';
    if (!own?.width && SIZED_WIDTH.test(classes)) declarations.push(`width:${/(^|\s)w-full/.test(classes) ? '100%' : computed.width}`);
    if (!own?.height && SIZED_HEIGHT.test(classes)) declarations.push(`height:${/(^|\s)h-full/.test(classes) ? '100%' : computed.height}`);
  }
  const existing = copy.getAttribute('style');
  copy.setAttribute('style', `${declarations.join(';')}${existing ? `;${existing}` : ''}`);
  const originals = Array.from(original.children);
  const copies = Array.from(copy.children);
  originals.forEach((child, index) => copies[index] && inlineStyles(child, copies[index]));
}

// ---- Cleaning ----------------------------------------------------------------

const EDITOR_ONLY = ['[data-block-chrome]', '.ProseMirror-trailingBreak', '.ProseMirror-separator', '.ProseMirror-gapcursor', '.recharts-tooltip-wrapper'];
const DROP_ATTRIBUTES = /^(contenteditable|draggable|spellcheck|tabindex|translate|data-node-view-[\w-]+|data-placeholder|data-testid|aria-[\w-]+|role)$/;

function clean(root: Element): void {
  root.querySelectorAll(EDITOR_ONLY.join(',')).forEach((node) => node.remove());
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      if (DROP_ATTRIBUTES.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') ?? '';
      if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute('href');
    }
  }
}

/** Tick boxes carry their state as a property; the copy needs it as an attribute. */
function freezeCheckboxes(original: Element, copy: Element): void {
  const boxes = Array.from(original.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  const copies = Array.from(copy.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  boxes.forEach((box, index) => {
    const target = copies[index];
    if (!target) return;
    if (box.checked) target.setAttribute('checked', '');
    target.setAttribute('disabled', '');
  });
}

/** Attachments load through the app's own protocol; embed them so the file stands alone. */
async function embedImages(root: Element): Promise<void> {
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map(async (image) => {
      const src = image.getAttribute('src') ?? '';
      if (!src || src.startsWith('data:')) return;
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        image.setAttribute('src', data);
      } catch {
        // Left as a link; it still shows in the PDF, which prints inside the app.
      }
    }),
  );
}

// ---- Rich blocks ---------------------------------------------------------------

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

const LABELS: Record<BlockKind, string> = { callout: 'Callout', chart: 'Chart', kpi: 'KPI', roadmap: 'Roadmap', mermaid: 'Diagram' };

/** A rich block that could not be drawn: its source, labelled, in a quiet well. */
const sourceBlock = ({ kind, source }: RichSource) =>
  `<figure class="block-source"><figcaption>${LABELS[kind]}</figcaption><pre><code>${escapeHtml(source)}</code></pre></figure>`;

/** Diagrams carry literal colors; in the dark theme they are drawn again for paper. */
async function lightDiagram(source: string): Promise<string | null> {
  try {
    const { renderDiagram } = await import('../../editor/blocks/mermaid/render');
    await import('mermaid');
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b5bd6';
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = 'light';
    try {
      return await renderDiagram(source, accent, false);
    } finally {
      root.dataset.theme = previous;
    }
  } catch {
    return null;
  }
}

// ---- Entry points --------------------------------------------------------------

export interface CapturedBody {
  html: string;
  css: string;
  hasCode: boolean;
}

/** The open editor for `path`'s page, if it is on screen. */
export function findEditor(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.ProseMirror[aria-label="Page body"]');
}

/** Serialize the open editor (see the note at the top). */
export async function captureEditor(editor: HTMLElement, markdown: string): Promise<CapturedBody> {
  const sources = richSources(markdown);
  const copy = editor.cloneNode(true) as HTMLElement;
  const blocks = Array.from(editor.querySelectorAll('.rich-block'));
  const copies = Array.from(copy.querySelectorAll('.rich-block'));

  const css = inLightTheme(() => {
    freezeCheckboxes(editor, copy);
    blocks.forEach((block, index) => {
      const target = copies[index];
      if (!target) return;
      // The block's toolbar (Preview · Edit · ⋯) is interface, not content.
      const frame = block.firstElementChild;
      const targetFrame = target.firstElementChild;
      if (!frame || !targetFrame) return;
      const content = Array.from(frame.children)
        .map((child, childIndex) => [child, targetFrame.children[childIndex]] as const)
        .filter(([child, copied]) => copied && !child.querySelector('[role="radiogroup"]'));
      content.forEach(([child, copied]) => inlineStyles(child, copied));
      target.replaceChildren(...content.map(([, copied]) => copied).filter((node) => node.parentNode));
      target.setAttribute('class', 'rich-block not-prose');
      target.removeAttribute('style');
    });
    const rules = proseRules().join('\n');
    const inlineVars = Array.from(copy.querySelectorAll('[style*="var("]'), (node) => node.getAttribute('style') ?? '').join(';');
    return `${tokenBlock(rules + inlineVars)}\n${rules}`;
  });

  // Pair rendered blocks with their fences: diagrams re-drawn for paper, anything unrendered shows its source.
  if (sources.length === copies.length) {
    await Promise.all(
      copies.map(async (target, index) => {
        const source = sources[index];
        if (source.kind === 'mermaid' && isDark()) {
          const svg = await lightDiagram(source.source);
          if (svg) target.innerHTML = `<figure class="diagram">${svg}</figure>`;
        }
        if (!target.querySelector('svg, div, span')) target.outerHTML = sourceBlock(source);
      }),
    );
  }

  clean(copy);
  await embedImages(copy);
  return { html: copy.innerHTML, css, hasCode: Boolean(copy.querySelector('pre, code')) };
}

/** Render Markdown when no editor is on screen; rich blocks show their source. */
export async function renderMarkdown(markdown: string): Promise<CapturedBody> {
  const renderer = new marked.Renderer();
  const code = renderer.code.bind(renderer);
  renderer.code = (token) => {
    const kind = blockKind(token.lang, token.text);
    return kind ? sourceBlock({ kind, source: token.text }) : code(token);
  };
  const html = await marked.parse(markdown, { renderer, gfm: true });
  const container = document.createElement('div');
  container.innerHTML = html;
  // GitHub task lists become the reading view's round checkboxes.
  container.querySelectorAll('li').forEach((item) => {
    const box = item.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
    if (!box) return;
    item.parentElement?.setAttribute('data-type', 'taskList');
    const checked = box.hasAttribute('checked');
    box.remove();
    item.setAttribute('data-checked', String(checked));
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('disabled', '');
    if (checked) input.setAttribute('checked', '');
    label.append(input);
    const body = document.createElement('div');
    body.append(...Array.from(item.childNodes));
    item.replaceChildren(label, body);
  });
  await embedImages(container);
  const css = inLightTheme(() => {
    const rules = proseRules().join('\n');
    return `${tokenBlock(rules)}\n${rules}`;
  });
  return { html: container.innerHTML, css, hasCode: Boolean(container.querySelector('pre, code')) };
}
