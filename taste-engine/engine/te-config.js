// ══════════════════════════════════════════════════════
// FEATURE FLAGS — which sections are live.
// Production launches with COMEDY only; the rest are visible
// in development (localhost) and behind an opt-in override.
// Hides disabled nav links + landing cards and guards direct
// routes to hidden instances.
//   ?prod  → force production (comedy only), even on localhost
//   ?all   → force all sections, even in production
// ══════════════════════════════════════════════════════
(function () {
  var ALL = ['comedy', 'music', 'tv', 'film', 'books', 'podcasts'];

  // Pure + testable: which sections are enabled for this host?
  function computeEnabled(host, opts) {
    opts = opts || {};
    if (opts.forceProd) return ['comedy'];
    var isDev = !host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || /\.local$/.test(host);
    return (isDev || opts.forceAll) ? ALL.slice() : ['comedy'];
  }

  var Config = { ALL: ALL, computeEnabled: computeEnabled };

  // Browser wiring (skipped under a test runner with no document).
  if (typeof document !== 'undefined' && typeof location !== 'undefined') {
    var search = location.search || '';
    var ls = window.localStorage;
    var host = location.hostname;
    var onLocalhost = !host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || /\.local$/.test(host);
    var forcedProd = !!(ls && ls.getItem('te-force-prod') === '1');   // dev toggle
    var forceProd = /[?&]prod\b/.test(search) || forcedProd;
    var forceAll = /[?&]all\b/.test(search) || (ls && ls.getItem('te-show-all') === '1');
    var enabled = computeEnabled(host, { forceProd: forceProd, forceAll: forceAll });
    Config.enabled = enabled;
    Config.isDev = onLocalhost;

    // Guard: bounce away from a hidden instance before it renders.
    var m = location.pathname.match(/\/instances\/([^\/]+)\//);
    if (m && enabled.indexOf(m[1]) < 0) { location.replace('/'); return; }

    var apply = function () {
      document.querySelectorAll('.te-topnav-links a[data-domain]').forEach(function (a) {
        if (enabled.indexOf(a.getAttribute('data-domain')) < 0) a.remove();
      });
      document.querySelectorAll('.te-domain[data-domain]').forEach(function (c) {
        if (enabled.indexOf(c.getAttribute('data-domain')) < 0) c.remove();
      });
      // When sections are hidden, leave a tasteful teaser on the landing grid.
      var grid = document.querySelector('.te-domain-grid');
      if (grid && enabled.length === 1 && !grid.querySelector('.te-soon')) {
        var d = document.createElement('div');
        d.className = 'te-domain te-soon';
        d.innerHTML = '<span class="te-domain-icon">⋯</span><span class="te-domain-body">' +
          '<span class="te-domain-name">More coming soon</span>' +
          '<span class="te-domain-desc">New categories to map your taste across are on the way.</span></span>';
        grid.appendChild(d);
      }
      if (onLocalhost) buildDevBar();
    };

    // Local-dev control panel (localhost only — never ships to production).
    // Toggles flags by writing localStorage and reloading.
    function buildDevBar() {
      if (document.getElementById('te-devbar')) return;
      var css = '#te-devbar{position:fixed;left:14px;bottom:14px;z-index:9000;pointer-events:none;'
        + 'display:flex;align-items:center;gap:10px;background:#16121C;border:1.5px solid #332A3E;'
        + 'color:#BBB0C4;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;padding:9px 12px;'
        + 'letter-spacing:.02em;box-shadow:0 12px 32px -14px #000;}'
        + '#te-devbar b{color:#FF5C9A;text-transform:uppercase;letter-spacing:.14em;font-size:10px;}'
        + '#te-devbar label{display:flex;align-items:center;gap:7px;cursor:pointer;color:#F4EEF3;pointer-events:auto;}'
        + '#te-devbar input{accent-color:#FF5C9A;width:15px;height:15px;cursor:pointer;margin:0;}';
      var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
      var bar = document.createElement('div'); bar.id = 'te-devbar';
      bar.innerHTML = '<b>Dev</b><label><input type="checkbox" id="te-dev-prod"' + (forcedProd ? ' checked' : '')
        + '> Prod preview (Comedy only)</label>';
      document.body.appendChild(bar);
      document.getElementById('te-dev-prod').addEventListener('change', function (e) {
        if (e.target.checked) ls.setItem('te-force-prod', '1');
        else ls.removeItem('te-force-prod');
        location.reload();
      });
    }
    if (document.readyState !== 'loading') apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }

  if (typeof window !== 'undefined') window.TasteConfig = Config;
  if (typeof module !== 'undefined' && module.exports) module.exports = Config;
})();
