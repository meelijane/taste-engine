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
    var forceProd = /[?&]prod\b/.test(search);
    var forceAll = /[?&]all\b/.test(search) || (window.localStorage && window.localStorage.getItem('te-show-all') === '1');
    var enabled = computeEnabled(location.hostname, { forceProd: forceProd, forceAll: forceAll });
    Config.enabled = enabled;
    Config.isDev = enabled.length > 1 && !forceProd;

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
    };
    if (document.readyState !== 'loading') apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }

  if (typeof window !== 'undefined') window.TasteConfig = Config;
  if (typeof module !== 'undefined' && module.exports) module.exports = Config;
})();
