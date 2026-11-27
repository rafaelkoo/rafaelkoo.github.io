(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0. Scroll Progress Bar + Light/Dark Theme Toggle
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
      window.dispatchEvent(new CustomEvent('rafael-theme-change'));
    });
  });

  // 0b. Draggable Split-Compare Slider (inspired by student portfolio D)
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

  // 1. Safe Scroll Reveal (.js class is added in <head>)
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

  // 2. School-Day Scroll-Spy with sliding pill indicator
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

  // 3. Accordions with inert + Recruiter/Developer Mode (non-shifting floating pill)
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

  // 4. Illustrative Tracker Graph (Safari-safe stroke-dashoffset re-trigger)
  const workExamples = {
    ex1: ['Unit A \u00b7 Shared criterion', 'Unit B \u00b7 Shared criterion', 'Unit C \u00b7 Shared criterion'],
    ex2: ['Unit D \u00b7 Shared criterion', 'Unit E \u00b7 Shared criterion', 'Unit F \u00b7 Shared criterion']
  };

  document.querySelectorAll('.graph-node').forEach((node) => {
    node.addEventListener('click', () => {
      const labels = workExamples[node.dataset.work];
      if (!labels) return;
      document.querySelectorAll('.graph-node').forEach((n) => n.classList.toggle('is-active', n === node));

      document.querySelectorAll('.g-line').forEach((path) => {
        path.classList.remove('is-animating');
        void path.getBoundingClientRect();
        if (!prefersReducedMotion) path.classList.add('is-animating');
      });

      labels.forEach((text, idx) => {
        const target = document.getElementById(`target-${idx + 1}`);
        if (target) target.querySelector('strong').textContent = text;
      });
    });
  });

  // 5. Watchdog: Fetch live JSON from site-watchdog (checks desktop.up && phone.up & empty error arrays)
  const watchdogList = document.getElementById('watchdog-list');
  async function loadWatchdog() {
    if (!watchdogList) return;
    try {
      const res = await fetch('https://raw.githubusercontent.com/rafaelkoo/site-watchdog/main/data/latest.json');
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
        status.className = 'status-ok';
        const ms = typeof d.loadMs === 'number' ? `${Math.round(d.loadMs)} ms` : 'Checked';
        status.textContent = isHealthy ? `All good · ${ms}` : 'Needs a look';
        li.append(name, status);
        watchdogList.append(li);
      });
    } catch {
      watchdogList.innerHTML = '<li class="status-loading">TODO: connect live <code>site-watchdog/data/latest.json</code> (no hard-coded numbers).</li>';
    }
  }
  loadWatchdog();

  // 6. Mobile Drawer (moves focus in/out cleanly)
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  function toggleDrawer(open) {
    if (!drawer || !mobileBtn) return;
    drawer.hidden = !open;
    mobileBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      drawerCloseBtn?.focus();
    } else {
      mobileBtn.focus();
    }
  }
  mobileBtn?.addEventListener('click', () => toggleDrawer(true));
  document.querySelectorAll('[data-close-drawer]').forEach((el) => el.addEventListener('click', () => toggleDrawer(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer && !drawer.hidden) toggleDrawer(false); });

  // 7. Copy Email + Toast
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

  // 8. GorB Canvas Placeholder (paused when off-screen via IntersectionObserver)
  const canvas = document.getElementById('gym-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const avatars = [
      { name: 'Member A', x: 90, y: 80, tx: 90, ty: 80, color: '#1d4ed8' },
      { name: 'Member B', x: 210, y: 80, tx: 210, ty: 80, color: '#047857' },
      { name: 'Member C', x: 330, y: 80, tx: 330, ty: 80, color: '#7c3aed' }
    ];
    let activeIdx = 0;
    let rafId = null;
    let isCanvasVisible = false;

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const av = avatars[activeIdx];
      av.tx = Math.max(28, Math.min(canvas.width - 28, (e.clientX - rect.left) * (canvas.width / rect.width)));
      av.ty = Math.max(40, Math.min(canvas.height - 20, (e.clientY - rect.top) * (canvas.height / rect.height)));
      activeIdx = (activeIdx + 1) % avatars.length;
    });

    function drawFrame() {
      const isDark = getEffectiveTheme() === 'dark';
      ctx.fillStyle = isDark ? '#182232' : '#f1f5f9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      avatars.forEach((av) => {
        av.x += (av.tx - av.x) * (prefersReducedMotion ? 1 : 0.14);
        av.y += (av.ty - av.y) * (prefersReducedMotion ? 1 : 0.14);
        const px = Math.round(av.x);
        const py = Math.round(av.y);
        ctx.fillStyle = av.color;
        ctx.fillRect(px - 8, py - 14, 16, 16);
        ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
        ctx.font = '11px "Atkinson Hyperlegible", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(av.name, px, py - 22);
      });

      if (isCanvasVisible) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafId = null;
      }
    }

    window.addEventListener('rafael-theme-change', () => {
      if (!rafId) drawFrame();
    });

    if ('IntersectionObserver' in window) {
      const canvasObserver = new IntersectionObserver((entries) => {
        isCanvasVisible = entries[0].isIntersecting;
        if (isCanvasVisible && rafId === null) {
          drawFrame();
        } else if (!isCanvasVisible && rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      });
      canvasObserver.observe(canvas);
    } else {
      isCanvasVisible = true;
      drawFrame();
    }
  }
})();
