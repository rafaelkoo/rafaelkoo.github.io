// The GorB pixel gym, live on the portfolio: drawn by GorB's own code (pixel.js) with made-up people.
// Tap someone to send them to another station. Runs only while it is on screen; one still frame with reduced motion.
import { drawGym, defaultAvatar, cleanAvatar, W, H } from './pixel.js';

const fig = document.querySelector('#s-gb .art figure.wide, figure[data-gorb-gym]');
const img = fig && fig.querySelector('img');
if (img) {
  const STATIONS = ['rack', 'bench', 'tread', 'dbs', 'ohp', 'climb', 'pullup', 'bike', 'rower', 'cable', 'machine', 'mat'];
  const av = id => cleanAvatar(defaultAvatar(id), id);
  const people = [
    { id: 'kai', name: 'Kai', station: 'rack' },
    { id: 'mina', name: 'Mina', station: 'bench' },
    { id: 'raf', name: 'Rafael', station: 'climb', me: true },
    { id: 'theo', name: 'Theo', station: 'tread' },
    { id: 'jo', name: 'Jo', station: 'rest' }
  ].map(p => ({ ...p, avatar: av(p.id), inGym: p.station !== 'rest' }));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALE = 4;
  const cv = document.createElement('canvas');
  cv.width = W * SCALE; cv.height = H * SCALE;
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', img.alt + '. Live: tap a person to move them.');
  cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:8px;cursor:pointer;background:#1b1712';

  let boxes = [], lastFrame = -1, running = false, raf = 0, timer = 0;
  const paint = t => { boxes = drawGym(cv, people, t, SCALE, 'REST'); };
  const move = p => {
    const free = STATIONS.filter(s => s !== p.station && !people.some(q => q !== p && q.station === s));
    const next = Math.random() < 0.15 ? 'rest' : free[Math.floor(Math.random() * free.length)];
    p.station = next; p.inGym = next !== 'rest';
    lastFrame = -1;
  };
  const loop = now => {
    const f = Math.floor(now / 450);
    if (f !== lastFrame) { lastFrame = f; paint(now); }
    if (running) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || reduced) return;
    running = true; raf = requestAnimationFrame(loop);
    timer = setInterval(() => move(people[Math.floor(Math.random() * people.length)]), 3500);
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); clearInterval(timer); };

  try {
    paint(0);
    img.replaceWith(cv);
    const cap = fig.querySelector('figcaption');
    if (cap) cap.textContent = 'The pixel gym, live: drawn by GorB’s own code. Tap someone to move them.';
  } catch (e) { /* keep the still picture */ }

  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), k = cv.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    const hit = boxes.find(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    move(hit ? hit.p : people[Math.floor(Math.random() * people.length)]);
    if (reduced) paint(0);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(en => (en.isIntersecting ? start() : stop())), { threshold: 0.2 }).observe(cv);
  } else start();
}
