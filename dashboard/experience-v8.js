/* V8: explicit, isolated ornamental geometry.
   Previous theme styles overwrote two-layer card backgrounds with single gradients,
   leaving 150px square patches and hiding the ornament. A transparent DOM ornament
   resolves both defects without affecting card data or events. */
(() => {
  'use strict';
  const root = document.querySelector('[data-view]');
  if (!root) return;
  const patterns = ['flower', 'orbits', 'mandala'];
  let queued = false;

  function updateOrnaments() {
    queued = false;
    const screen = document.documentElement.dataset.screen || '';
    // Decorative elements are always aria-hidden and never capture pointer events.
    const cards = root.querySelectorAll('.card:not(.welcome):not(.signin)');
    cards.forEach((card, index) => {
      if (card.querySelector(':scope > .torus-card-ornament')) return;
      const emblem = document.createElement('span');
      emblem.className = 'torus-card-ornament';
      emblem.setAttribute('aria-hidden', 'true');
      const bias = screen === 'sources' ? 1 : screen === 'events' || screen === 'patients' ? 2 : 0;
      emblem.dataset.pattern = patterns[(index + bias) % patterns.length];
      card.insertBefore(emblem, card.firstChild);
      card.classList.add('torus-ornament-host');
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateOrnaments);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(root, {subtree: true, childList: true});
  schedule();
})();

