/* Small synchronous preference read to avoid a dark-theme flash on reload. */
try { document.documentElement.dataset.appearance = localStorage.getItem('torus-appearance') === 'dark' ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.appearance = 'light'; }
try {
  const h=decodeURIComponent((location.hash||'#today').slice(1));
  const screen=h.startsWith('partner-')?'partner':h.startsWith('event-')?'event':h;
  document.documentElement.dataset.screen=['today','partners','partner','patients','calendar','pipeline','events','event','sources','setup'].includes(screen)?screen:'today';
}catch(_){document.documentElement.dataset.screen='today';}
