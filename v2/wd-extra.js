// v2 add-on: score sparkline + score for each watchdog row, from the real site-watchdog history.
// Waits for app.js to render the list, then decorates it. Adds nothing if the data can't load.
const BASE = 'https://raw.githubusercontent.com/rafaelkoo/site-watchdog/main/data/';
const list = document.getElementById('watchdog-list');
const spark = (scores) => {
  if (scores.length < 2) return '';
  const w = 84, h = 24, mn = Math.min(...scores, 60), mx = 100;
  const pts = scores.map((s, i) => `${(i / (scores.length - 1) * (w - 2) + 1).toFixed(1)},${(h - 2 - (s - mn) / (mx - mn || 1) * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spk" viewBox="0 0 ${w} ${h}" role="img" aria-label="Score over the last ${scores.length} checks"><polyline points="${pts}"/></svg>`;
};
async function decorate() {
  const [latest, hist] = await Promise.all([
    fetch(BASE + 'latest.json', { cache: 'no-store' }).then(r => r.json()),
    fetch(BASE + 'history.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => [])
  ]);
  for (const li of list.querySelectorAll('li')) {
    const nameEl = li.firstElementChild; if (!nameEl || li.querySelector('.spk-wrap')) continue;
    const site = (latest.sites || []).find(s => s.name === nameEl.textContent.trim()); if (!site) continue;
    const scores = hist.map(run => (run.sites.find(x => x.url === site.url) || {}).score).filter(v => v != null).slice(-30);
    const score = scores.length ? scores[scores.length - 1] : site.score;
    const wrap = document.createElement('span'); wrap.className = 'spk-wrap';
    wrap.innerHTML = spark(scores) + (score != null ? `<b class="spk-score" title="Score out of 100">${score}</b>` : '');
    nameEl.after(wrap);
  }
}
if (list) {
  let done = false;
  const tryIt = () => { if (done || !list.querySelector('li:not(.status-loading)')) return; done = true; decorate().catch(() => {}); };
  new MutationObserver(tryIt).observe(list, { childList: true }); tryIt();
}
