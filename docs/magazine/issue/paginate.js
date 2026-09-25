/* myOS Next · Issue 04 paginator.
 * Runs once in headless Chromium; build.mjs saves the resulting DOM as the
 * static issue/index.html. Static pages are adopted in order. Article flows are
 * poured into two-column frames, splitting paragraphs between words, with pull
 * quotes and figures in the outer margin and the reference card at the end.
 */
(async function () {
  await document.fonts.ready;
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));

  const src = document.getElementById('source');
  const book = document.getElementById('book');
  const report = [];
  const PUB = 'myOS Next · Issue 04 · The Plain Text Issue';
  let n = 0;

  const side = (k) => (k % 2 === 0 ? 'verso' : 'recto');
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  function newPage(cls) {
    n++;
    const pg = el('section', `page ${side(n)} ${cls || ''}`);
    pg.dataset.n = n;
    book.appendChild(pg);
    return pg;
  }
  function adopt(pg) {
    n++;
    pg.classList.add(side(n));
    pg.dataset.n = n;
    book.appendChild(pg);
  }

  // ---------------------------------------------------------------- measuring
  function overflows(cols) {
    const last = cols.lastElementChild;
    if (!last) return false;
    const fr = cols.getBoundingClientRect();
    for (const r of last.getClientRects()) if (r.right > fr.right + 1 || r.bottom > fr.bottom + 1) return true;
    return false;
  }
  const tooTall = (box) => box.scrollHeight > box.clientHeight + 1;

  function wordStarts(p) {
    const out = [];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let node;
    let prevSpace = true;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('code, kbd')) {
        if (prevSpace) out.push([node, 0]);
        prevSpace = /\s$/.test(node.data);
        continue;
      }
      const t = node.data;
      for (let i = 0; i < t.length; i++) {
        const sp = /\s/.test(t[i]);
        if (!sp && prevSpace) out.push([node, i]);
        prevSpace = sp;
      }
    }
    return out;
  }
  function truncate(p, html, k) {
    p.innerHTML = html;
    const ws = wordStarts(p);
    if (k >= ws.length) return null;
    const r = document.createRange();
    r.setStart(ws[k][0], ws[k][1]);
    r.setEnd(p, p.childNodes.length);
    return r.extractContents();
  }
  const MINW = 11; // words that must stay on each side of a split
  function splitParagraph(cols, p) {
    const html = p.innerHTML;
    const W = wordStarts(p).length;
    let lo = 0;
    let hi = W;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      truncate(p, html, mid);
      if (overflows(cols)) hi = mid - 1;
      else lo = mid;
    }
    let k = lo;
    if (W - k > 0 && W - k < MINW) k = Math.max(0, W - MINW);
    if (k < MINW) {
      p.innerHTML = html;
      p.remove();
      return p;
    }
    const frag = truncate(p, html, k);
    const rest = p.cloneNode(false);
    rest.classList.add('cont');
    rest.classList.remove('first');
    rest.appendChild(frag);
    p.classList.add('split');
    return rest;
  }
  function splitList(cols, list) {
    const items = [...list.children];
    const rest = list.cloneNode(false);
    while (overflows(cols) && list.children.length > 1) rest.prepend(list.lastElementChild);
    if (overflows(cols) || list.children.length < 2 || rest.children.length === 0) {
      while (rest.firstChild) list.appendChild(rest.firstChild);
      list.remove();
      return list;
    }
    if (list.tagName === 'OL') rest.setAttribute('start', String(items.indexOf(rest.firstElementChild) + 1));
    rest.classList.add('cont');
    return rest;
  }

  // ---------------------------------------------------------------- page frames
  function folio(pg) {
    pg.appendChild(el('div', 'folio', `<span class="num"></span><span class="pub">${PUB}</span>`));
  }
  function textGrid(pg) {
    const grid = el('div', 'grid');
    const margin = el('div', 'margin-col');
    const frame = el('div', 'frame');
    const cols = el('div', 'cols');
    frame.appendChild(cols);
    grid.append(margin, frame);
    pg.appendChild(grid);
    return { pg, margin, cols };
  }

  function takeQuote(flow) {
    const q = flow._queue;
    if (flow._pending.length) return flow._pending.shift();
    for (let i = 0; i < Math.min(q.length, 12); i++) if (q[i].matches('blockquote.pull')) return q.splice(i, 1)[0];
    return null;
  }
  function dressMargin(ctx, flow) {
    const m = ctx.margin;
    const tryAdd = (node) => {
      m.appendChild(node);
      if (tooTall(m)) {
        node.remove();
        return false;
      }
      return true;
    };
    const q = takeQuote(flow);
    if (q && !tryAdd(q)) flow._pending.unshift(q);
    if (flow._figures.length && (!q || flow._pageCount % 2 === 0 || flow._queue.length < 6)) {
      const f = flow._figures[0];
      if (tryAdd(f)) flow._figures.shift();
    }
  }

  function contPage(flow) {
    flow._pageCount++;
    const pg = newPage(`textpage ${flow.dataset.pageclass || ''}`);
    pg.appendChild(el('div', 'runhead', `<span class="rh-no">${flow.dataset.no}</span><span>${flow.dataset.kicker}</span><span class="rh-title">${flow.dataset.title}</span>`));
    const ctx = textGrid(pg);
    folio(pg);
    dressMargin(ctx, flow);
    return ctx;
  }

  function bleedPage(flow, dark) {
    const v = newPage(`bleed-page nofolio ${dark ? 'dark' : ''}`);
    v.innerHTML = flow.dataset.bleed + (flow.dataset.caption ? `<p class="bleed-caption"><span class="lbl">${flow.dataset.no}</span>${flow.dataset.caption}</p>` : '');
  }

  function opener(flow) {
    const d = flow.dataset;
    const head = flow.querySelector('.flow-head');
    const kind = d.opener;
    const dark = kind === 'terminal';
    const facing = (n + 1) % 2 === 0; // next page is a left-hand page
    let pg;
    if (d.bleed && !facing) {
      // a right-hand teaser page, so the picture and the opener face each other
      const quotes = flow._queue.filter((b) => b.matches('blockquote.pull'));
      const q = quotes[quotes.length - 1];
      if (q) {
        flow._queue.splice(flow._queue.indexOf(q), 1);
        const t = newPage('teaser');
        t.innerHTML = `<p class="kicker-line"><span>Overleaf</span><span>${d.no} · ${d.kicker}</span></p><blockquote class="tz-q"><p>${q.querySelector('p').innerHTML}</p></blockquote><p class="tz-next"><span class="tz-no">${d.no}</span>${d.title}<span class="tz-arrow">→</span></p>`;
        folio(t);
      }
    }
    if (d.bleed && (n + 1) % 2 === 0) {
      bleedPage(flow, d.dark);
      pg = newPage(`opener opener-${kind} after-bleed ${dark ? 'dark mono-page' : ''}`);
    } else {
      pg = newPage(`opener opener-${kind} ${dark ? 'dark mono-page' : ''}`);
      if (d.top) pg.appendChild(el('figure', 'op-top', d.top + (d.caption ? `<figcaption>${d.caption}</figcaption>` : '')));
    }
    pg.id = d.id;
    if (kind === 'numeral' && !pg.querySelector('.op-top')) pg.appendChild(el('div', 'op-numeral', d.no));
    if (kind === 'keys') pg.appendChild(el('div', 'op-numeral op-keys', '⌘'));
    pg.appendChild(head);
    const ctx = textGrid(pg);
    folio(pg);
    const by = head.querySelector('.byline');
    if (by) ctx.margin.appendChild(by);
    flow._pageCount = 1;
    dressMargin(ctx, flow);
    return ctx;
  }

  // ---------------------------------------------------------------- filling
  function fill(ctx, flow) {
    const { cols } = ctx;
    const queue = flow._queue;
    const deferred = flow._deferred;
    while (deferred.length) {
      const b = deferred[0];
      cols.appendChild(b);
      if (overflows(cols) && cols.children.length > 1) {
        b.remove();
        return false;
      }
      deferred.shift();
    }
    while (queue.length) {
      const b = queue[0];
      if (b.matches('blockquote.pull')) {
        queue.shift();
        flow._pending.push(b);
        continue;
      }
      cols.appendChild(b);
      if (!overflows(cols)) {
        if (/^H[234]$/.test(b.tagName)) {
          const probe = el('p', 'probe', 'Probe text standing in for three lines of the paragraph that follows a heading, long enough to wrap two or three times in a narrow column of text.');
          cols.appendChild(probe);
          const bad = overflows(cols);
          probe.remove();
          if (bad) {
            b.remove();
            return false;
          }
        }
        queue.shift();
        continue;
      }
      if (b.tagName === 'P') {
        const rest = splitParagraph(cols, b);
        if (rest === b) {
          const prev = cols.lastElementChild;
          if (prev && /^H[234]$/.test(prev.tagName)) {
            prev.remove();
            queue.unshift(prev);
          }
          return false;
        }
        queue[0] = rest;
        return false;
      }
      if (b.tagName === 'UL' || b.tagName === 'OL') {
        const rest = splitList(cols, b);
        if (rest !== b) queue[0] = rest;
        else {
          const prev = cols.lastElementChild;
          if (prev && /^H[234]$/.test(prev.tagName)) {
            prev.remove();
            queue.unshift(prev);
          }
        }
        return false;
      }
      b.remove();
      if (cols.children.length === 0) {
        cols.appendChild(b);
        queue.shift();
        report.push(`Block too tall for an empty frame on page ${ctx.pg.dataset.n}`);
        continue;
      }
      // a code block or table: pull a lone lead-in paragraph or heading along
      const prev = cols.lastElementChild;
      if (prev && (/^H[234]$/.test(prev.tagName) || (prev.tagName === 'P' && /:\s*$/.test(prev.textContent)))) {
        prev.remove();
        queue.unshift(prev);
      }
      return false;
    }
    return true;
  }

  function placeRef(flow, ctx) {
    const aside = flow._aside;
    if (!aside) return;
    const cols = ctx.cols;
    const frame = cols.parentElement;
    cols.classList.add('balanced');
    frame.appendChild(aside);
    if (!tooTall(frame) && cols.children.length) return;
    aside.remove();
    if (!cols.children.length) {
      frame.appendChild(aside);
      return;
    }
    cols.classList.remove('balanced');
    const pg = newPage(`textpage refpage ${flow.dataset.pageclass || ''}`);
    pg.appendChild(el('div', 'runhead', `<span class="rh-no">${flow.dataset.no}</span><span>${flow.dataset.kicker}</span><span class="rh-title">${flow.dataset.title}</span>`));
    const c2 = textGrid(pg);
    folio(pg);
    c2.cols.parentElement.appendChild(aside);
    c2.cols.remove();
    aside.classList.add('full');
    flow._refCtx = c2;
    const box = aside.parentElement;
    let fs = 8.6;
    const fit = () => { aside.style.setProperty('--ref-size', fs + 'pt'); return box.scrollHeight <= box.clientHeight + 1 && aside.getBoundingClientRect().height < box.clientHeight * 0.92; };
    while (fs < 12.5 && fit()) fs += 0.3;
    while (fs > 7 && !fit()) fs -= 0.3;
    fit();
    dressMargin(c2, flow);
    if (tooTall(c2.cols.parentElement || pg)) report.push(`Reference card too tall on page ${n}`);
  }

  function paginateFlow(flow) {
    flow._figures = [...flow.querySelectorAll('.flow-figures > figure')];
    const blocks = [...flow.querySelector('.flow-body').children];
    flow._aside = blocks.find((b) => b.matches('aside.ref')) || null;
    flow._queue = blocks.filter((b) => b !== flow._aside);
    flow._pending = [];
    flow._deferred = [];
    if (flow.dataset.opener === 'terminal') flow.dataset.pageclass = 'dark mono-page';
    const first = flow._queue.find((b) => b.tagName === 'P');
    if (first && first.textContent.split(/\s+/).length >= 30) first.classList.add('first');
    let ctx = opener(flow);
    let guard = 0;
    while (!fill(ctx, flow)) {
      if (++guard > 40) {
        report.push(`Runaway flow ${flow.dataset.id}`);
        break;
      }
      ctx = contPage(flow);
    }
    // quotes that never found a margin go in the text, at the end
    const lastP = [...ctx.cols.querySelectorAll(':scope > p')].pop();
    if (lastP) lastP.insertAdjacentHTML('beforeend', '<span class="endmark"></span>');
    placeRef(flow, ctx);
    const endCtx = flow._refCtx || ctx;
    // leftover quotes and figures: try the last margin, then report
    for (const q of flow._pending.splice(0)) {
      endCtx.margin.appendChild(q);
      if (tooTall(endCtx.margin)) { q.remove(); report.push(`Unplaced pull quote in ${flow.dataset.id}: ${q.textContent.slice(0, 40)}`); }
    }
    for (const f of flow._figures.splice(0)) {
      endCtx.margin.appendChild(f);
      if (tooTall(endCtx.margin)) { f.remove(); report.push(`Unplaced figure in ${flow.dataset.id}`); }
    }
    // sparse last page?
    const lastCols = book.querySelector(`section.page[data-n="${n}"] .cols`);
    if (lastCols && lastCols.children.length && !flow._refCtx) {
      const fr = lastCols.parentElement.getBoundingClientRect();
      let bottom = fr.top;
      for (const c of lastCols.parentElement.children) for (const r of c.getClientRects()) bottom = Math.max(bottom, r.bottom);
      if (bottom - fr.top < fr.height * 0.2) report.push(`Sparse last page ${n} in ${flow.dataset.id}`);
    }
  }

  // ---------------------------------------------------------------- main loop
  for (const node of [...src.children]) {
    if (node.classList.contains('flow')) paginateFlow(node);
    else if (node.classList.contains('gate')) {
      const nextEven = (n + 1) % 2 === 0;
      if ((node.dataset.want === 'even') === nextEven) [...node.children].forEach(adopt);
    } else if (node.classList.contains('page')) adopt(node);
  }
  src.remove();

  // ---------------------------------------------------------------- fit capability text
  for (const fb of book.querySelectorAll('.fit')) {
    let size = parseFloat(getComputedStyle(fb).fontSize);
    const min = size * 0.86;
    while (tooTall(fb) && size > min) {
      size -= 0.2;
      fb.style.fontSize = size + 'px';
    }
    if (tooTall(fb)) report.push(`Capability text overflows on page ${fb.closest('.page').dataset.n}`);
  }

  // ---------------------------------------------------------------- folios, refs, checks
  for (const pg of book.querySelectorAll('.page')) {
    const num = pg.querySelector('.folio .num');
    if (num) num.textContent = String(pg.dataset.n).padStart(3, '0');
    if (!pg.matches('.cover, .divider') && pg.scrollHeight > pg.clientHeight + 2) report.push(`Page ${pg.dataset.n} content taller than the page`);
    for (const m of pg.querySelectorAll('.margin-col')) if (tooTall(m)) report.push(`Margin overflows on page ${pg.dataset.n}`);
  }
  for (const ref of document.querySelectorAll('[data-ref]')) {
    const target = document.getElementById(ref.dataset.ref);
    ref.textContent = target ? String(target.closest('.page').dataset.n).padStart(2, '0') : '??';
  }
  const qa = el('script');
  qa.type = 'application/json';
  qa.id = 'qa-report';
  qa.textContent = JSON.stringify({ pages: n, report });
  document.body.appendChild(qa);
  document.documentElement.dataset.paginated = 'true';
})();
