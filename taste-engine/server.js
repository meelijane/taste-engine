// ══════════════════════════════════════════════════════
// TASTE ENGINE — local dev server
//
//   ANTHROPIC_API_KEY=sk-ant-... node server.js
//
// Serves the static instances AND proxies Claude API calls so
// the browser never needs the key (and CORS is a non-issue).
// No dependencies — plain Node (>=18 for global fetch).
// ══════════════════════════════════════════════════════
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8777;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Load .env (next to this file) so the key works whether the server is launched
// from a terminal or by the Claude preview panel. Real env vars take precedence.
(function loadEnv() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    txt.split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch (e) { /* no .env — fine */ }
})();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const TMDB_KEY = process.env.TMDB_API_KEY;

// Resolve a poster / cover-art URL from a keyless or keyed image source.
// source=tmdb (type=tv|movie, needs TMDB_API_KEY) · source=itunes (entity=podcast|album, keyless)
const imgCache = new Map();
async function imageLookup(source, q, opts) {
  const cacheKey = source + ':' + (opts.type || opts.entity || '') + ':' + q.toLowerCase();
  if (imgCache.has(cacheKey)) return imgCache.get(cacheKey);
  let url = null;
  try {
    if (source === 'tmdb' && TMDB_KEY) {
      const t = opts.type === 'movie' ? 'movie' : 'tv';
      const r = await fetch(`https://api.themoviedb.org/3/search/${t}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);
      const d = await r.json();
      const p = d.results && d.results[0] && d.results[0].poster_path;
      if (p) url = `https://image.tmdb.org/t/p/w342${p}`;
    } else if (source === 'itunes') {
      const entity = opts.entity || 'podcast';
      const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=${encodeURIComponent(entity)}&limit=1`);
      const d = await r.json();
      const a = d.results && d.results[0] && (d.results[0].artworkUrl100 || d.results[0].artworkUrl60);
      if (a) url = a.replace(/\/\d+x\d+bb\./, '/400x400bb.');
    }
  } catch (e) { /* leave url null */ }
  imgCache.set(cacheKey, url);
  return url;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // ── Claude proxy ──
  if (req.method === 'POST' && req.url === '/api/claude') {
    if (!API_KEY) {
      return sendJson(res, 500, { error: { message: 'Server is missing ANTHROPIC_API_KEY. Restart with: ANTHROPIC_API_KEY=sk-ant-... node server.js' } });
    }
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const upstream = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body
        });
        const text = await upstream.text();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(text);
      } catch (e) {
        sendJson(res, 502, { error: { message: 'Proxy failed: ' + String(e) } });
      }
    });
    return;
  }

  // ── Image proxy (posters / cover art) ──
  if (req.method === 'GET' && req.url.startsWith('/api/image')) {
    const u = new URL(req.url, 'http://localhost');
    imageLookup(u.searchParams.get('source'), u.searchParams.get('q') || '', {
      entity: u.searchParams.get('entity'),
      type: u.searchParams.get('type')
    }).then(url => sendJson(res, 200, { url: url || null }))
      .catch(() => sendJson(res, 200, { url: null }));
    return;
  }

  // ── Static files ──
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  // "/" → overview landing page. Instance dirs resolve their own index.html.
  // (Instance HTML loads ./meta.md and ../../engine/* via RELATIVE paths, so the
  // trailing slash matters — /instances/comedy/ not /instances/comedy.)
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache, must-revalidate'  // dev server: always serve fresh edits
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Taste Engine → http://127.0.0.1:${PORT}/instances/comedy/index.html`);
  console.log(`                 http://127.0.0.1:${PORT}/instances/music/index.html`);
  if (!API_KEY) {
    console.log('\n  ⚠  ANTHROPIC_API_KEY not set — Profile / Recommend / Add will return an error.');
    console.log('     Restart with:  ANTHROPIC_API_KEY=sk-ant-... node server.js\n');
  } else {
    console.log('  ✓  Claude proxy active.');
  }
  console.log(TMDB_KEY ? '  ✓  TMDB poster proxy active (TV).' : '  ·  TMDB_API_KEY not set — TV posters fall back to placeholders (podcasts use keyless iTunes).');
  console.log('');
});
