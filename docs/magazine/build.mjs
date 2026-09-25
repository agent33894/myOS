#!/usr/bin/env node
// myOS Next · Issue 04 · The Plain Text Issue
// Markdown (articles/, capabilities/) + screenshots → issue/index.html (paginated
// in headless Chromium) → myOS-Next-Issue-04.pdf, with page previews.
// Usage: node docs/magazine/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ISSUE = path.join(ROOT, 'issue');
const IMAGES = path.join(ISSUE, 'images');
const SHOTS = process.env.MYOS_SHOTS || '/tmp/next-shots/final';
const PREVIEWS = process.env.MYOS_PREVIEWS || '/tmp/next-magazine-previews';
const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium';
const PDF = path.join(ROOT, 'myOS-Next-Issue-04.pdf');
const PUB = 'myOS Next · Issue 04 · The Plain Text Issue';
const { marked } = await import(
  pathToFileURL(path.resolve(ROOT, '../../dashboard/node_modules/marked/lib/marked.esm.js')).href
);
const log = (...a) => console.log('·', ...a);

// ------------------------------------------------------------------ helpers
marked.use({ gfm: true });
const md = (s) => marked.parse(s);
const mdi = (s) => marked.parseInline(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n, w = 2) => String(n).padStart(w, '0');

// Curly quotes outside tags and code; key glyphs get <kbd>.
function typeset(html) {
  return html
    .split(/(<code>[\s\S]*?<\/code>|<pre[\s\S]*?<\/pre>|<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) return part;
      return part
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/(^|[\s(\[—–-])"/g, '$1“')
        .replace(/"/g, '”')
        .replace(/(^|[\s(\[—–-])'/g, '$1‘')
        .replace(/'/g, '’')
        .replace(/([⌥⇧⌃]*⌘[⇧⌥]*(?:Enter|Backspace|-click|[A-Z0-9.,\\])?|Ctrl-(?:Shift-)?(?:Tab|Enter|E)\b|Shift-Enter)/g, '<kbd>$1</kbd>');
    })
    .join('');
}

// Light syntax colouring for Markdown shown as code: tags, checkboxes, fences.
function tintCode(html) {
  return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_, attrs, code) => {
    const lang = (attrs.match(/language-(\w+)/) || [])[1] || '';
    let c = code;
    if (lang === 'bash') c = c.replace(/^(\$ )?(myos-next|echo)/gm, (m, p = '', cmd) => `<span class="t-prompt">${p}</span><span class="t-cmd">${cmd}</span>`);
    c = c
      .replace(/(^|\s)(#[A-Za-z][\w/-]*)/g, '$1<span class="t-tag">$2</span>')
      .replace(/(^\s*(?:[-*]|\d+\.) )(\[[ x-]\])/gm, '$1<span class="t-box">$2</span>')
      .replace(/^(```\w*.*|---)$/gm, '<span class="t-fence">$1</span>');
    return `<pre class="lang-${lang || 'text'}"><code>${c}</code></pre>`;
  });
}

function renderBody(src) {
  // :::sidebar … ::: blocks become <aside class="ref">
  const out = [];
  const re = /^:::sidebar\s*\n([\s\S]*?)\n:::\s*$/gm;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out.push(md(src.slice(last, m.index)));
    out.push(`<aside class="ref">${md(m[1])}</aside>`);
    last = m.index + m[0].length;
  }
  out.push(md(src.slice(last)));
  let html = out.join('\n');
  html = html.replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, '<blockquote class="pull"><p>$1</p></blockquote>');
  html = html.replace(/<table>/g, '<table class="tbl">');
  return typeset(tintCode(html));
}

function parseArticle(file) {
  const text = fs.readFileSync(path.join(ROOT, 'articles', file), 'utf8');
  const lines = text.split('\n');
  const h = lines.findIndex((l) => l.startsWith('# '));
  const title = lines[h].slice(2).trim();
  let i = h + 1;
  while (!lines[i].trim()) i++;
  const dek = lines[i].replace(/^\*\*|\*\*$/g, '').trim();
  i++;
  while (!lines[i].trim()) i++;
  const byline = /^By /.test(lines[i]) ? lines[i++].trim() : '';
  return { title, dek, byline, body: lines.slice(i).join('\n').trim(), raw: text };
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1);
    data[line.slice(0, i).trim()] = v;
  }
  return { data, body: m[2].trim() };
}

// ------------------------------------------------------------------ images
// The crop-rectangle technique: every picture names a key rectangle (percent of
// the screenshot: x0 y0 x1 y1) that must stay whole. The rectangle is widened
// around its centre to the aspect of the box it fills, as far as the screenshot
// allows; any shortfall is matted in the screenshot's own canvas colour. So a
// dialog, popover, or button inside the key rectangle is never clipped.
const DPI = 220;
const shotCache = new Map();
function shotInfo(name) {
  if (shotCache.has(name)) return shotCache.get(name);
  const file = path.join(SHOTS, `${name}.png`);
  if (!fs.existsSync(file)) throw new Error(`Missing screenshot ${file}`);
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().split(' ').map(Number);
  const bg = execFileSync('magick', [file, '-crop', '8x8+4+4', '+repage', '-resize', '1x1!', '-format', '%[hex:u.p{0,0}]', 'info:']).toString().trim();
  const info = { file, w, h, bg: `#${bg.slice(0, 6)}` };
  shotCache.set(name, info);
  return info;
}
const used = new Set();
function shot(name, rect, boxW, boxH, opts = {}) {
  const s = shotInfo(name);
  const [x0, y0, x1, y1] = String(rect).trim().split(/[\s,]+/).map(Number);
  let cx = ((x0 + x1) / 200) * s.w;
  let cy = ((y0 + y1) / 200) * s.h;
  let cw = ((x1 - x0) / 100) * s.w;
  let ch = ((y1 - y0) / 100) * s.h;
  const a = boxW / boxH;
  if (cw / ch < a) cw = Math.min(s.w, ch * a);
  else ch = Math.min(s.h, cw / a);
  const fit = (c, size, max) => Math.min(Math.max(c - size / 2, 0), max - size);
  const left = Math.round(fit(cx, cw, s.w));
  const top = Math.round(fit(cy, ch, s.h));
  cw = Math.round(cw);
  ch = Math.round(ch);
  const outW = Math.min(cw, Math.round((boxW / 25.4) * DPI));
  const key = `${name}--${left}-${top}-${cw}-${ch}-${outW}`;
  const out = path.join(IMAGES, `${key}.jpg`);
  used.add(`${key}.jpg`);
  if (!fs.existsSync(out)) {
    execFileSync('magick', [s.file, '-crop', `${cw}x${ch}+${left}+${top}`, '+repage', '-resize', `${outW}x`, '-colorspace', 'sRGB', '-strip', '-sampling-factor', '4:2:0', '-quality', '80', out]);
  }
  const pos = opts.pos || 'center';
  return `<div class="shot ${opts.cls || ''}" style="width:${boxW}mm;height:${boxH}mm;background:${s.bg}"><img src="images/${key}.jpg" style="object-position:${pos}" alt=""></div>`;
}
const isDark = (name) => /-dark$/.test(name);

// ------------------------------------------------------------------ content
// Article running order. opener: numeral | spread | noir | keys | terminal.
const ARTICLES = [
  {
    file: '02-the-idea.md', id: 'a-02', no: '02', kicker: 'Cover story', opener: 'noir', toc: 'Why a directory of Markdown files is the right home for notes and tasks.',
    image: '00-hero-dark', rect: '0 0 100 100', caption: 'The whole window, dark theme: the folder on the left, the note on its sheet, the Outline on the right, and the status bar along the bottom.',
    figures: [{ image: '19-onboarding-light', rect: '35 23 65 75', h: 48, caption: 'The first screen. Open a folder, or start a small one in Documents/Notes.' }],
  },
  { file: '03-a-line-is-a-task.md', id: 'a-03', no: '03', kicker: 'Tasks', opener: 'numeral', toc: 'A task is a checkbox line in any note, and every edit touches that line only.' },
  {
    file: '04-views.md', id: 'a-04', no: '04', kicker: 'Views', opener: 'spread', toc: 'A search written as one line of text, in four places.',
    image: '04-query-help-light', rect: '34 3 80 90', caption: 'The Tasks screen with the query bar’s help open. The whole language fits in one popover.',
  },
  { file: '05-the-daily-note.md', id: 'a-05', no: '05', kicker: 'The daily note', opener: 'numeral', toc: 'A file named for today, where captured lines go.' },
  {
    file: '06-your-files-stay-yours.md', id: 'a-06', no: '06', kicker: 'Safety', opener: 'noir', toc: 'How saves are checked, what is kept, and when the network is used.',
    image: '15-history-dark', rect: '17 11 83 89', caption: 'History for one note: Git commits and local copies in one list, each with a diff from that version to now, and Restore this version.',
    figures: [{ image: '14-changes-light', rect: '80 4 100 47', h: 59, caption: 'The Changes panel: branch and upstream, Pull and Push, the changed files, a Summary, a Description, and the commit button.' }],
  },
  { file: '07-keyboard.md', id: 'a-07', no: '07', kicker: 'Keyboard', opener: 'keys', toc: 'Files, commands, source mode, Vim keys, tabs, and splits.' },
  {
    file: '08-the-look.md', id: 'a-08', no: '08', kicker: 'Design', opener: 'spread', toc: 'One raised page, two thin columns, and a monospace for facts.',
    image: '17-focus-light', rect: '0 0 100 100', caption: 'Focus mode, light theme: the sheet on its tinted canvas, and a small Exit focus button in the top corner.',
    figures: [{ image: '18-settings-appearance-light', rect: '35 10 80 37', h: 17, caption: 'Appearance: the theme, and one accent, from which every other shade is mixed.' }],
  },
  {
    file: '09-terminal.md', id: 'a-09', no: '09', kicker: 'Terminal', opener: 'terminal', toc: 'What each myos-next subcommand does, and what it prints.',
    image: '20-terminal-dark', rect: '0 0 100 100', caption: 'add, today, and tasks in a terminal, on the folder the app has open.',
  },
];

function loadCaps() {
  return fs.readdirSync(path.join(ROOT, 'capabilities'))
    .filter((f) => /^\d\d-.*\.md$/.test(f)).sort()
    .map((f) => {
      const { data, body } = frontmatter(fs.readFileSync(path.join(ROOT, 'capabilities', f), 'utf8'));
      return { ...data, no: Number(data.no), body, file: f };
    });
}

// Capability layouts. Pages alternate: sheet (picture above), column (tall
// picture beside), duo (light over dark), noir (dark page), spread (bleed
// picture facing a text page). Spreads start on a left-hand page.
const LAYOUT = {
  1: { layout: 'column', image: '01-folder-light', rect: '0 0 26 100' },
  2: { layout: 'sheet', image: '08-rendered-light', rect: '28 0 88 100' },
  3: { layout: 'sheet', image: '09-properties-light', rect: '25 12 72 55', wide: true },
  4: { layout: 'duo', image: '02-today-light', image2: '02-today-dark', rect: '33 3 83 92', h: 100 },
  5: { layout: 'spread', image: '03-tasks-dark', rect: '30 1 82 99' },
  6: { layout: 'sheet', image: '18-settings-appearance-light', rect: '35 38.5 80 70.5', h: 88 },
  7: { layout: 'noir', image: '05-view-block-dark', rect: '35 4 80 84' },
  8: { layout: 'spread', image: '06-capture-dark', rect: '25 5 75 60' },
  9: { layout: 'spread', image: '07-source-vim-dark', rect: '30 0 83 100' },
  10: { layout: 'panel', image: '09-properties-light', rect: '72.6 0 100 45' },
  11: { layout: 'column', image: '10-backlinks-light', rect: '79 4 100 90' },
  12: { layout: 'duo', image: '11-switcher-dark', image2: '12-command-bar-dark', rect: '28.5 8.5 71.5 40.5', rect2: '28.5 8.5 71.5 57.5', h: 68, labels: ['⌘P · Open a file', '⌘K · Commands'] },
  13: { layout: 'sheet', image: '13-split-light', rect: '0 0 100 100', wide: true },
  14: { layout: 'noir', image: '14-changes-diff-dark', rect: '17 11 83 89' },
  15: { layout: 'sheet', image: '15-history-light', rect: '17 11 83 89', wide: true },
  16: { layout: 'sheet', image: '16-conflict-light', rect: '32 3 84 52', wide: true },
  17: { layout: 'noir', image: '17-focus-dark', rect: '18 0 100 100' },
  18: { layout: 'spread', image: '20-terminal-dark', rect: '0 0 100 100' },
};

// ------------------------------------------------------------------ page parts
const folio = (cls = '') => `<div class="folio ${cls}"><span class="num"></span><span class="pub">${PUB}</span></div>`;
const hash = (n) => `<span class="md-mark">${'#'.repeat(n)}</span>`;

function capText(c, opts = {}) {
  return `
  <header class="c-head">
    <p class="c-kicker"><span class="c-kno">${pad(c.no)}</span><span>${esc(c.name)}</span></p>
    <h2 class="c-title">${typeset(esc(c.headline))}</h2>
    <p class="c-dek">${typeset(mdi(c.dek))}</p>
    <div class="c-numeral">${pad(c.no)}</div>
  </header>
  <div class="c-body fit">${typeset(tintCode(md(c.body)))}</div>
  <footer class="c-foot">
    <p class="c-how"><span class="lbl">How</span><span class="how-text">${typeset(mdi(c.how))}</span></p>
    ${opts.noCaption ? '' : `<p class="c-cap"><span class="lbl">${opts.capLabel || 'Fig.'}</span>${typeset(mdi(c.caption))}</p>`}
  </footer>`;
}

function capPages(c) {
  const L = LAYOUT[c.no];
  if (!L) throw new Error(`No layout for capability ${c.no}`);
  const id = `c-${pad(c.no)}`;
  const big = '';
  switch (L.layout) {
    case 'sheet':
      return `<section class="page cap cap-sheet ${L.wide ? 'wide' : ''}" id="${id}">
        <figure class="c-fig">${shot(L.image, L.rect, 198, L.h || (L.wide ? 124 : 150))}</figure>
        ${big}<div class="c-text">${capText(c, { capLabel: 'Above' })}</div>${folio()}</section>`;
    case 'column':
      return `<section class="page cap cap-column" id="${id}">
        <figure class="c-fig">${shot(L.image, L.rect, 78, 252, { pos: 'top' })}</figure>
        <div class="c-text">${big}${capText(c, { capLabel: 'Left' })}</div>${folio()}</section>`;
    case 'panel': {
      const [x0, y0, x1, y1] = L.rect.split(' ').map(Number);
      const s = shotInfo(L.image);
      const h = Math.round((96 * ((y1 - y0) * s.h)) / ((x1 - x0) * s.w));
      return `<section class="page cap cap-panel" id="${id}">
        <figure class="c-fig">${shot(L.image, L.rect, 96, h)}</figure>
        <div class="c-text">${capText(c, { capLabel: 'Left' })}</div>${folio()}</section>`;
    }
    case 'duo':
      return `<section class="page cap cap-duo ${isDark(L.image) ? 'dark' : ''}" id="${id}">
        <figure class="c-fig a">${shot(L.image, L.rect, 96, L.h)}${L.labels ? `<figcaption>${typeset(L.labels[0])}</figcaption>` : '<figcaption>Light</figcaption>'}</figure>
        <figure class="c-fig b">${shot(L.image2, L.rect2 || L.rect, 96, L.h)}${L.labels ? `<figcaption>${typeset(L.labels[1])}</figcaption>` : '<figcaption>Dark</figcaption>'}</figure>
        <div class="c-text">${big}${capText(c, { capLabel: 'Above' })}</div>${folio()}</section>`;
    case 'noir':
      return `<section class="page cap cap-noir dark" id="${id}">
        <figure class="c-fig">${shot(L.image, L.rect, 198, 142)}</figure>
        ${big}<div class="c-text">${capText(c, { capLabel: 'Above' })}</div>${folio()}</section>`;
    case 'spread':
      return `<section class="page cap cap-bleed nofolio ${isDark(L.image) ? 'dark' : ''}" id="${id}">
        ${shot(L.image, L.rect, 230, 300, { cls: 'bleed' })}
        <p class="bleed-tag">${pad(c.no)} · ${esc(c.name)}</p>
      </section>
      <section class="page cap cap-facing">
        ${big}<div class="c-text">${capText(c, { capLabel: 'Opposite' })}</div>${folio()}</section>`;
    default:
      throw new Error(`Unknown layout ${L.layout}`);
  }
}

// --- articles: flows that the paginator pours into page frames
function articleFlow(a) {
  const art = parseArticle(a.file);
  const d = { opener: a.opener, kicker: a.kicker, title: art.title, no: a.no, id: a.id };
  if (a.image) {
    d.bleed = shot(a.image, a.rect, 230, 300, { cls: 'bleed' });
    d.top = shot(a.image, a.rect, 198, 118);
    d.caption = a.caption;
    d.dark = isDark(a.image) ? '1' : '';
  }
  const attrs = Object.entries(d).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  const figures = (a.figures || []).map((f) =>
    `<figure class="mfig">${shot(f.image, f.rect, 44, f.h)}<figcaption>${typeset(esc(f.caption))}</figcaption></figure>`).join('');
  return `
  <div class="flow ${a.opener === 'terminal' ? 'flow-dark flow-mono' : ''}" ${attrs}>
    <header class="flow-head">
      <p class="op-kicker"><span class="op-no">${a.no}</span>${esc(a.kicker)}</p>
      <h1 class="op-title">${hash(1)}${typeset(esc(art.title))}</h1>
      <p class="op-dek">${typeset(mdi(art.dek))}</p>
      ${art.byline ? `<p class="byline">${esc(art.byline)}</p>` : ''}
    </header>
    <div class="flow-body">${renderBody(art.body)}</div>
    <div class="flow-figures">${figures}</div>
  </div>`;
}

// --- the letter, set as the Markdown file it is, with line numbers
function letterPage() {
  const text = fs.readFileSync(path.join(ROOT, 'articles', '01-letter.md'), 'utf8').trim();
  const fm = ['---', 'title: A Folder, Opened as It Is', 'issue: 04', 'season: Winter 2026', 'tags: [letter, plain-text]', '---'];
  const lines = [...fm, ...text.split('\n').filter((l, i) => !(i === 0 && /^Issue 04/.test(l)))];
  const tint = (l) => {
    let h = esc(l);
    if (/^---$/.test(l)) return `<span class="t-fence">${h}</span>`;
    if (/^\w+: /.test(l) && lines.indexOf(l) < fm.length) return h.replace(/^(\w+):/, '<span class="t-key">$1</span>:');
    if (/^# /.test(l)) return `<span class="t-h1"><span class="md-mark">#</span> ${esc(l.slice(2))}</span>`;
    if (/^&gt; /.test(h)) return `<span class="t-quote"><span class="md-mark">&gt;</span> ${h.slice(5)}</span>`;
    return h
      .replace(/\*\*(.+?)\*\*/g, '<span class="md-mark">**</span><b>$1</b><span class="md-mark">**</span>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<span class="md-mark">*</span><i>$2</i><span class="md-mark">*</span>')
      .replace(/`([^`]+)`/g, '<span class="md-mark">`</span><span class="t-code">$1</span><span class="md-mark">`</span>');
  };
  const rows = lines.map((l, i) => `<div class="ln"><span class="n">${i + 1}</span><span class="t">${tint(l) || '&nbsp;'}</span></div>`).join('');
  return `
  <section class="page manuscript" id="a-01">
    <div class="ms-bar"><span>01-letter.md</span><span>Letter from the editors</span><span>Markdown · UTF-8 · LF</span></div>
    <div class="ms-body">${rows}</div>
    <div class="ms-status"><span>main</span><span>${text.split(/\s+/).length} words</span><span>Saved</span></div>
    ${folio()}
  </section>`;
}

// ------------------------------------------------------------------ static pages
function coverPage() {
  return `
  <section class="page cover nofolio">
    <div class="cv-top"><span>Issue 04</span><span>Winter 2026</span><span>Markdown · macOS and Linux</span></div>
    <h1 class="cv-mast">myOS<span class="cv-next">Next<span class="caret"></span></span></h1>
    <p class="cv-issue"><span class="md-mark">#</span> The Plain Text Issue</p>
    <div class="cv-shot">${shot('00-hero-dark', '0 0 100 100', 198, 124)}</div>
    <div class="cv-lines">
      <p><span class="cl-n">03</span>A Line Is a Task <em>Checkbox lines, anywhere</em></p>
      <p><span class="cl-n">04</span>One Line of Query <em>Views, in four places</em></p>
      <p><span class="cl-n">06</span>Your Files Stay Yours <em>Saves that check first</em></p>
      <p><span class="cl-n">18</span>The Capabilities <em>Photographed, light and dark</em></p>
    </div>
    <div class="cv-num">04</div>
    <p class="cv-foot"><code>- [ ] Read this issue 📅 2026-12-01 #plain-text</code></p>
  </section>`;
}

function insideCover() {
  return `
  <section class="page inside-cover dark nofolio">
    ${shot('02-today-dark', '27 0 97 100', 230, 300, { cls: 'bleed' })}
    <p class="bleed-caption"><span class="lbl">Today</span>Friday, 25 September. The daily note on top, and below it what is late and what is due, gathered from the whole folder.</p>
  </section>`;
}

function contentsPage(caps) {
  const arts = ARTICLES.map((a) => {
    const art = parseArticle(a.file);
    const short = a.toc;
    return `<li><span class="ct-p" data-ref="${a.id}"></span><span class="ct-b"><span class="ct-k">${esc(a.kicker)}</span><span class="ct-t">${typeset(esc(art.title))}</span><span class="ct-d">${typeset(mdi(short))}</span></span></li>`;
  }).join('');
  const capl = caps.map((c) => `<li><span class="cc-n">${pad(c.no)}</span><span class="cc-t">${esc(c.name)}</span><span class="cc-p" data-ref="c-${pad(c.no)}"></span></li>`).join('');
  return `
  <section class="page contents">
    <p class="kicker-line"><span>Contents</span><span>Issue 04 · Winter 2026</span></p>
    <h2 class="ct-title">${hash(2)} In this issue</h2>
    <div class="ct-grid">
      <ol class="ct-arts">
        <li><span class="ct-p" data-ref="a-01"></span><span class="ct-b"><span class="ct-k">Letter</span><span class="ct-t">A Folder, Opened as It Is</span><span class="ct-d">Set as the Markdown file it was written in.</span></span></li>
        ${arts}
      </ol>
      <div class="ct-side">
        <p class="ct-sh"><span data-ref="caps"></span>The Capabilities</p>
        <ol class="ct-caps">${capl}</ol>
        <p class="ct-sh"><span data-ref="ref"></span>Quick reference</p>
        <p class="ct-sh"><span data-ref="colophon"></span>Colophon</p>
      </div>
    </div>
    ${folio()}
  </section>`;
}

function alwaysTrue() {
  return `
  <section class="page always">
    <p class="kicker-line"><span>Always true</span><span>From the product model</span></p>
    <h2 class="at-title">Three sentences<br><em>every feature has to pass.</em></h2>
    <ol class="at-list">
      <li><span class="at-n">1</span><span>Plain Markdown in, plain Markdown out. <em>Untouched text is never reformatted.</em></span></li>
      <li><span class="at-n">2</span><span>No account, no telemetry, no bundled AI. <em>The network is used only when you click Pull or Push.</em></span></li>
      <li><span class="at-n">3</span><span>The folder works the same in any other editor, in Obsidian, and in Git.</span></li>
    </ol>
    ${folio()}
  </section>`;
}

function interlude(text, cite, cls = '') {
  return `<section class="page interlude nofolio ${cls}"><p class="il">${text}</p><p class="il-cite">${cite}</p></section>`;
}

function capsDivider(caps) {
  const list = caps.map((c) => `<li><span>${pad(c.no)}</span>${esc(c.name)}</li>`).join('');
  return `
  <section class="page divider dark nofolio">
    <div class="dv-num">18</div>
    <p class="dv-cap">The Capabilities · Photographed in the light and dark themes</p>
  </section>
  <section class="page divider-r" id="caps">
    <p class="kicker-line"><span>Section two</span><span>The Capabilities</span></p>
    <h2 class="dv-title">Eighteen things<br><em>it does, exactly.</em></h2>
    <p class="dv-dek">One page for each. What it is, what it writes to your files, and the key or command that does it. Every picture is the app, in its light or dark theme, on a folder of notes for a small Go library called harbor.</p>
    <ol class="dv-list">${list}</ol>
    ${folio()}
  </section>`;
}

function refRows(rows) {
  return rows.map(([k, v]) => `<tr><td>${typeset(mdi(k))}</td><td>${typeset(mdi(v))}</td></tr>`).join('');
}
function quickRef() {
  const keys = [
    ['⌘P', 'Open a file · ⌘Enter opens it to the side'], ['⌘K', 'Commands'], ['⌘N', 'Capture a line'], ['⌥⌘N', 'New note in this folder'],
    ['⌘E', 'Rendered or Markdown source'], ['⌘F', 'Find in note'], ['⌘\\', 'Split to the right, or back to one'],
    ['⌘1 – ⌘8 · ⌘9', 'Go to tab · the last tab'], ['⌘W', 'Close tab'], ['⌘B · ⌥⌘B', 'Files · right panel'], ['⌘.', 'Focus mode · Esc leaves it'],
    ['⌘⇧Enter', 'Open Changes, then commit'], ['⌘Z · ⌘⇧Z', 'Undo · redo a file change'], ['⌘,', 'Settings'], ['`?`', 'Every shortcut'],
  ];
  const rows = [['`x` or Space', 'Check off'], ['`d` · `s`', 'Due · scheduled date'], ['`t`', 'Add a tag'], ['`j` · `k`', 'Next · previous row'], ['Enter · ⌘Enter', 'Open at the line · to the side']];
  const syntax = [
    ['`- [ ]` · `[x]` · `[-]`', 'Open · done · cancelled'], ['`📅 2026-10-02`', 'Due, or `due:2026-10-02`'], ['`⏳ 2026-09-30`', 'Scheduled'],
    ['`🛫 2026-09-28`', 'Start'], ['`✅ 2026-09-29`', 'Done on; written when checked'], ['`🔁 every week`', 'Repeats; `when done` counts from completion'],
    ['`🔺 ⏫ 🔼 🔽 ⏬`', 'Priority, highest to lowest'], ['`#work/api`', 'Tag; `#work` finds it too'],
  ];
  const query = [
    ['`open` · `done` · `overdue`', 'Status'], ['`due<=today`', 'Also `scheduled`, `start`, `done`; `< <= = >= >`'],
    ['`today+7` · `2026-10-01`', 'Dates: `today`, `tomorrow`, `yesterday`, offsets'], ['`due=none`', 'No due date'],
    ['`#tag` · `-#tag`', 'With or without a tag'], ['`path:docs/` · `file:api`', 'Folder prefix · name contains'],
    ['`path:.` · `file:this`', 'In a block: this note’s folder · this note'], ['`parser` · `"rate limit"`', 'Words or a phrase'],
    ['`sort:due` · `priority` · `file`', 'Task order; notes: `file`, `title`, `modified`'], ['`group:file` · `folder` · `tag` · `date`', 'Sections'],
    ['`limit:20`', 'At most this many'], ['`kind:notes`', 'In a `view` block: list notes'],
  ];
  const cli = [
    ['`myos-next add "…"`', 'Add a line to today’s note'], ['`myos-next today`', 'Late and today’s tasks'], ['`myos-next tasks "open #x"`', 'Tasks for a view'],
    ['`myos-next find words`', 'Notes: title, tab, path'], ['`myos-next open path`', 'Show a file in the app'],
  ];
  const card = (title, rows, cls = '') => `<div class="qr-card ${cls}"><h3>${title}</h3><table>${refRows(rows)}</table></div>`;
  return `
  <section class="page quickref qr-l" id="ref">
    <p class="kicker-line"><span>Quick reference</span><span>⌘ is Ctrl on Linux</span></p>
    <h2 class="qr-title">${hash(2)} Keep this page open</h2>
    <div class="qr-grid">
      ${card('Keys', keys, 'span')}
      ${card('In a task list', rows)}
      ${card('Terminal', cli)}
    </div>
    ${folio()}
  </section>
  <section class="page quickref qr-r">
    <div class="qr-grid">
      ${card('A task line', syntax)}
      ${card('A view block', [['<code>```view</code>', 'Query on the first line, or on the lines inside'], ['<code>```view kind:notes</code>', 'Lists notes instead of tasks']])}
      ${card('A view, one line', query, 'span')}
    </div>
    <pre class="qr-sample"><code><span class="t-fence">\`\`\`view</span>
open due&lt;=today+7 <span class="t-tag">#release</span> group:date
<span class="t-fence">\`\`\`</span></code></pre>
    ${folio()}
  </section>`;
}

function colophonPage() {
  return `
  <section class="page colophon" id="colophon">
    <p class="kicker-line"><span>Colophon</span><span>Issue 04 · Winter 2026</span></p>
    <h2 class="colo-title">Set in <em>three</em> faces,<br>written in one format.</h2>
    <div class="colo-grid">
      <div>
        <p class="lbl">Typefaces</p>
        <p><span class="f-inst">Instrument Serif</span> for headlines, by Rodrigo Fuenzalida and Jordan Egstad.</p>
        <p><span class="f-src">Source Serif 4</span> for text, by Frank Grießhammer for Adobe.</p>
        <p><span class="f-mono">Geist Mono</span> and <span class="f-sans">Geist</span> for numerals, labels, and anything literal, by Vercel. Geist Mono is also the monospace of myOS Next.</p>
      </div>
      <div>
        <p class="lbl">Method</p>
        <p>Every article and capability page is a Markdown file. A Node script renders them with <code>marked</code>, pours the text into pages in headless Chromium, and prints the PDF. The pictures are cropped with ImageMagick around a rectangle that must stay whole, so no dialog, popover, or button is cut.</p>
        <p class="lbl">Photography</p>
        <p>Screenshots of myOS Next at 3200 × 2000, in the light and dark themes, on a folder of notes for an example library, harbor.</p>
      </div>
      <div>
        <p class="lbl">Sources</p>
        <p>The product model, the file format, the build plan, the architecture overview, and the app’s source. Shortcuts and interface wording were checked against the code.</p>
        <p class="lbl">Rebuild</p>
        <p><code>node docs/magazine/build.mjs</code></p>
        <p class="lbl">Made by</p>
        <p>The myOS Editors. No account, no telemetry, no bundled AI.</p>
      </div>
    </div>
    <div class="specimen">
      <div><p class="sp-a f-inst">Aa</p><p class="sp-l">Instrument Serif · headlines</p></div>
      <div><p class="sp-a f-src">Aa</p><p class="sp-l">Source Serif 4 · text</p></div>
      <div><p class="sp-a f-sans">Aa</p><p class="sp-l">Geist · labels</p></div>
      <div><p class="sp-a f-mono">{ }</p><p class="sp-l">Geist Mono · anything literal</p></div>
    </div>
    <pre class="colo-ls"><code><span class="t-prompt">$</span> ls docs/magazine
articles/  capabilities/  issue/  build.mjs  README.md</code></pre>
    ${folio()}
  </section>`;
}

function backCover() {
  return `
  <section class="page back dark nofolio">
    <pre class="bk-term"><code><span class="t-prompt">~/Notes $</span> ls
daily/  docs/  notes/  README.md
<span class="t-prompt">~/Notes $</span> myos-next add "Read it again in ten years"
Added to daily/2026-12-01.md
<span class="t-prompt">~/Notes $</span> <span class="caret"></span></code></pre>
    <p class="bk-line">The app is a way<br>of looking at the folder.<br><em>The folder is still the thing.</em></p>
    <div class="bk-foot">
      <p class="bk-mast">myOS <span>Next</span></p>
      <p>A quiet editor for any folder of Markdown files. macOS and Linux.<br>No account. No sync service. No telemetry. No bundled AI.</p>
      <p class="bk-issue">Issue 04 · Winter 2026 · The Plain Text Issue</p>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ assemble
function buildSource(caps) {
  const capsHTML = caps.map(capPages).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${PUB}</title>
<link rel="stylesheet" href="magazine.css">
</head>
<body>
<main id="book"></main>
<div id="source">
${coverPage()}
${insideCover()}
${contentsPage(caps)}
${letterPage()}
${alwaysTrue()}
${ARTICLES.map(articleFlow).join('\n')}
<div class="gate" data-want="odd">${interlude('<span class="md-mark">- </span>[ ]', 'A task, before anything is written after it.', 'il-box')}</div>
${capsDivider(caps)}
${capsHTML}
<div class="gate" data-want="odd">${interlude('<span class="md-mark">&gt;</span> Say what a button does.', 'From the product model, on writing')}</div>
${quickRef()}
<div class="gate" data-want="even">${interlude('<span class="md-mark">&gt;</span> Empty states say what to do next <em>in one sentence.</em>', 'From the product model, on writing')}</div>
${colophonPage()}
<div class="gate" data-want="odd">${interlude('<span class="md-mark">- [x]</span> Read this issue', 'Checked off, with today’s date written after it.', 'il-done')}</div>
${backCover()}
</div>
<script>${fs.readFileSync(path.join(ISSUE, 'paginate.js'), 'utf8')}</script>
</body>
</html>`;
}

function chromium(args) {
  return execFileSync(CHROMIUM, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--run-all-compositor-stages-before-draw', ...args], {
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

// ------------------------------------------------------------------ main
fs.mkdirSync(IMAGES, { recursive: true });
const caps = loadCaps();
if (caps.length !== 18) throw new Error(`Expected 18 capability pages, found ${caps.length}`);
const source = path.join(ISSUE, '.source.html');
fs.writeFileSync(source, buildSource(caps));
for (const f of fs.readdirSync(IMAGES)) if (!used.has(f)) fs.rmSync(path.join(IMAGES, f));
log(`${used.size} pictures in issue/images`);
log('paginating in headless Chromium');
let dom = chromium(['--virtual-time-budget=60000', '--window-size=1200,1600', '--dump-dom', pathToFileURL(source).href]).toString();
if (!dom.includes('data-paginated="true"')) throw new Error('Pagination did not finish');
const qa = JSON.parse(dom.match(/<script type="application\/json" id="qa-report">([\s\S]*?)<\/script>/)[1]);
dom = dom
  .replace(/<script type="application\/json" id="qa-report">[\s\S]*?<\/script>/, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(' data-paginated="true"', '');
fs.writeFileSync(path.join(ISSUE, 'index.html'), dom.startsWith('<!DOCTYPE') ? dom : `<!DOCTYPE html>\n${dom}`);
fs.rmSync(source);
log(`${qa.pages} pages`);
for (const r of qa.report) console.warn('  ! ' + r);

log('printing PDF');
chromium(['--no-pdf-header-footer', '--virtual-time-budget=20000', `--print-to-pdf=${PDF}`, pathToFileURL(path.join(ISSUE, 'index.html')).href]);
const mb = fs.statSync(PDF).size / 1048576;
log(`${path.relative(process.cwd(), PDF)} · ${mb.toFixed(1)} MB`);
if (mb > 25) console.warn('  ! PDF is over 25 MB');

fs.rmSync(PREVIEWS, { recursive: true, force: true });
fs.mkdirSync(PREVIEWS, { recursive: true });
execFileSync('pdftoppm', ['-r', process.env.PREVIEW_DPI || '50', '-png', PDF, path.join(PREVIEWS, 'p')]);
log(`previews in ${PREVIEWS}`);
