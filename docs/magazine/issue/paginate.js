/* myOS Issue 03 paginator.
 * Runs once in headless Chromium (build.mjs dumps the resulting DOM as the
 * static issue/index.html). Static pages are adopted in order; article flows
 * are poured into fixed page frames, splitting paragraphs between words.
 */
(async function () {
  await document.fonts.ready;
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));

  const src = document.getElementById('source');
  const book = document.getElementById('book');
  const report = [];
  let n = 0;

  const side = (k) => (k % 2 === 0 ? 'verso' : 'recto');
  function newPage(cls) {
    n++;
    const pg = document.createElement('section');
    pg.className = `page ${side(n)} ${cls || ''}`;
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
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  // ---------- overflow and splitting ----------
  function overflows(frame) {
    const last = frame.lastElementChild;
    if (!last) return false;
    const fr = frame.getBoundingClientRect();
    const r = last.getBoundingClientRect();
    return r.right > fr.right + 1 || r.bottom > fr.bottom + 1;
  }
  function wordStarts(p) {
    const out = [];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let node;
    let prevSpace = true;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('code')) {
        // never split inside code; treat as one word
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
  function splitParagraph(frame, p) {
    const html = p.innerHTML;
    const W = wordStarts(p).length;
    let lo = 0;
    let hi = W; // largest k that fits
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      truncate(p, html, mid);
      if (overflows(frame)) hi = mid - 1;
      else lo = mid;
    }
    let k = lo;
    if (W - k > 0 && W - k < 9) k = Math.max(0, W - 9); // no lonely last line overleaf
    if (k < 9) {
      p.innerHTML = html;
      p.remove();
      return p; // whole paragraph moves on
    }
    const frag = truncate(p, html, k);
    const rest = p.cloneNode(false);
    rest.classList.add('cont');
    rest.classList.remove('first');
    rest.appendChild(frag);
    p.classList.add('split');
    return rest;
  }
  function splitList(frame, list) {
    const items = [...list.children];
    const rest = list.cloneNode(false);
    while (overflows(frame) && list.children.length > 1) rest.prepend(list.lastElementChild);
    if (overflows(frame) || list.children.length < 2) {
      while (rest.firstChild) list.appendChild(rest.firstChild);
      list.remove();
      return list;
    }
    if (list.tagName === 'OL') rest.setAttribute('start', String(items.indexOf(rest.firstElementChild) + 1));
    return rest;
  }

  // ---------- article flows ----------
  function folio(pg) {
    pg.appendChild(el('div', 'folio', '<span class="num"></span><span class="pub">myOS · Issue 03 · The Calm Issue</span>'));
  }
  function runhead(pg, flow) {
    pg.appendChild(el('div', 'runhead', `<span>${flow.dataset.kicker}</span><span class="rh-title">${flow.dataset.title}</span>`));
  }

  function takeQuote(queue, pending) {
    if (pending.length) return pending.shift();
    for (let i = 0; i < Math.min(queue.length, 9); i++) {
      if (queue[i].matches('blockquote.pull')) return queue.splice(i, 1)[0];
    }
    return null;
  }

  function contPage(flow, queue, pending, deferred) {
    const pg = newPage('textpage');
    runhead(pg, flow);
    const body = el('div', 'cont-body');
    const margin = el('div', 'margin-col');
    const frame = el('div', 'frame');
    body.append(margin, frame);
    pg.appendChild(body);
    folio(pg);
    const q = takeQuote(queue, pending);
    if (q) margin.appendChild(q);
    else if (flow._figures.length) margin.appendChild(flow._figures.shift());
    return { pg, frame, margin };
  }

  function fill(ctx, queue, pending, deferred) {
    const { frame } = ctx;
    // deferred unsplittable blocks go first
    while (deferred.length) {
      const b = deferred[0];
      frame.appendChild(b);
      if (overflows(frame) && frame.children.length > 1) {
        b.remove();
        return false;
      }
      deferred.shift();
    }
    while (queue.length) {
      const b = queue[0];
      if (b.matches('blockquote.pull')) {
        queue.shift();
        if (!ctx.margin) {
          pending.push(b);
          continue;
        }
        if (!ctx.margin.querySelector('blockquote, figure')) {
          ctx.margin.appendChild(b);
          continue;
        }
        b.classList.add('inline');
        frame.appendChild(b);
        if (overflows(frame)) {
          b.remove();
          deferred.push(b);
        }
        continue;
      }
      frame.appendChild(b);
      if (!overflows(frame)) {
        if (/^H[23]$/.test(b.tagName)) {
          // keep with next: need room for ~2 lines after a heading
          const probe = el('p', 'probe', 'Probe text that stands in for two lines of the following paragraph, long enough to wrap at least once in a column.');
          frame.appendChild(probe);
          const bad = overflows(frame);
          probe.remove();
          if (bad) {
            b.remove();
            return false;
          }
        }
        queue.shift();
        continue;
      }
      // it overflows
      if (b.tagName === 'P') {
        const rest = splitParagraph(frame, b);
        if (rest === b) {
          // moved whole; pull a preceding heading along
          const prev = frame.lastElementChild;
          if (prev && /^H[23]$/.test(prev.tagName)) {
            prev.remove();
            queue.unshift(prev);
            queue.splice(1, 1, b);
          }
          return false;
        }
        queue[0] = rest;
        return false;
      }
      if (b.tagName === 'UL' || b.tagName === 'OL') {
        const rest = splitList(frame, b);
        if (rest !== b) queue[0] = rest;
        return false;
      }
      // unsplittable: aside, inline quote, heading, table
      b.remove();
      if (frame.children.length === 0) {
        frame.appendChild(b);
        queue.shift();
        report.push(`Block too tall for an empty frame in ${ctx.pg.dataset.n}`);
        continue;
      }
      if (b.tagName === 'ASIDE' || b.matches('blockquote')) {
        queue.shift();
        deferred.push(b);
        continue; // keep filling with what follows
      }
      return false;
    }
    return true;
  }

  function coverImg(spec) {
    // spec: data attributes from flow: img, and precomputed style
    return `<img src="${spec.src}" style="${spec.style}" alt="">`;
  }

  function opener(flow) {
    const d = flow.dataset;
    const head = flow.querySelector('.flow-head');
    const kind = d.opener;
    let pg;
    if (kind === 'spread' && (n + 1) % 2 === 0) {
      const v = newPage('opener-image nofolio');
      v.innerHTML = `<div class="bleed">${coverImg({ src: d.img, style: d.styleSpread })}</div>` +
        (d.imgcaption ? `<p class="bleed-caption">${d.imgcaption}</p>` : '');
      pg = newPage('opener opener-right');
    } else if (kind === 'spread') {
      pg = newPage('opener opener-top');
      pg.appendChild(el('div', 'top-image', coverImg({ src: d.img, style: d.styleTop })));
    } else {
      pg = newPage(`opener opener-${kind}`);
    }
    pg.id = flow.id;
    if (kind === 'numeral') pg.appendChild(el('div', 'big-numeral', d.numeral));
    pg.appendChild(head);
    const body = el('div', 'cont-body');
    const margin = el('div', 'margin-col');
    const frame = el('div', 'frame');
    body.append(margin, frame);
    pg.appendChild(body);
    folio(pg);
    const by = head.querySelector('.byline');
    if (by) margin.appendChild(by);
    return { pg, frame, margin: kind === 'letter' ? margin : null };
  }

  function paginateFlow(flow) {
    flow._figures = [...flow.querySelectorAll('.flow-figures > figure')];
    const queue = [...flow.querySelector('.flow-body').children];
    const pending = [];
    const deferred = [];
    const extras = [...flow.querySelectorAll('.flow-extra > .page')];
    const first = queue.find((b) => b.tagName === 'P');
    if (first) first.classList.add('first');
    let ctx = opener(flow);
    if (flow.dataset.opener === 'noir') {
      // noir opener carries no text; body starts overleaf
      ctx.frame.remove();
      ctx = contPage(flow, queue, pending, deferred);
    }
    let guard = 0;
    while (!fill(ctx, queue, pending, deferred)) {
      if (++guard > 40) {
        report.push(`Runaway flow ${flow.id}`);
        break;
      }
      ctx = contPage(flow, queue, pending, deferred);
    }
    if (pending.length) {
      pending.forEach((q) => q.classList.add('inline'));
      deferred.push(...pending.splice(0));
      if (fill(ctx, queue, pending, deferred) === false || deferred.length) {
        while (deferred.length) {
          ctx = contPage(flow, queue, pending, deferred);
          fill(ctx, queue, pending, deferred);
        }
      }
    }
    while (deferred.length) {
      ctx = contPage(flow, queue, pending, deferred);
      fill(ctx, queue, pending, deferred);
    }
    // end mark
    const lastP = [...book.querySelectorAll(`section.page[data-n="${n}"] .frame > p`)].pop();
    if (lastP) lastP.insertAdjacentHTML('beforeend', '<span class="endmark"></span>');
    // Report sparse final pages
    const lastFrame = book.querySelector(`section.page[data-n="${n}"] .frame`);
    if (lastFrame && lastFrame.children.length) {
      const fr = lastFrame.getBoundingClientRect();
      const lr = lastFrame.lastElementChild.getBoundingClientRect();
      const colW = fr.width / 2;
      const inFirstCol = lr.right < fr.left + colW + 2;
      if (inFirstCol && lr.bottom - fr.top < fr.height * 0.25) report.push(`Sparse last page ${n} in ${flow.id}`);
    }
    const closing = flow.querySelector('.flow-closing > figure');
    const lf = book.querySelector(`section.page[data-n="${n}"] .frame`);
    if (closing && lf && lf.children.length) {
      const mm = 3.7795;
      lf.style.columnFill = 'balance';
      const fr = lf.getBoundingClientRect();
      let bottom = fr.top;
      for (const c of lf.children) for (const r of c.getClientRects()) bottom = Math.max(bottom, r.bottom);
      const free = fr.bottom - bottom - 9 * mm;
      if (free > 50 * mm) {
        const body = lf.parentElement;
        const br = body.getBoundingClientRect();
        // size the figure to its picture (plus caption) and sit it on the bottom margin
        const aspect = parseFloat(closing.dataset.aspect) || 1.6;
        const capH = 16 * mm;
        let w = fr.width;
        let h = w / aspect + capH;
        if (h > free) { h = free; w = Math.min(fr.width, (h - capH) * aspect); }
        closing.style.left = fr.left - br.left + 'px';
        closing.style.width = w + 'px';
        closing.style.top = fr.bottom - br.top - h + 'px';
        closing.style.height = h + 'px';
        body.appendChild(closing);
      } else {
        lf.style.columnFill = '';
        report.push(`No room for the closing figure of ${flow.id} (${Math.round(free / mm)} mm)`);
      }
    }
    extras.forEach(adopt);
  }

  // ---------- main loop ----------
  for (const node of [...src.children]) {
    if (node.classList.contains('flow')) paginateFlow(node);
    else if (node.classList.contains('gate')) {
      const nextOdd = (n + 1) % 2 === 1;
      const group = node.querySelector(nextOdd ? '.if-odd' : '.if-even');
      [...group.children].forEach(adopt);
    } else if (node.classList.contains('page')) adopt(node);
  }
  src.remove();

  // ---------- fit feature bodies ----------
  for (const fb of book.querySelectorAll('.fit')) {
    let size = parseFloat(getComputedStyle(fb).fontSize);
    const min = size * 0.86;
    const over = () => {
      const last = fb.lastElementChild;
      if (!last) return false;
      const fr = fb.getBoundingClientRect();
      const r = last.getBoundingClientRect();
      return r.right > fr.right + 1 || r.bottom > fr.bottom + 1;
    };
    while (over() && size > min) {
      size -= 0.25;
      fb.style.fontSize = size + 'px';
    }
    if (over()) report.push(`Feature text overflows on page ${fb.closest('.page').dataset.n}`);
  }

  // ---------- keep the low feature numeral clear of the text ----------
  for (const pg of book.querySelectorAll('.f-text')) {
    const no = pg.querySelector('.f-no');
    const num = pg.querySelector('.f-no-num');
    const body = pg.querySelector('.f-body');
    if (!no || !body) continue;
    let size = parseFloat(getComputedStyle(num).fontSize);
    while (no.getBoundingClientRect().top < body.getBoundingClientRect().bottom + 12 && size > 90) {
      size -= 6;
      num.style.fontSize = size + 'px';
      num.style.lineHeight = size * 0.76 + 'px';
    }
  }

  // ---------- folios and contents ----------
  for (const pg of book.querySelectorAll('.page')) {
    const num = pg.querySelector('.folio .num');
    if (num) num.textContent = pg.dataset.n;
    if (pg.scrollHeight > pg.clientHeight + 2) report.push(`Page ${pg.dataset.n} content taller than the page`);
  }
  for (const ref of document.querySelectorAll('[data-ref]')) {
    const target = document.getElementById(ref.dataset.ref);
    ref.textContent = target ? String(target.closest('.page').dataset.n).padStart(2, '0') : '??';
  }
  const qa = el('script', null, null);
  qa.type = 'application/json';
  qa.id = 'qa-report';
  qa.textContent = JSON.stringify({ pages: n, report });
  document.body.appendChild(qa);
  document.documentElement.dataset.paginated = 'true';
})();
