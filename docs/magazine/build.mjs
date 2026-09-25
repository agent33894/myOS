#!/usr/bin/env node
// Builds myOS Issue 03: screenshots → issue/images, Markdown → issue/index.html
// (paginated in headless Chromium), then prints myOS-Issue-03.pdf.
// Usage: node docs/magazine/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ISSUE = path.join(ROOT, 'issue');
const IMAGES = path.join(ISSUE, 'images');
const SHOTS = process.env.MYOS_SHOTS || '/tmp/myos3-shots';
const PREVIEWS = process.env.MYOS_PREVIEWS || '/tmp/magazine-previews';
const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium';
const PDF = path.join(ROOT, 'myOS-Issue-03.pdf');
const { marked } = await import(
  pathToFileURL(path.resolve(ROOT, '../../dashboard/node_modules/marked/lib/marked.esm.js')).href
);

const log = (...a) => console.log('·', ...a);

// ---------------------------------------------------------------- images
function importImages() {
  fs.mkdirSync(IMAGES, { recursive: true });
  for (const f of fs.readdirSync(IMAGES)) fs.rmSync(path.join(IMAGES, f));
  const dims = {};
  const shots = fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png')).sort();
  for (const f of shots) {
    const name = f.replace(/\.png$/, '');
    const out = path.join(IMAGES, `${name}.jpg`);
    execFileSync('magick', [
      path.join(SHOTS, f), '-resize', '2400x>', '-colorspace', 'sRGB', '-strip',
      '-sampling-factor', '4:2:0', '-quality', '82', out,
    ]);
    const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', out]).toString().split(' ').map(Number);
    const bg = execFileSync('magick', [out, '-gravity', 'north', '-crop', `${w}x${Math.max(4, Math.round(h * 0.01))}+0+0`, '+repage', '-resize', '1x1!', '-format', '%[hex:u.p{0,0}]', 'info:']).toString().trim();
    dims[name] = { w, h, bg: `#${bg.slice(0, 6)}` };
  }
  log(`imported ${shots.length} screenshots from ${SHOTS}`);
  return dims;
}

// ---------------------------------------------------------------- markdown
marked.use({ gfm: true });
const md = (s) => marked.parse(s);
const mdInline = (s) => marked.parseInline(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function typeset(html) {
  // quotes and small typographic touches, outside tags and code
  return html
    .split(/(<code>[\s\S]*?<\/code>|<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) return part;
      return part
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/(^|[\s(\[—–-])"/g, '$1“')
        .replace(/"/g, '”')
        .replace(/(^|[\s(\[—–-])'/g, '$1‘')
        .replace(/'/g, '’')
        .replace(/ -- /g, ' — ');
    })
    .join('');
}

function renderBody(src) {
  // :::sidebar … ::: blocks become <aside class="sidebar">
  const out = [];
  const re = /^:::sidebar\s*\n([\s\S]*?)\n:::\s*$/gm;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out.push(md(src.slice(last, m.index)));
    out.push(`<aside class="sidebar">${md(m[1])}</aside>`);
    last = m.index + m[0].length;
  }
  out.push(md(src.slice(last)));
  let html = out.join('\n');
  html = html.replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, '<blockquote class="pull"><p>$1</p></blockquote>');
  return typeset(html);
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
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

function parseArticle(file) {
  const text = fs.readFileSync(path.join(ROOT, 'articles', file), 'utf8');
  const [head, ...rest] = text.split(/\n---\n/);
  const body = rest.join('\n---\n');
  const title = head.match(/^# (.+)$/m)[1].trim();
  const dek = (head.match(/^\*(.+)\*$/m) || [])[1] || '';
  const byline = (head.match(/^By (.+)$/m) || [])[0] || '';
  return { title, dek, byline, body };
}

// ---------------------------------------------------------------- image geometry
// Place an image in a box (bw × bh mm) so that a key rectangle of it (x0 y0 x1 y1,
// percent of the image) is wholly visible inside a target area of the box, then
// fill the rest of the box with the surrounding image where there is any. A key
// rectangle is never clipped: dialogs, popovers, and buttons stay whole.
function fitRect(dim, bw, bh, rect, target = [0, 0, bw, bh]) {
  const [x0, y0, x1, y1] = rect.map((v) => v / 100);
  const [tx, ty, tw, th] = target;
  const rw = (x1 - x0) * dim.w;
  const rh = (y1 - y0) * dim.h;
  const s = Math.min(tw / rw, th / rh); // mm per pixel
  const W = dim.w * s;
  const H = dim.h * s;
  let left = tx + tw / 2 - ((x0 + x1) / 2) * W;
  let top = ty + th / 2 - ((y0 + y1) / 2) * H;
  const clamp = (v, size, box) => (size >= box ? Math.min(0, Math.max(box - size, v)) : (box - size) / 2);
  const cl = clamp(left, W, bw);
  const ct = clamp(top, H, bh);
  // keep the key rectangle inside the box even when clamping shifts the image
  const inside = (l, t) => l + x0 * W >= -0.01 && l + x1 * W <= bw + 0.01 && t + y0 * H >= -0.01 && t + y1 * H <= bh + 0.01;
  if (inside(cl, top)) left = cl;
  if (inside(left, ct)) top = ct;
  return { W, H, left, top };
}
function rectOf(v = '0 0 100 100') {
  return String(v).trim().split(/[\s,]+/).map(Number);
}
const px = (g, dx = 0) =>
  `position:absolute;width:${g.W.toFixed(2)}mm;height:${g.H.toFixed(2)}mm;left:${(g.left + dx).toFixed(2)}mm;top:${g.top.toFixed(2)}mm`;
const PW = 230;
const PH = 300;

// ---------------------------------------------------------------- content
const ARTICLES = [
  { file: '07-letter-from-the-editor.md', id: 'a-07', kicker: 'Letter from the Editor', opener: 'letter' },
  {
    file: '01-cover-story.md', id: 'a-01', closing: { image: ['00-hero-today-light', '06-capacity-light'], rect: '33 5 81 50', caption: 'Today in 3.0, in the light theme: what is carried over, what is planned, and an honest line about the hours.' }, kicker: 'Cover Story', opener: 'spread',
    image: ['00-hero-today-dark', '06-capacity-dark'], rect: '33 7 81 64',
    imgcaption: 'Today, in the dark theme.',
  },
  {
    file: '02-the-new-silhouette.md', id: 'a-02', kicker: 'Design', opener: 'noir',
    figures: [
      { image: '08-plan-my-day-light', rect: '57 16 89 58', h: 58, caption: 'One accent, Iris #5B5BD6, and soft depth in place of hairlines: Plan my day in the light theme.' },
    ],
  },
  { file: '03-decisions.md', id: 'a-03', closing: { image: '18-areas-property-light', rect: '33 7 82 42', caption: 'The domain field was kept on disk. In 3.0 it finally surfaces, as an Area you can change on any page.' }, kicker: 'Decisions', opener: 'numeral', numeral: '5' },
  {
    file: '04-under-the-hood.md', id: 'a-04', closing: { image: '18-areas-property-dark', rect: '33 7 82 42', caption: 'Moving a page to another area in 3.0 rests on the same foundation: the file keeps its name, a snapshot is taken first, and Undo puts it back.' }, kicker: 'Engineering', opener: 'spread',
    image: '20-version-history-light', rect: '11 14 90 86',
    imgcaption: 'Every write knows what it is replacing. Version history, new in 3.0, stands on the same revisions.',
  },
  {
    file: '05-the-psychology-of-calm.md', id: 'a-05', closing: { image: '01-repeating-tasks-light', rect: '33 12 73 50', caption: 'A repeating task in 3.0 keeps an honest record, “Done 9 of the last 10 times”, and never a streak.' }, kicker: 'Science', opener: 'spread',
    image: '09-close-the-day-light', rect: '24 26 77 74',
    imgcaption: 'Close the day begins with what got done.',
  },
  {
    file: '06-the-market.md', id: 'a-06', closing: { image: '08-plan-my-day-light', rect: '26 8 90 62', caption: 'Plan my day in 3.0: a calm morning routine on plain Markdown files, on Linux as well as macOS.' }, kicker: 'The Market', opener: 'spread',
    image: '14-tags-light', rect: '33 0 82 90',
    imgcaption: 'A tag page in 3.0, computed on demand from the tags in plain Markdown files.',
  },
  { file: '08-how-we-chose-twenty.md', id: 'a-08', closing: { image: '03-tasks-page-light', rect: '33 7 82 42', caption: 'Tasks: Anytime and Someday. Every task now has a visible home.' }, kicker: 'Process', opener: 'numeral', numeral: '45' },
];

const SECTIONS = ['Tasks and planning', 'Rituals and reflection', 'Notes and knowledge', 'Files and trust'];

function loadFeatures() {
  return fs
    .readdirSync(path.join(ROOT, 'features'))
    .filter((f) => /^\d\d-.*\.md$/.test(f))
    .sort()
    .map((f) => {
      const { data, body } = frontmatter(fs.readFileSync(path.join(ROOT, 'features', f), 'utf8'));
      return { ...data, no: Number(data.no), body, file: f };
    });
}

// ---------------------------------------------------------------- page builders
let DIMS = {};
function pick(img) {
  const list = Array.isArray(img) ? img : [img];
  const name = list.find((n) => DIMS[n]);
  if (!name) throw new Error(`Missing screenshot: ${list.join(' or ')}`);
  return name;
}
const src = (name) => `images/${name}.jpg`;
function imgTag(name, box, rect, target) {
  const g = fitRect(DIMS[name], box[0], box[1], rectOf(rect), target);
  return `<img src="${src(name)}" style="${px(g)}" alt="">`;
}
const folio = (extra = '') => `<div class="folio ${extra}"><span class="num"></span><span class="pub">myOS · Issue 03 · The Calm Issue</span></div>`;
const kbdify = (html) =>
  html.replace(/(⌘[A-Z0-9.,\\]|Ctrl\+[A-Z0-9.]|⌥↑|⌥↓|Esc(?=[ .,)])|⌘K|⌘N)/g, '<kbd>$1</kbd>');

function featureText(f, opts = {}) {
  const no = String(f.no).padStart(2, '0');
  return `
  <header class="f-head">
    <div class="f-no"><span class="f-no-label">No.</span><span class="f-no-num">${no}</span></div>
    <div class="f-kicker"><span>${esc(f.section)}</span><span class="f-name">${esc(f.name)}</span></div>
    <h2 class="f-headline">${esc(f.headline)}</h2>
    <p class="f-dek">${typeset(mdInline(f.dek))}</p>
  </header>
  <div class="f-body fit">${typeset(md(f.body))}</div>
  <footer class="f-foot">
    <p class="f-howto"><span class="label">How to</span>${kbdify(typeset(mdInline(f.howto)))}</p>
    ${opts.caption === false ? '' : `<p class="f-caption"><span class="label">${opts.captionLabel || 'Opposite'}</span>${typeset(mdInline(f.caption))}</p>`}
  </footer>`;
}

function featurePages(f) {
  const id = `f-${String(f.no).padStart(2, '0')}`;
  switch (f.layout) {
    case 'bleed': {
      const name = pick(f.image);
      return `
      <section class="page feature f-bleed-image nofolio" id="${id}">
        <div class="bleed" style="background:${DIMS[name].bg}">${imgTag(name, [PW, PH], f.rect)}</div>
        <div class="bleed-tag">No. ${String(f.no).padStart(2, '0')}</div>
      </section>
      <section class="page feature f-text">${featureText(f)}${folio()}</section>`;
    }
    case 'split': {
      const a = pick(f.image);
      const b = pick(f.image2);
      const h = PH / 2;
      return `
      <section class="page feature f-split-image nofolio" id="${id}">
        <div class="half top">${imgTag(a, [PW, h], f.rect || '3 0 97 100')}<span class="theme-tag">Light</span></div>
        <div class="half bottom">${imgTag(b, [PW, h], f.rect || '3 0 97 100')}<span class="theme-tag">Dark</span></div>
      </section>
      <section class="page feature f-text">${featureText(f, { captionLabel: 'Opposite, light and dark' })}${folio()}</section>`;
    }
    case 'panorama': {
      const name = pick(f.image);
      const g = fitRect(DIMS[name], PW * 2, PH, rectOf(f.rect), [12, 60, PW - 24, PH - 120]);
      return `
      <section class="page feature f-pano nofolio" id="${id}">
        <div class="bleed"><img src="${src(name)}" style="${px(g)}" alt=""></div>
      </section>
      <section class="page feature f-pano f-pano-right">
        <div class="bleed"><img src="${src(name)}" style="${px(g, -PW)}" alt=""></div>
        <div class="panel">${featureText(f, { captionLabel: 'Across the spread' })}</div>
        ${folio('on-image')}
      </section>`;
    }
    case 'framed':
    case 'noir': {
      const name = pick(f.image);
      const box = [PW - 34, 118];
      return `
      <section class="page feature f-single f-${f.layout}" id="${id}">
        <figure class="frame-img">${imgTag(name, box, f.rect)}</figure>
        ${featureText(f, { captionLabel: 'Above' })}
        ${folio()}
      </section>`;
    }
    case 'export': {
      const a = pick(f.image);
      const b = pick(f.image2);
      const box = [PW - 40, (PH - 64) / 2];
      return `
      <section class="page feature f-export-image" id="${id}">
        <figure class="ex ex-a">${imgTag(a, box, f.rect || '0 0 100 100')}<figcaption>PDF</figcaption></figure>
        <figure class="ex ex-b">${imgTag(b, box, f.rect2 || '0 0 100 100')}<figcaption>HTML</figcaption></figure>
        ${folio()}
      </section>
      <section class="page feature f-text">${featureText(f, { captionLabel: 'Opposite' })}${folio()}</section>`;
    }
    default:
      throw new Error(`Unknown layout ${f.layout} in ${f.file}`);
  }
}

function pairPages(fa, fb) {
  // two single-page features facing each other
  return featurePages(fa) + featurePages(fb);
}

function articleFlow(a) {
  const art = parseArticle(a.file);
  let body = art.body;
  let extra = '';
  if (a.id === 'a-04') {
    // The numbers table gets its own page after the article.
    const m = body.match(/## The numbers\n\n([^\n]+)\n\n(\|[\s\S]*?)\n\n/);
    if (m) {
      body = body.replace(m[0], '');
      extra = numbersPage(m[1], m[2]);
    }
  }
  const d = { opener: a.opener, kicker: a.kicker, title: art.title };
  if (a.opener === 'numeral') d.numeral = a.numeral;
  if (a.image) {
    const name = pick(a.image);
    d.img = src(name);
    d.styleSpread = px(fitRect(DIMS[name], PW, PH, rectOf(a.rect), [14, 40, PW - 28, PH - 80]));
    d.styleTop = px(fitRect(DIMS[name], PW, 132, rectOf(a.rect), [10, 8, PW - 20, 132 - 16]));
    d.imgcaption = a.imgcaption || '';
  }
  const attrs = Object.entries(d).map(([k, v]) => `data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${esc(v)}"`).join(' ');
  const figures = (a.figures || [])
    .map((fig) => {
      const name = pick(fig.image);
      const h = fig.h || 58;
      return `<figure class="margin-fig"><div class="mf-img" style="height:${h}mm">${imgTag(name, [44, h], fig.rect)}</div><figcaption>${esc(fig.caption)}</figcaption></figure>`;
    })
    .join('');
  return `
  <div class="flow" id="${a.id}" ${attrs}>
    <header class="flow-head">
      <p class="op-kicker">${esc(a.kicker)}</p>
      <h1 class="op-title">${typeset(esc(art.title))}</h1>
      ${art.dek ? `<p class="op-dek">${typeset(mdInline(art.dek))}</p>` : ''}
      ${art.byline ? `<p class="byline">${esc(art.byline)}</p>` : ''}
    </header>
    <div class="flow-body">${renderBody(body)}</div>
    <div class="flow-figures">${figures}</div>
    <div class="flow-closing">${a.closing ? closingFig(a.closing) : ''}</div>
    <div class="flow-extra">${extra}</div>
  </div>`;
}

// Closing figures are sized during pagination, so their key rectangle is cut
// out ahead of time and shown whole (object-fit: contain) on a tinted mat.
function closingFig(c) {
  const name = pick(c.image);
  const [x0, y0, x1, y1] = rectOf(c.rect);
  const { w, h } = DIMS[name];
  const crop = `${name}--${[x0, y0, x1, y1].join('-')}`;
  const out = path.join(IMAGES, `${crop}.jpg`);
  if (!fs.existsSync(out)) {
    const cw = Math.round(((x1 - x0) / 100) * w);
    const ch = Math.round(((y1 - y0) / 100) * h);
    execFileSync('magick', [path.join(IMAGES, `${name}.jpg`), '-crop', `${cw}x${ch}+${Math.round((x0 / 100) * w)}+${Math.round((y0 / 100) * h)}`, '+repage', '-quality', '82', out]);
  }
  const mat = /dark/.test(name) ? 'mat-dark' : 'mat-light';
  const aspect = (((x1 - x0) / 100) * w) / (((y1 - y0) / 100) * h);
  return `<figure class="closing-fig" data-aspect="${aspect.toFixed(4)}"><div class="cf-img ${mat}"><img src="${src(crop)}" alt=""></div><figcaption>${esc(c.caption)}</figcaption></figure>`;
}

function numbersPage(note, table) {
  const rows = table
    .split('\n')
    .slice(2)
    .map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
  const cell = (s) => typeset(mdInline(s)).replace(/\((.+)\)/, '<small>($1)</small>');
  return `
  <section class="page numbers" id="numbers">
    <p class="op-kicker">Engineering · The numbers</p>
    <h2 class="num-title">By the <em>Numbers</em></h2>
    <p class="num-note">${typeset(mdInline(note))} Before is myOS 1.x; after is 2.0.</p>
    <table class="num-table">
      <thead><tr><th>Measure</th><th>Before</th><th>After</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${cell(r[0])}</td><td class="b">${cell(r[1])}</td><td class="a">${cell(r[2])}</td></tr>`).join('')}</tbody>
    </table>
    ${folio()}
  </section>`;
}

// ---------------------------------------------------------------- static pages
function coverPage() {
  const name = pick(['00-hero-today-dark', '08-plan-my-day-dark']);
  const hero = name.startsWith('00');
  const img = imgTag(name, [156, 188], hero ? '33 7 81 64' : '26 8 90 62', [4, 4, 148, 180]);
  return `
  <section class="page cover nofolio">
    <h1 class="masthead">myOS</h1>
    <p class="issue-line"><span>Issue 03</span><span>Autumn 2026</span><span>The Calm Issue</span></p>
    <div class="cover-window">${img}</div>
    <div class="coverlines">
      <p class="cl-big"><span class="cl-num">20</span>Features <em>for Autumn</em></p>
      <p class="cl">Something Felt Off <span>The anatomy of a recut</span></p>
      <p class="cl">The Psychology of Calm <span>What the evidence supports</span></p>
      <p class="cl">The Morning Edit <span>Plan my day, Close the day, the Weekly review</span></p>
      <p class="cl">Five Decisions <span>And the roads not taken</span></p>
    </div>
    <p class="cover-foot">No streaks. No guilt. No telemetry. <span>Plain Markdown · macOS and Linux</span></p>
  </section>`;
}

function contentsPage(features) {
  const arts = ARTICLES.filter((a) => a.id !== 'a-07').map((a) => {
    const art = parseArticle(a.file);
    const short = art.dek.split(/(?<=\.)\s/)[0];
    return `<li><span class="c-num" data-ref="${a.id}"></span><span class="c-body"><span class="c-kicker">${esc(a.kicker)}</span><span class="c-title">${typeset(esc(art.title))}</span><span class="c-dek">${typeset(mdInline(short))}</span></span></li>`;
  });
  const secs = SECTIONS.map((s) => {
    const items = features.filter((f) => f.section === s)
      .map((f) => `<li><span class="cf-no">${String(f.no).padStart(2, '0')}</span><span class="cf-name">${typeset(esc(f.name))}</span><span class="cf-p" data-ref="f-${String(f.no).padStart(2, '0')}"></span></li>`).join('');
    return `<div class="cf-sec"><p class="cf-head">${esc(s)}</p><ul>${items}</ul></div>`;
  }).join('');
  return `
  <section class="page contents">
    <p class="op-kicker">Issue 03 · Autumn 2026</p>
    <h2 class="contents-title">Contents</h2>
    <div class="contents-grid">
      <div class="c-left">
        <p class="c-letter"><span data-ref="a-07"></span> Letter from the Editor</p>
        <ol class="c-articles">${arts.join('')}</ol>
      </div>
      <div class="c-right">
        <p class="cf-title"><span data-ref="collection"></span> The Collection<br><em>Twenty Features for Autumn</em></p>
        ${secs}
      </div>
    </div>
    <div class="masthead-box">
      <p><span class="label">Editors</span>The myOS Editors</p>
      <p><span class="label">Photography</span>Screenshots of myOS 3.0, light and dark</p>
      <p><span class="label">Made</span>Locally, from Markdown. No telemetry.</p>
    </div>
    ${folio()}
  </section>`;
}

function dividerPages(features) {
  const list = SECTIONS.map((s) => {
    const items = features.filter((f) => f.section === s)
      .map((f) => `<li><span>${String(f.no).padStart(2, '0')}</span>${typeset(esc(f.name))}</li>`).join('');
    return `<div class="dv-sec"><p>${esc(s)}</p><ol>${items}</ol></div>`;
  }).join('');
  const right = `
    <section class="page divider-right" id="collection">
      <p class="op-kicker">The Collection</p>
      <h2 class="dv-title">Twenty Features<br><em>for Autumn</em></h2>
      <p class="dv-dek">Chosen from research into the market, the people who use myOS, and the behavioral science of planning, memory, and motivation. Every one answers to eight written guardrails. No streaks. No guilt. Nudges only when you ask for them.</p>
      <div class="dv-list">${list}</div>
      ${folio()}
    </section>`;
  const left = `
    <section class="page divider-left nofolio">
      <div class="dv-num">20</div>
      <p class="dv-caption">The Collection · Autumn 2026</p>
    </section>`;
  const quote = `<section class="page quote-page nofolio"><blockquote><p>Would this still be worth it if the user never opened the app more often?</p></blockquote><p class="qp-cite">The test before anything ships · from the behavioral research</p></section>`;
  // The features must start on a left-hand page, so the divider spread must too.
  return `<div class="gate"><div class="if-odd">${quote}${left}${right}</div><div class="if-even">${left}${right}</div></div>`;
}

function colophonPage() {
  return `
  <section class="page colophon">
    <p class="op-kicker">Colophon</p>
    <h2 class="colo-title">Made <em>locally</em>.</h2>
    <div class="colo-grid">
      <div>
        <p class="label">Typefaces</p>
        <p><span class="t-bodoni">Bodoni Moda</span> for display, a Didone drawn for screens by Owen Earl.</p>
        <p><span class="t-news">Newsreader</span> for text, by Production Type.</p>
        <p><span class="t-inter">Inter</span> for captions and labels, by Rasmus Andersson. It is also the face of myOS itself.</p>
      </div>
      <div>
        <p class="label">Tools</p>
        <p>Written in Markdown in plain files. Set in HTML and CSS, paginated and printed by headless Chromium, with images prepared by ImageMagick. The screenshots are of myOS 3.0, in its light and dark themes.</p>
        <p class="label">Sources</p>
        <p>Every fact in this issue comes from the overhaul’s own record, the 3.0 plan, its three research briefs, the decision records in the owner’s workspace, and the app’s source.</p>
      </div>
      <div>
        <p class="label">Ethos</p>
        <p>Made locally. No telemetry. No account, no sync service, no bundled AI. The whole issue rebuilds from its Markdown with one command.</p>
        <p class="label">Credits</p>
        <p>The myOS Editors.</p>
      </div>
    </div>
    <p class="colo-sign">myOS</p>
    ${folio()}
  </section>`;
}

function interlude() {
  return `
  <section class="page interlude nofolio">
    <p class="il-line">Leaving things alone<br><em>always works.</em></p>
    <p class="il-cite">Guardrail No. 2 · No loss framing</p>
  </section>`;
}

function backCover() {
  return `
  <section class="page back nofolio">
    <p class="back-line">Your files<br>will still open<br><em>in 2046.</em></p>
    <div class="back-foot">
      <p class="back-mast">myOS</p>
      <p>Notes, Tasks, Projects, Inbox. Plain Markdown in a folder you choose.<br>macOS and Linux. No account. No sync service. No telemetry. No bundled AI.</p>
      <p class="back-issue">Issue 03 · Autumn 2026 · The Calm Issue</p>
    </div>
  </section>`;
}

// ---------------------------------------------------------------- assemble
function buildSource(features) {
  const byNo = Object.fromEntries(features.map((f) => [f.no, f]));
  const order = [[1], [2], [3], [4, 5], [6, 7], [8], [9], [10], [11, 12], [13], [14, 15], [16], [17], [18], [19], [20]];
  const featureHTML = order.map((g) => (g.length === 2 ? pairPages(byNo[g[0]], byNo[g[1]]) : featurePages(byNo[g[0]]))).join('\n');
  const css = fs.readFileSync(path.join(ISSUE, 'magazine.css'), 'utf8');
  void css;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>myOS · Issue 03 · Autumn 2026 · The Calm Issue</title>
<link rel="stylesheet" href="magazine.css">
</head>
<body>
<main id="book"></main>
<div id="source">
${coverPage(features)}
${contentsPage(features)}
${ARTICLES.map(articleFlow).join('\n')}
${dividerPages(features)}
${featureHTML}
<div class="gate"><div class="if-odd">${colophonPage()}${backCover()}</div><div class="if-even">${interlude()}${colophonPage()}${backCover()}</div></div>
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

// ---------------------------------------------------------------- main
DIMS = importImages();
const features = loadFeatures();
if (features.length !== 20) throw new Error(`Expected 20 features, found ${features.length}`);
const source = path.join(ISSUE, '.source.html');
fs.writeFileSync(source, buildSource(features));
log('paginating in headless Chromium');
let dom = chromium(['--virtual-time-budget=30000', '--window-size=1200,1600', '--dump-dom', pathToFileURL(source).href]).toString();
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
chromium(['--no-pdf-header-footer', '--virtual-time-budget=10000', `--print-to-pdf=${PDF}`, pathToFileURL(path.join(ISSUE, 'index.html')).href]);
const mb = fs.statSync(PDF).size / 1048576;
log(`${path.relative(process.cwd(), PDF)} · ${mb.toFixed(1)} MB`);
if (mb > 25) console.warn('  ! PDF is over 25 MB');

fs.rmSync(PREVIEWS, { recursive: true, force: true });
fs.mkdirSync(PREVIEWS, { recursive: true });
execFileSync('pdftoppm', ['-r', '40', '-png', PDF, path.join(PREVIEWS, 'p')]);
log(`previews in ${PREVIEWS}`);
