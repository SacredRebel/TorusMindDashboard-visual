/* Torus finish: sacred-geometry ornaments for page headers and cards.
   Replaces the V8 ornament script. Everything here is decorative: aria-hidden,
   pointer-events:none, and no data access. Motion lives in CSS (transform/opacity
   only) and stops under reduced motion; the pointer parallax only runs on input. */
(() => {
  'use strict';
  const view = document.querySelector('[data-view]');
  if (!view) return;
  const doc = document.documentElement;
  const PATTERNS = ['flower', 'metatron', 'orbits'];
  const HEADERS = '.top, .cal-header, .settings-page-intro';
  const TEXT = 'h1, h2, p, [data-crumb] a, .settings-eyebrow, .cal-eyebrow';
  const ACTIONS = '.top-actions, .cal-header-actions, .settings-page-controls';
  let queued = false;

  // A thin golden outline triangle that sways against the photo triangle.
  const LINE_TRI = '<svg viewBox="0 0 100 92" preserveAspectRatio="none" aria-hidden="true"><polygon points="50,2 98,90 2,90" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/><polygon points="50,90 74,46 26,46" fill="none" stroke="currentColor" stroke-width=".7" vector-effect="non-scaling-stroke" opacity=".7"/></svg>';

  function textRight(header) {
    let right = 0, bottom = 0;
    for (const el of header.querySelectorAll(TEXT)) {
      if (el.closest('.brand-header-media') || el.closest(ACTIONS)) continue;
      const range = document.createRange(); range.selectNodeContents(el);
      for (const r of range.getClientRects()) { if (r.width > 1) { right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom); } }
    }
    return { right, bottom };
  }

  // Put the photo triangle in the empty band between the title and the buttons,
  // never over text. On narrow headers it moves to the top-right corner, quieter.
  function placeTriangle(header) {
    const media = header.querySelector(':scope > .brand-header-media');
    if (!media) return;
    if (!media.querySelector('.brand-header-tri-line')) {
      const line = document.createElement('span');
      line.className = 'brand-header-tri-line'; line.innerHTML = LINE_TRI;
      media.appendChild(line);
    }
    const box = header.getBoundingClientRect();
    if (box.width < 10) return;
    const text = textRight(header);
    const actions = header.querySelector(ACTIONS);
    const a = actions && actions.getBoundingClientRect();
    const stacked = !a || a.width < 4 || a.top >= text.bottom - 4;
    const start = text.right - box.left + 28;
    const end = stacked ? box.width - 24 : a.left - box.left - 20;
    const gap = end - start;
    let size, x, mode;
    if (box.width < 560) {
      // Phone: a small emblem in the empty corner beside the first title line.
      let titleRight = 0;
      for (const el of header.querySelectorAll(TEXT)) {
        if (el.closest('.brand-header-media') || el.closest(ACTIONS)) continue;
        const r = document.createRange(); r.selectNodeContents(el);
        for (const q of r.getClientRects()) if (q.width > 1 && q.top < box.top + 74) titleRight = Math.max(titleRight, q.right - box.left);
      }
      size = 62; x = box.width - size - 14; mode = x - titleRight > 12 ? 'emblem' : 'hidden';
    } else if (gap >= 130) { size = Math.min(190, gap, box.height * 1.25); x = start + (gap - size) / 2; mode = 'gap'; }
    else { size = Math.min(150, box.height * 1.05); x = box.width - size - 6; mode = 'corner'; }
    header.style.setProperty('--tri-size', `${Math.round(size)}px`);
    header.style.setProperty('--tri-x', `${Math.round(x)}px`);
    header.dataset.tri = mode;
  }

  function decorateCards() {
    const cards = view.querySelectorAll('.card:not(.welcome):not(.signin)');
    let n = 0;
    cards.forEach((card) => {
      if (card.matches('.table-wrap') || card.querySelector(':scope > .table-wrap, :scope > table')) { card.classList.add('torus-card-plain'); return; }
      let orn = card.querySelector(':scope > .torus-card-ornament');
      if (!orn) {
        orn = document.createElement('span');
        orn.className = 'torus-card-ornament'; orn.setAttribute('aria-hidden', 'true');
        card.insertBefore(orn, card.firstChild);
        card.classList.add('torus-ornament-host');
      }
      orn.dataset.pattern = PATTERNS[n % PATTERNS.length];
      orn.style.setProperty('--orn-turn', `${(n * 37) % 360}deg`);
      n += 1;
    });
  }

  function update() {
    queued = false;
    decorateCards();
    document.querySelectorAll(HEADERS).forEach(placeTriangle);
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }

  new MutationObserver(schedule).observe(view, { subtree: true, childList: true });
  const top = document.querySelector('.top');
  if (top) new MutationObserver(schedule).observe(top, { subtree: true, childList: true, characterData: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(document.querySelector('.main') || view);
  document.fonts?.ready.then(schedule);
  schedule();

  // Gentle parallax: the header geometry leans a few pixels toward the pointer.
  const still = () => doc.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pending = null;
  document.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || still()) return;
    const header = ev.target.closest && ev.target.closest(HEADERS);
    if (!header) return;
    pending = { header, x: ev.clientX, y: ev.clientY };
    requestAnimationFrame(() => {
      if (!pending) return;
      const { header: h, x, y } = pending; pending = null;
      const b = h.getBoundingClientRect();
      h.style.setProperty('--px', (((x - b.left) / b.width) * 2 - 1).toFixed(3));
      h.style.setProperty('--py', (((y - b.top) / b.height) * 2 - 1).toFixed(3));
    });
  }, { passive: true });
  document.addEventListener('pointerout', (ev) => {
    const header = ev.target.closest && ev.target.closest(HEADERS);
    if (header && !header.contains(ev.relatedTarget)) { header.style.setProperty('--px', '0'); header.style.setProperty('--py', '0'); }
  });
})();
