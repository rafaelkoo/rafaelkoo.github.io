// Smooth light/dark switch: the new theme spreads out in a circle from the switch you pressed.
// Wraps the page's own theme button (app.js does the actual switch). Browsers without View Transitions
// get a short colour fade instead; with reduced motion the switch is instant.
(() => {
  'use strict';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let passing = false;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.theme-btn');
    if (!btn || passing || reduced()) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const run = () => { passing = true; try { btn.click(); } finally { passing = false; } };
    const root = document.documentElement;
    if (!document.startViewTransition) {
      root.classList.add('theme-fading');
      run();
      setTimeout(() => root.classList.remove('theme-fading'), 450);
      return;
    }
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(run);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }, true);
})();
