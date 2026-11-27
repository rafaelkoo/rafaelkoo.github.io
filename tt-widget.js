// The school-day timetable at the top of the portfolio.
// Tap a period to jump to that part of the page; drag one (or Shift+Arrow with the keyboard) to rearrange the day.
// Lunch and "After school" are locked. The order is remembered in this browser only.
(() => {
  'use strict';
  const root = document.getElementById('ttw');
  if (!root) return;
  const KEY = 'rn-v2-day';
  const TIMES = ['Registration', 'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6', 'Period 7', 'Period 8', 'Period 9', 'After school'];
  const SHORT = ['Reg', 'P1', 'P2', 'P3', 'P4', 'Lunch', 'P5', 'P6', 'P7', 'P8', 'P9', 'After'];
  const DEFAULT = ['tt', 'tr', 'wd', 'gb', 'ft', 'lunch', 'how', 'ex', 'ct', null, null, 'avail'];
  const LOCKED = { lunch: 5, avail: 11 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slots = [...root.querySelectorAll('.ttw-slot')];
  const blocks = {};
  root.querySelectorAll('.ttw-blk').forEach(b => { blocks[b.dataset.b] = b; });
  const live = root.querySelector('.ttw-live');
  const resetBtn = root.querySelector('.ttw-reset');

  let order = DEFAULT.slice();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length === 12 && saved[5] === 'lunch' && saved[11] === 'avail' &&
        DEFAULT.filter(Boolean).every(k => saved.includes(k))) order = saved;
  } catch (e) { /* storage blocked: use the default day */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) {} };
  const isDefault = () => order.every((k, i) => k === DEFAULT[i]);
  const say = (t) => { if (live) live.textContent = t; };
  const nameOf = (k) => blocks[k] ? blocks[k].querySelector('.ttw-name').textContent : 'Free period';

  // Put each block in its slot. FLIP: remember where blocks were, move them, then animate from old to new.
  function render(animate) {
    const before = {};
    if (animate && !reduced) for (const k in blocks) before[k] = blocks[k].getBoundingClientRect();
    slots.forEach((slot, i) => {
      const k = order[i];
      const cell = slot.querySelector('.ttw-cell');
      const free = cell.querySelector('.ttw-free');
      if (k && blocks[k]) {
        if (blocks[k].parentNode !== cell) cell.appendChild(blocks[k]);
        if (free) free.remove();
      } else if (!free) {
        const f = document.createElement('span'); f.className = 'ttw-free'; f.textContent = 'Free period'; cell.appendChild(f);
      }
    });
    if (animate && !reduced) {
      for (const k in blocks) {
        const a = before[k], b = blocks[k].getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) blocks[k].animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    if (resetBtn) resetBtn.hidden = isDefault();
    syncDayBar();
  }

  // Keep the slim day bar (and the phone menu) in the same order as the day.
  function syncDayBar() {
    const wrap = document.querySelector('.day-pills');
    const drawer = document.querySelector('.drawer-links');
    order.forEach((k, i) => {
      const b = k && blocks[k]; if (!b || LOCKED[k] !== undefined) return;
      const id = (b.getAttribute('href') || '').slice(1);
      const pill = wrap && wrap.querySelector(`.day-pill[data-section="${id}"]`);
      if (pill) { wrap.appendChild(pill); const t = pill.querySelector('.pill-time'); if (t) t.textContent = SHORT[i]; }
      const dl = drawer && drawer.querySelector(`a[href="#${id}"]`);
      if (dl) { drawer.appendChild(dl); const t = dl.querySelector('span'); if (t) t.textContent = SHORT[i]; }
    });
  }

  function move(from, to) {
    if (from === to) return;
    if (Object.values(LOCKED).includes(to) || Object.values(LOCKED).includes(from)) {
      clash(slots[to]); say(TIMES[to] + ' is locked.'); return false;
    }
    [order[from], order[to]] = [order[to], order[from]];
    save(); render(true);
    const k = order[to];
    say(`${nameOf(k)} moved to ${TIMES[to]}.`);
    const b = blocks[k]; if (b) { b.classList.remove('ttw-moved'); void b.offsetWidth; b.classList.add('ttw-moved'); }
    return true;
  }
  function clash(el) {
    if (!el || reduced) return;
    el.animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 300 });
  }

  // ---- dragging (mouse: after a small move; touch: after a short press so the page can still scroll) ----
  let drag = null;
  const slotAt = (x, y) => {
    for (let i = 0; i < slots.length; i++) {
      const r = slots[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return -1;
  };
  function begin(b, e) {
    drag.on = true;
    b.classList.add('ttw-dragging');
    root.classList.add('ttw-is-dragging');
    try { b.setPointerCapture(e.pointerId); } catch (err) {}
  }
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.ttw-blk');
    if (!b || b.classList.contains('ttw-locked') || e.button > 0) return;
    const from = order.indexOf(b.dataset.b);
    drag = { b, from, x: e.clientX, y: e.clientY, on: false, over: -1, touch: e.pointerType !== 'mouse', timer: 0 };
    if (drag.touch) drag.timer = setTimeout(() => { if (drag) { begin(b, e); if (navigator.vibrate) navigator.vibrate(10); } }, 280);
  });
  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (drag.touch) { if (Math.hypot(dx, dy) > 8) { clearTimeout(drag.timer); drag = null; } return; } // the person is scrolling
      if (Math.hypot(dx, dy) < 6) return;
      begin(drag.b, e);
    }
    e.preventDefault();
    drag.b.style.transform = `translate(${dx}px,${dy}px)`;
    const over = slotAt(e.clientX, e.clientY);
    if (over !== drag.over) {
      slots.forEach((s, i) => s.classList.toggle('ttw-over', i === over && i !== drag.from));
      drag.over = over;
    }
  });
  // stop the page scrolling while a touch drag is on
  root.addEventListener('touchmove', (e) => { if (drag && drag.on) e.preventDefault(); }, { passive: false });
  const end = (e) => {
    if (!drag) return;
    clearTimeout(drag.timer);
    const d = drag; drag = null;
    if (!d.on) return;                              // it was a tap: let the link jump
    d.b.classList.remove('ttw-dragging'); root.classList.remove('ttw-is-dragging');
    slots.forEach(s => s.classList.remove('ttw-over'));
    d.b.style.transform = '';
    d.b.dataset.justDragged = '1';
    if (d.over >= 0) move(d.from, d.over);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.ttw-blk');
    if (b && b.dataset.justDragged) { e.preventDefault(); delete b.dataset.justDragged; }
  }, true);
  root.addEventListener('contextmenu', (e) => { if (e.target.closest('.ttw-blk') && (drag || root.classList.contains('ttw-is-dragging'))) e.preventDefault(); });

  // ---- keyboard: Shift + arrow keys move the focused period ----
  root.addEventListener('keydown', (e) => {
    const b = e.target.closest('.ttw-blk');
    if (!b || !e.shiftKey || b.classList.contains('ttw-locked')) return;
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const from = order.indexOf(b.dataset.b);
    let to = from + step;
    while (to >= 0 && to < 12 && Object.values(LOCKED).includes(to)) to += step;
    if (to < 0 || to > 11) { clash(b); return; }
    move(from, to); b.focus();
  });

  if (resetBtn) resetBtn.addEventListener('click', () => { order = DEFAULT.slice(); save(); render(true); say('Back to the original day.'); });

  // today's date, like a real timetable
  const dateEl = root.querySelector('.ttw-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  render(false);
})();
