// Poster / cover-art / portrait lookup (Vercel serverless function).
// Keyless sources (iTunes) always work; TMDB needs TMDB_API_KEY (optional —
// without it those lookups return null and the client falls back to initials).
// Mirrors the imageLookup in taste-engine/server.js used for local dev.
const TMDB_KEY = process.env.TMDB_API_KEY;
const cache = new Map();

async function imageLookup(source, q, opts) {
  const cacheKey = source + ':' + (opts.type || opts.entity || '') + ':' + q.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let url = null;
  try {
    if (source === 'tmdb' && TMDB_KEY && opts.type === 'person') {
      const r = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);
      const d = await r.json();
      const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const want = norm(q);
      const hit = (d.results || []).find(p => p.profile_path && norm(p.name) === want);
      if (hit) url = `https://image.tmdb.org/t/p/w342${hit.profile_path}`;
    } else if (source === 'tmdb' && TMDB_KEY) {
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
  cache.set(cacheKey, url);
  return url;
}

module.exports = async (req, res) => {
  const query = req.query || {};
  const url = await imageLookup(query.source, query.q || '', { entity: query.entity, type: query.type }).catch(() => null);
  return res.status(200).json({ url: url || null });
};
