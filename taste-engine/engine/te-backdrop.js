// ══════════════════════════════════════════════════════
// GEOMETRIC BACKDROP
// Seeded, themeable geometric pattern that lives BEHIND the
// content: a handful of large overlapping shapes (rects /
// circles / triangles), each clipped and filled with a line
// texture (hatch / crosshatch / dots / waves / rings) in the
// section's two accent colours. Layered largest-first, low
// opacity, static (calm + cheap). Inspired by pxl-pshr's
// geometric-pattern-generator.
//
//   TasteBackdrop.start({ accent, accent2, bg, seed })
//
// accent / accent2 / bg default to the page's CSS vars, so
// calling start() again after a theme change re-skins it.
// ══════════════════════════════════════════════════════
(function () {
  const TAU = Math.PI * 2;

  // Seeded PRNG (mulberry32) — same seed reproduces the same pattern.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  // Resolve any CSS colour string to {r,g,b} via the canvas.
  function toRGB(color) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillStyle = color;
    const m = x.fillStyle;
    if (m[0] === '#') {
      let h = m.slice(1);
      if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    const n = m.match(/\d+/g) || [0, 0, 0];
    return { r: +n[0], g: +n[1], b: +n[2] };
  }
  const rgb = c => `rgb(${c.r},${c.g},${c.b})`;
  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

  const Backdrop = {
    _canvas: null,

    start(opts) {
      opts = opts || {};
      const accent = toRGB(opts.accent || cssVar('--accent', '#FF5C9A'));
      const accent2 = toRGB(opts.accent2 || cssVar('--accent2', '#2EC5FF'));
      const bg = toRGB(opts.bg || cssVar('--bg', '#0D0B11'));
      const seed = (opts.seed != null ? opts.seed : 1337) >>> 0;

      let canvas = this._canvas || document.getElementById('te-backdrop');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'te-backdrop';
        document.body.insertBefore(canvas, document.body.firstChild);
      }
      this._canvas = canvas;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      canvas.style.transition = reduce ? 'none' : 'opacity 0.9s ease';
      canvas.style.opacity = '0';
      requestAnimationFrame(() => { canvas.style.opacity = '1'; });

      const ctx = canvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let W, H;
      const colors = [accent, accent2];

      // ── line textures, drawn inside the current clip ──
      function texture(kind, R) {
        const span = R * 1.7, gap = 14;
        if (kind === 'hatch' || kind === 'cross') {
          for (let x = -span; x <= span; x += gap) { ctx.beginPath(); ctx.moveTo(x, -span); ctx.lineTo(x, span); ctx.stroke(); }
          if (kind === 'cross') for (let y = -span; y <= span; y += gap) { ctx.beginPath(); ctx.moveTo(-span, y); ctx.lineTo(span, y); ctx.stroke(); }
        } else if (kind === 'dots') {
          for (let x = -span; x <= span; x += 16) for (let y = -span; y <= span; y += 16) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill(); }
        } else if (kind === 'waves') {
          const amp = 5, wl = 28;
          for (let y = -span; y <= span; y += gap) {
            ctx.beginPath();
            for (let x = -span; x <= span; x += 4) { const yy = y + Math.sin((x / wl) * TAU) * amp; x === -span ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
            ctx.stroke();
          }
        } else { // rings
          for (let r = 9; r < span; r += 15) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
        }
      }

      function shapePath(type, R) {
        ctx.beginPath();
        if (type === 'circle') ctx.arc(0, 0, R / 2, 0, TAU);
        else if (type === 'triangle') {
          const r = R / 2;
          for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * (TAU / 3); const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.closePath();
        } else ctx.rect(-R / 2, -R / 2, R, R);
      }

      function render() {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = rgb(bg); ctx.fillRect(0, 0, W, H);

        const rand = rng(seed);
        const base = Math.max(W, H);
        const TYPES = ['rect', 'circle', 'triangle', 'rect'];
        const TEX = ['hatch', 'hatch', 'cross', 'dots', 'waves', 'rings'];
        const shapes = [];
        for (let i = 0; i < 13; i++) {
          shapes.push({
            type: TYPES[(rand() * TYPES.length) | 0],
            cx: rand() * W, cy: rand() * H,
            R: (0.20 + rand() * 0.45) * base,
            rot: rand() * Math.PI,
            texRot: rand() * Math.PI,
            col: colors[(rand() * colors.length) | 0],
            alpha: 0.05 + rand() * 0.07
          });
        }
        shapes.sort((a, b) => b.R - a.R); // largest first

        shapes.forEach(s => {
          ctx.save();
          ctx.translate(s.cx, s.cy); ctx.rotate(s.rot);
          shapePath(s.type, s.R); ctx.clip();
          // soft colour wash within the shape
          ctx.globalAlpha = s.alpha * 0.6;
          ctx.fillStyle = rgba(s.col, 1);
          ctx.fillRect(-s.R, -s.R, s.R * 2, s.R * 2);
          // line texture on top
          ctx.globalAlpha = Math.min(0.5, s.alpha * 2.4);
          ctx.strokeStyle = rgba(s.col, 1);
          ctx.lineWidth = 1.4;
          ctx.rotate(s.texRot);
          texture(TEX[(rng(seed + s.cx | 0)() * TEX.length) | 0], s.R);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      }

      render();
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      this._onResize = () => render();
      window.addEventListener('resize', this._onResize);
    }
  };

  window.TasteBackdrop = Backdrop;
})();
