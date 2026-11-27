// The school-day timetable at the top of the portfolio ("Chrono HUD").
// Desktop: click a period to jump to it; drag one onto another to swap them (or Shift + arrow keys).
// Phone: Jump mode selects a period and "Go there" scrolls to it; Swap mode trades two tapped periods.
// Lunch and After school are locked. The order is remembered in this browser only.
(() => {
  'use strict';
  const root = document.getElementById('ttw');
  if (!root) return;
  const KEY = 'rn-v2-day';
  const TIMES = ['Registration', 'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6', 'Period 7', 'Period 8', 'Period 9', 'After school'];
  const CODES = ['REG', 'P1', 'P2', 'P3', 'P4', 'LCH', 'P5', 'P6', 'P7', 'P8', 'P9', 'EXT'];
  const SHORT = ['Reg', 'P1', 'P2', 'P3', 'P4', 'Lunch', 'P5', 'P6', 'P7', 'P8', 'P9', 'After'];
  const DEFAULT = ['tt', 'tr', 'wd', 'gb', 'ft', 'lunch', 'how', 'ex', 'ct', null, null, 'avail'];
  const LOCKED = [5, 11];
  const DESC = {
    tt: 'Live timetable for a two-site school', tr: 'Course units linked criterion by criterion', wd: 'Checks 5 sites every morning',
    gb: 'Co-op gym app with a live pixel gym', ft: 'Workout tracker and an idle dungeon game', lunch: 'Locked: lunch stays put',
    how: 'Plan, document, build, check', ex: 'Jobs, degree and skills', ct: 'Email, LinkedIn and CV', avail: 'Open to full-time developer roles'
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 959px)').matches;

  const rail = root.querySelector('.ttw-rail');
  const slots = [...root.querySelectorAll('.ttw-slot')];
  const blocks = {};
  root.querySelectorAll('.ttw-blk').forEach(b => { blocks[b.dataset.b] = b; });
  const live = root.querySelector('.ttw-live');
  const resetBtn = root.querySelector('.ttw-reset');
  const out = { box: root.querySelector('.ttw-read'), c: root.querySelector('.ttw-sc'), n: root.querySelector('.ttw-sn'), x: root.querySelector('.ttw-sx'), go: root.querySelector('.ttw-go') };
  const ind = document.createElement('div'); ind.className = 'ttw-ind'; ind.setAttribute('aria-hidden', 'true'); rail.prepend(ind);

  let order = DEFAULT.slice();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length === 12 && saved[5] === 'lunch' && saved[11] === 'avail' &&
        DEFAULT.filter(Boolean).every(k => saved.includes(k))) order = saved;
  } catch (e) { /* storage blocked: use the default day */ }
  let active = 0, mode = 'jump', picked = -1;

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) {} };
  const say = t => { if (live) live.textContent = t; };
  const nameOf = k => blocks[k] ? (blocks[k].dataset.full || blocks[k].textContent.replace(' (locked)', '').trim()) : 'Free period';
  const colour = k => `var(--b-${k || 'free'})`;

  function render(animate) {
    const before = {};
    if (animate && !reduced()) for (const k in blocks) before[k] = blocks[k].closest('.ttw-slot').getBoundingClientRect();
    slots.forEach((slot, i) => {
      const k = order[i], cell = slot.querySelector('.ttw-cell'), free = cell.querySelector('.ttw-free');
      slot.style.setProperty('--c', colour(k));
      slot.classList.toggle('is-free', !k);
      if (k && blocks[k]) { if (blocks[k].parentNode !== cell) cell.appendChild(blocks[k]); if (free) free.remove(); }
      else if (!free) { const f = document.createElement('span'); f.className = 'ttw-free'; f.textContent = 'Free'; cell.appendChild(f); }
      slot.classList.toggle('ttw-picked', i === picked);
    });
    if (animate && !reduced()) for (const k in blocks) {
      const a = before[k], el = blocks[k].closest('.ttw-slot'), b = el.getBoundingClientRect();
      if (a && (a.left !== b.left || a.top !== b.top))
        el.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    if (resetBtn) resetBtn.hidden = order.every((k, i) => k === DEFAULT[i]);
    place(false);
    syncDayBar();
  }

  // the sliding highlight, the glowing bar and the readout follow the selected period
  function place(readout) {
    const s = slots[active]; if (!s) return;
    const k = order[active];
    root.style.setProperty('--ac', colour(k));
    ind.style.width = s.offsetWidth + 'px'; ind.style.height = s.offsetHeight + 'px';
    ind.style.transform = `translate(${s.offsetLeft}px,${s.offsetTop}px)`;
    slots.forEach((x, i) => x.classList.toggle('on', i === active));
    out.c.textContent = CODES[active];
    out.n.textContent = nameOf(k);
    out.x.textContent = picked >= 0 ? 'Now tap where it should go' : (k ? DESC[k] : 'Nothing here yet');
    if (out.go) {
      const href = k && blocks[k].getAttribute('href');
      out.go.href = href || '#';
      out.go.setAttribute('aria-disabled', String(!href));
    }
    if (readout && !reduced()) { out.box.classList.remove('ttw-readout'); void out.box.offsetWidth; out.box.classList.add('ttw-readout'); }
  }

  function syncDayBar() {
    const wrap = document.querySelector('.day-pills'), drawer = document.querySelector('.drawer-links');
    order.forEach((k, i) => {
      const b = k && blocks[k]; if (!b || LOCKED.includes(i)) return;
      const id = (b.getAttribute('href') || '').slice(1);
      const pill = wrap && wrap.querySelector(`.day-pill[data-section="${id}"]`);
      if (pill) { wrap.appendChild(pill); const t = pill.querySelector('.pill-time'); if (t) t.textContent = SHORT[i]; }
      const dl = drawer && drawer.querySelector(`a[href="#${id}"]`);
      if (dl) { drawer.appendChild(dl); const t = dl.querySelector('span'); if (t) t.textContent = SHORT[i]; }
    });
  }

  function swap(from, to) {
    if (from === to) return false;
    if (LOCKED.includes(to) || LOCKED.includes(from)) { shake(slots[LOCKED.includes(to) ? to : from]); say(`${TIMES[LOCKED.includes(to) ? to : from]} is locked.`); return false; }
    [order[from], order[to]] = [order[to], order[from]];
    active = to; save(); render(true); place(true);
    say(`${nameOf(order[to])} moved to ${TIMES[to]}.`);
    return true;
  }
  function shake(el) {
    if (!el || reduced()) return;
    el.animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 300 });
  }
  function ripple(slot, e) {
    if (reduced()) return;
    const r = slot.getBoundingClientRect(), d = Math.max(r.width, r.height), w = document.createElement('span');
    w.className = 'ttw-ripple'; w.style.width = w.style.height = d + 'px';
    w.style.left = ((e && e.clientX ? e.clientX - r.left : r.width / 2) - d / 2) + 'px';
    w.style.top = ((e && e.clientY ? e.clientY - r.top : r.height / 2) - d / 2) + 'px';
    w.style.background = colour(order[slots.indexOf(slot)]);
    slot.appendChild(w); setTimeout(() => w.remove(), 500);
  }
  function select(i, readout) { active = i; place(readout); }

  // ---- clicks and taps ----
  rail.addEventListener('click', e => {
    const slot = e.target.closest('.ttw-slot'); if (!slot) return;
    const i = slots.indexOf(slot), b = slot.querySelector('.ttw-blk');
    if (b && b.dataset.justDragged) { e.preventDefault(); delete b.dataset.justDragged; return; }
    ripple(slot, e);
    if (phone()) {
      e.preventDefault();                                   // on a phone a tap selects; "Go there" jumps
      if (mode === 'swap') {
        if (LOCKED.includes(i)) { shake(slot); say(`${TIMES[i]} is locked.`); return; }
        if (picked < 0) { picked = i; active = i; render(false); place(true); say(`${nameOf(order[i])} picked. Tap where it should go.`); return; }
        if (picked === i) { picked = -1; render(false); say('Swap cancelled.'); return; }
        const a = picked; picked = -1; swap(a, i); return;
      }
      select(i, true); return;
    }
    select(i, true);                                        // desktop: the link itself jumps
    if (!b) e.preventDefault();
  });

  // ---- dragging on desktop (after a small move, so a click still jumps) ----
  let drag = null;
  const slotAt = (x, y) => slots.findIndex(s => { const r = s.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
  rail.addEventListener('pointerdown', e => {
    if (phone() || e.pointerType !== 'mouse' || e.button > 0) return;
    const b = e.target.closest('.ttw-slot') && e.target.closest('.ttw-slot').querySelector('.ttw-blk');
    if (!b || b.classList.contains('ttw-locked')) return;
    drag = { b, el: b.closest('.ttw-slot'), from: order.indexOf(b.dataset.b), x: e.clientX, y: e.clientY, on: false, over: -1 };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) { if (Math.hypot(dx, dy) < 6) return; drag.on = true; drag.el.classList.add('ttw-dragging'); root.classList.add('ttw-is-dragging'); }
    e.preventDefault();
    drag.el.style.transform = `translate(${dx}px,${dy}px)`;
    const over = slotAt(e.clientX, e.clientY);
    if (over !== drag.over) { slots.forEach((s, i) => s.classList.toggle('ttw-over', i === over && i !== drag.from)); drag.over = over; }
  });
  addEventListener('pointerup', () => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.on) return;
    d.el.classList.remove('ttw-dragging'); root.classList.remove('ttw-is-dragging'); d.el.style.transform = '';
    slots.forEach(s => s.classList.remove('ttw-over'));
    d.b.dataset.justDragged = '1';
    if (d.over >= 0) swap(d.from, d.over);
  });

  // ---- keyboard: arrows move the selection, Shift + arrows move the period ----
  rail.addEventListener('keydown', e => {
    const b = e.target.closest('.ttw-blk'); if (!b) return;
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]; if (!step) return;
    const from = slots.indexOf(b.closest('.ttw-slot'));
    e.preventDefault();
    if (e.shiftKey && !b.classList.contains('ttw-locked')) {
      let to = from + step; while (LOCKED.includes(to)) to += step;
      if (to < 0 || to > 11) { shake(slots[from]); return; }
      swap(from, to); b.focus();
    } else {
      let to = from + step;
      while (to >= 0 && to < 12 && !slots[to].querySelector('.ttw-blk')) to += step;
      if (to >= 0 && to < 12) { slots[to].querySelector('.ttw-blk').focus(); select(to, true); }
    }
  });
  rail.addEventListener('focusin', e => { const s = e.target.closest('.ttw-slot'); if (s) select(slots.indexOf(s), false); });

  // ---- phone mode switch, reset, date ----
  root.querySelectorAll('.ttw-mode button').forEach(btn => btn.addEventListener('click', () => {
    mode = btn.dataset.mode; picked = -1;
    root.querySelectorAll('.ttw-mode button').forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
    render(false); place(true);
    say(mode === 'swap' ? 'Swap mode: tap a period, then where it should go.' : 'Jump mode: tap a period, then Go there.');
  }));
  if (resetBtn) resetBtn.addEventListener('click', () => { order = DEFAULT.slice(); picked = -1; active = 0; save(); render(true); place(true); say('Back to the original day.'); });
  const dateEl = root.querySelector('.ttw-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  addEventListener('resize', () => place(false));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(false));
  render(false);
})();
