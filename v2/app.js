import { drawGym, defaultAvatar, cleanAvatar, W, H } from '../js/pixel.js';

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Scroll Progress Bar + Light/Dark Theme Toggle
  const progressBar = document.getElementById('scroll-progress');
  let progressRaf = 0;
  function updateScrollProgress() {
    progressRaf = 0;
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
  }
  window.addEventListener('scroll', () => {
    if (!progressRaf) progressRaf = requestAnimationFrame(updateScrollProgress);
  }, { passive: true });
  updateScrollProgress();

  const themeBtns = Array.from(document.querySelectorAll('.theme-btn'));
  function getEffectiveTheme() {
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeButtons() {
    const isDark = getEffectiveTheme() === 'dark';
    themeBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(isDark)));
  }
  syncThemeButtons();

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('rafael-theme', next); } catch {}
      syncThemeButtons();
    });
  });

  // 2. Draggable Split-Compare Slider
  const splitStage = document.getElementById('split-stage');
  const splitHandle = document.getElementById('split-handle');
  if (splitStage && splitHandle) {
    let splitPct = 50;
    let dragging = false;
    function setSplit(pct) {
      splitPct = Math.max(8, Math.min(92, Math.round(pct)));
      splitStage.style.setProperty('--split', `${splitPct}%`);
      splitHandle.setAttribute('aria-valuenow', String(splitPct));
    }
    splitHandle.addEventListener('pointerdown', (e) => {
      dragging = true;
      splitHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    splitHandle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = splitStage.getBoundingClientRect();
      setSplit(((e.clientX - rect.left) / rect.width) * 100);
    });
    splitHandle.addEventListener('pointerup', () => { dragging = false; });
    splitHandle.addEventListener('pointercancel', () => { dragging = false; });
    splitHandle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { setSplit(splitPct - 6); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setSplit(splitPct + 6); e.preventDefault(); }
    });
  }

  // 3. Safe Scroll Reveal
  const revealEls = document.querySelectorAll('.reveal');
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // 4. School-Day Scroll-Spy with sliding pill indicator
  const dayPillsWrap = document.querySelector('.day-pills');
  const dayPills = Array.from(document.querySelectorAll('.day-pill'));
  const trackedSections = dayPills
    .map((pill) => document.getElementById(pill.dataset.section))
    .filter(Boolean);

  let dayIndicator = null;
  if (dayPillsWrap) {
    dayIndicator = document.createElement('div');
    dayIndicator.className = 'day-pill-indicator';
    dayIndicator.setAttribute('aria-hidden', 'true');
    dayPillsWrap.prepend(dayIndicator);
  }

  function moveDayIndicator(pill) {
    if (!dayIndicator || !pill) return;
    dayIndicator.style.opacity = '1';
    dayIndicator.style.width = `${pill.offsetWidth}px`;
    dayIndicator.style.transform = `translateX(${pill.offsetLeft}px)`;
  }

  function setActivePill(sectionId) {
    let activePill = null;
    for (const pill of dayPills) {
      const active = pill.dataset.section === sectionId;
      pill.classList.toggle('is-active', active);
      if (active) activePill = pill;
    }
    if (activePill) {
      moveDayIndicator(activePill);
      const bar = document.querySelector('.day-bar-inner');
      if (bar) {
        bar.scrollTo({
          left: activePill.offsetLeft - bar.clientWidth / 2 + activePill.offsetWidth / 2,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    }
  }

  if (dayPills.length) {
    const initialActive = dayPills.find((p) => p.classList.contains('is-active')) || dayPills[0];
    requestAnimationFrame(() => moveDayIndicator(initialActive));
    window.addEventListener('resize', () => {
      const current = dayPills.find((p) => p.classList.contains('is-active'));
      if (current) moveDayIndicator(current);
    });
  }

  if ('IntersectionObserver' in window && trackedSections.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActivePill(entry.target.id);
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );
    trackedSections.forEach((sec) => spyObserver.observe(sec));
  }

  // 5. Accordions with inert + Recruiter/Developer Mode
  const accordions = Array.from(document.querySelectorAll('.accordion'));
  const modeGroups = Array.from(document.querySelectorAll('.segmented-control'));
  const techBanner = document.getElementById('tech-banner');

  function setAccordionState(acc, open) {
    const trigger = acc.querySelector('.accordion-trigger');
    const panel = acc.querySelector('.accordion-panel');
    if (!trigger || !panel) return;
    trigger.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    panel.classList.toggle('is-open', open);
  }

  accordions.forEach((acc) => {
    acc.querySelector('.accordion-trigger')?.addEventListener('click', () => {
      const isOpen = acc.querySelector('.accordion-trigger').getAttribute('aria-expanded') === 'true';
      setAccordionState(acc, !isOpen);
    });
  });

  function setReadingMode(mode) {
    const isTechnical = mode === 'technical';
    modeGroups.forEach((group) => {
      group.dataset.active = mode;
      group.querySelectorAll('.seg-btn').forEach((btn) => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    });
    if (techBanner) techBanner.hidden = !isTechnical;
    accordions.forEach((acc) => setAccordionState(acc, isTechnical));
  }

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => setReadingMode(btn.dataset.mode));
  });

  // 6. Watchdog: Live JSON from site-watchdog
  const watchdogList = document.getElementById('watchdog-list');
  async function loadWatchdog() {
    if (!watchdogList) return;
    try {
      const res = await fetch('https://raw.githubusercontent.com/rafaelkoo/site-watchdog/main/data/latest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      if (!sites.length) throw new Error('No sites array');

      watchdogList.innerHTML = '';
      sites.forEach((site) => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = site.name || site.url || 'Site';

        const d = site.desktop || {};
        const p = site.phone || {};
        const isHealthy = Boolean(
          d.up && p.up &&
          (!d.jsErrors || d.jsErrors.length === 0) &&
          (!d.axe || d.axe.length === 0) &&
          (!d.brokenLinks || d.brokenLinks.length === 0) &&
          (!p.jsErrors || p.jsErrors.length === 0) &&
          (!p.axe || p.axe.length === 0) &&
          (!p.brokenLinks || p.brokenLinks.length === 0)
        );

        const status = document.createElement('span');
        status.className = isHealthy ? 'status-ok' : 'status-warn';
        const ms = typeof d.loadMs === 'number' ? `${Math.round(d.loadMs)} ms` : 'Checked';
        status.textContent = isHealthy ? `All good · ${ms}` : 'Needs a look';
        li.append(name, status);
        watchdogList.append(li);
      });
    } catch {
      watchdogList.innerHTML = '<li class="status-loading">Could not load live results from <code>site-watchdog/data/latest.json</code>.</li>';
    }
  }
  loadWatchdog();

  // 7. Mobile Drawer (focus management)
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  function toggleDrawer(open) {
    if (!drawer || !mobileBtn) return;
    drawer.hidden = !open;
    mobileBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawerCloseBtn?.focus();
    else mobileBtn.focus();
  }
  mobileBtn?.addEventListener('click', () => toggleDrawer(true));
  document.querySelectorAll('[data-close-drawer]').forEach((el) => el.addEventListener('click', () => toggleDrawer(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer && !drawer.hidden) toggleDrawer(false); });

  // 8. Copy Email + Toast
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }
  document.querySelectorAll('.copy-email-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email || 'rafaelkoo.uk@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        showToast(`Copied ${email}`);
        setTimeout(() => { btn.textContent = orig; }, 1800);
      } catch {
        showToast(`Email: ${email}`);
      }
    });
  });

  // 9. Real GorB Pixel Gym (using ../js/pixel.js drawGym)
  const fig = document.getElementById('gorb-gym-fig');
  const img = fig?.querySelector('img');
  if (img) {
    const STATIONS = ['rack', 'bench', 'tread', 'dbs', 'ohp', 'climb', 'pullup', 'bike', 'rower', 'cable', 'machine', 'mat'];
    const av = (id) => cleanAvatar(defaultAvatar(id), id);
    const people = [
      { id: 'kai', name: 'Kai', station: 'rack' },
      { id: 'mina', name: 'Mina', station: 'bench' },
      { id: 'raf', name: 'Rafael', station: 'climb', me: true },
      { id: 'theo', name: 'Theo', station: 'tread' },
      { id: 'jo', name: 'Jo', station: 'rest' }
    ].map((p) => ({ ...p, avatar: av(p.id), inGym: p.station !== 'rest' }));

    const SCALE = 4;
    const cv = document.createElement('canvas');
    cv.width = W * SCALE;
    cv.height = H * SCALE;
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `${img.alt}. Live: tap a person to move them.`);
    cv.style.cssText = 'width:100%;height:auto;display:block;border-radius:12px;cursor:pointer;background:#1b1712';

    let boxes = [], lastFrame = -1, running = false, raf = 0, timer = 0;
    const paint = (t) => { boxes = drawGym(cv, people, t, SCALE, 'REST'); };
    const move = (p) => {
      const free = STATIONS.filter((s) => s !== p.station && !people.some((q) => q !== p && q.station === s));
      const next = Math.random() < 0.15 ? 'rest' : free[Math.floor(Math.random() * free.length)];
      p.station = next; p.inGym = next !== 'rest';
      lastFrame = -1;
    };
    const loop = (now) => {
      const f = Math.floor(now / 450);
      if (f !== lastFrame) { lastFrame = f; paint(now); }
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true; raf = requestAnimationFrame(loop);
      timer = setInterval(() => move(people[Math.floor(Math.random() * people.length)]), 3500);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); clearInterval(timer); };

    try {
      paint(0);
      img.replaceWith(cv);
    } catch { /* fallback to img/gorb-gym.png */ }

    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect(), k = cv.width / r.width;
      const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      const hit = boxes.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
      move(hit ? hit.p : people[Math.floor(Math.random() * people.length)]);
      if (prefersReducedMotion) paint(0);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((en) => (en.isIntersecting ? start() : stop())), { threshold: 0.2 }).observe(cv);
    } else {
      start();
    }
  }
})();
