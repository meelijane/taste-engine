// ══════════════════════════════════════════════════════
// LOCAL DEV SHIM
// Loaded BEFORE taste-engine.js. Detects whether we're in
// the Claude chat sandbox (which provides window.storage and
// injects API auth/CORS) vs. running under the local Node
// server. Only in local mode does it route Claude through the
// /api/claude proxy and shim storage onto localStorage — so
// the same engine runs unchanged in both environments.
// ══════════════════════════════════════════════════════
(function () {
  if (window.storage) return; // sandbox: leave everything as-is

  // Local mode → proxy Claude calls through our Node server.
  window.CLAUDE_PROXY_URL = '/api/claude';

  // Local mode → persist "user added" items in localStorage.
  window.storage = {
    async get(key) {
      const v = localStorage.getItem('te-storage:' + key);
      return v === null ? null : { value: v };
    },
    async set(key, value) {
      localStorage.setItem('te-storage:' + key, value);
      return true;
    }
  };
})();
