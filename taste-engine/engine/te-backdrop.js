// ══════════════════════════════════════════════════════
// QUIET CURRENTS — generative flow-field backdrop
// A calm, themeable particle current that lives BEHIND the
// content. Vanilla canvas (no deps), seeded, performant,
// and respectful of prefers-reduced-motion. See
// te-backdrop-philosophy.md for the why.
//
//   TasteBackdrop.start({ accent, bg, seed })
//
// accent / bg default to the page's --accent / --bg CSS vars,
// so calling start() again after a theme change re-skins it.
// ══════════════════════════════════════════════════════
(function () {
  const TWO_PI = Math.PI * 2;

  // Small seeded PRNG (mulberry32) so a seed reproduces the same release pattern.
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

  const Backdrop = {
    _raf: null,
    _canvas: null,

    start(opts) {
      opts = opts || {};
      const accent = toRGB(opts.accent || cssVar('--accent', '#E0698A'));
      const bg = toRGB(opts.bg || cssVar('--bg', '#12141B'));
      const seed = (opts.seed != null ? opts.seed : 1337) >>> 0;

      // One canvas, reused across theme changes / re-inits.
      let canvas = this._canvas || document.getElementById('te-backdrop');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'te-backdrop';
        document.body.insertBefore(canvas, document.body.firstChild);
      }
      this._canvas = canvas;
      // Fade the whole backdrop in (and on re-skin) so the colour never snaps.
      canvas.style.transition = 'opacity 0.9s ease';
      canvas.style.opacity = '0';
      requestAnimationFrame(() => { canvas.style.opacity = '1'; });
      const ctx = canvas.getContext('2d');

      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;

      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      let W, H, particles;
      const COUNT = 360;        // sparse — long ribbons, not dense fur
      const STEP = 1.35;        // longer step → flowing strokes
      const FADE = 0.028;       // slow reclaim → ribbons linger
      const STROKE = 0.07;      // faint; the image is the accumulation

      // Lower spatial frequency → broad, smooth currents instead of tight curls.
      const field = (x, y, t) =>
        TWO_PI * (
          Math.sin(x * 0.00092 + t * 0.00015) +
          Math.cos(y * 0.00104 - t * 0.00012) +
          0.5 * Math.sin((x + y) * 0.00058 + t * 0.00005)
        );

      const rand = rng(seed);
      function seedParticles() {
        particles = [];
        for (let i = 0; i < COUNT; i++) {
          particles.push({ x: rand() * W, y: rand() * H, life: 170 + rand() * 280 });
        }
      }

      function resize() {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`;
        ctx.fillRect(0, 0, W, H);
        seedParticles();
      }

      const fadeCol = `rgba(${bg.r},${bg.g},${bg.b},${FADE})`;
      const strokeCol = `rgba(${accent.r},${accent.g},${accent.b},${STROKE})`;

      function tick(frame) {
        ctx.fillStyle = fadeCol;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const t = frame;
        for (const p of particles) {
          const a = field(p.x, p.y, t);
          const nx = p.x + Math.cos(a) * STEP;
          const ny = p.y + Math.sin(a) * STEP;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          p.x = nx; p.y = ny; p.life--;
          if (p.life < 0 || nx < 0 || nx > W || ny < 0 || ny > H) {
            p.x = rand() * W; p.y = rand() * H; p.life = 170 + rand() * 280;
          }
        }
        ctx.stroke();
      }

      resize();
      window.removeEventListener('resize', this._onResize || (() => {}));
      this._onResize = () => resize();
      window.addEventListener('resize', this._onResize);

      if (reduce) {
        // Settle instantly into a single composed still frame.
        for (let f = 0; f < 320; f++) tick(f * 4);
        return;
      }

      let frame = 0;
      const loop = () => {
        // Pause when the tab is hidden — no wasted cycles.
        if (!document.hidden) { tick(frame); frame += 1; }
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
  };

  window.TasteBackdrop = Backdrop;
})();
