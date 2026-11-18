/* Small synchronous preference read to avoid a dark-theme flash on reload. */
try { document.documentElement.dataset.appearance = localStorage.getItem('torus-appearance') === 'dark' ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.appearance = 'light'; }
