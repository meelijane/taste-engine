// Guarded proxy to the Anthropic Messages API (Vercel serverless function).
// The browser POSTs /api/claude the same payload it would send to
// api.anthropic.com; the key stays server-side. Two guards keep the public URL
// from becoming an open meter on the project's Anthropic credits:
//   - same-origin: the Origin/Referer host must match the deployment host
//   - rate limit: a per-IP cap in a rolling window (best-effort, in-memory)
// Local dev uses taste-engine/server.js instead, which has no guard.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 15;        // generous enough for a real session
const hits = new Map();           // ip -> { count, resetAt }

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) { hits.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

// Best-effort: warm instances keep `hits`, cold starts reset it. A speed bump
// against casual abuse, not a hard guarantee.
function sameOrigin(req) {
  const host = req.headers['host'];
  const ref = req.headers['origin'] || req.headers['referer'];
  if (!host || !ref) return false;
  try { return new URL(ref).host === host; } catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'Server is missing ANTHROPIC_API_KEY.' } });
  if (!sameOrigin(req)) return res.status(403).json({ error: { message: 'Forbidden: requests must come from the app.' } });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: { message: 'You have hit the demo rate limit. Try again later.' } });

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body
    });
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: { message: 'Proxy failed: ' + String(e) } });
  }
};
