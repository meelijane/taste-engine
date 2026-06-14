// ══════════════════════════════════════════════════════
// TASTE EXPORT — compose a shareable poster-style PNG of a
// result (eyebrow · profile title · top tags · radar · picks ·
// wordmark) on a canvas and download it. Pure canvas, no deps.
//   TasteExport.download(engine)
// ══════════════════════════════════════════════════════
(function () {
  const cap = s => (s || '').charAt(0).toUpperCase() + (s || '').slice(1);

  function hexA(hex, a) {
    const h = (hex || '').replace('#', '');
    if (h.length < 6) return `rgba(255,255,255,${a})`;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function roundRect(x, X, Y, W, H, r) {
    x.beginPath();
    x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath();
  }

  // Wrap text; returns the y below the last line.
  function wrapText(x, text, X, Y, maxW, lh, font) {
    x.font = font;
    const words = String(text).split(/\s+/);
    let line = '', y = Y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (x.measureText(test).width > maxW && line) { x.fillText(line, X, y); y += lh; line = w; }
      else line = test;
    }
    if (line) { x.fillText(line, X, y); y += lh; }
    return y;
  }

  function chip(x, X, Y, label, bg, fg, fs) {
    x.font = `700 ${fs}px 'Hanken Grotesk', sans-serif`;
    const padX = fs * 0.7, h = fs * 1.85, w = x.measureText(label).width + padX * 2;
    x.fillStyle = bg; roundRect(x, X, Y, w, h, h / 2); x.fill();
    x.fillStyle = fg; x.textBaseline = 'middle'; x.fillText(label, X + padX, Y + h / 2 + 1);
    x.textBaseline = 'alphabetic';
    return { w, h };
  }

  function drawTagRow(x, tags, X, Y, maxW, bg, fg) {
    const fs = 30, gap = 12; let cx = X, cy = Y;
    tags.forEach(t => {
      x.font = `700 ${fs}px 'Hanken Grotesk', sans-serif`;
      const w = x.measureText(t).width + fs * 1.4;
      if (cx + w > X + maxW) { cx = X; cy += fs * 1.85 + gap; }
      chip(x, cx, cy, t, bg, fg, fs);
      cx += w + gap;
    });
    return cy + fs * 1.85;
  }

  function drawRadar(x, cx, cy, R, labels, scores, accent, grid, muted) {
    const N = labels.length, ang = i => (i / N) * Math.PI * 2 - Math.PI / 2;
    const pt = (i, r) => ({ x: cx + Math.cos(ang(i)) * r, y: cy + Math.sin(ang(i)) * r });
    x.lineWidth = 1.5; x.strokeStyle = grid;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      x.beginPath();
      for (let i = 0; i < N; i++) { const p = pt(i, R * f); i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); }
      x.closePath(); x.stroke();
    });
    for (let i = 0; i < N; i++) { const p = pt(i, R); x.beginPath(); x.moveTo(cx, cy); x.lineTo(p.x, p.y); x.stroke(); }
    x.beginPath();
    scores.forEach((s, i) => { const p = pt(i, R * Math.max(s, 0.05)); i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); });
    x.closePath(); x.fillStyle = hexA(accent, 0.28); x.fill(); x.strokeStyle = accent; x.lineWidth = 4; x.stroke();
    scores.forEach((s, i) => { const p = pt(i, R * Math.max(s, 0.05)); x.beginPath(); x.arc(p.x, p.y, 6, 0, 7); x.fillStyle = accent; x.fill(); });
    x.fillStyle = muted; x.font = "600 22px 'Hanken Grotesk', sans-serif"; x.textAlign = 'center';
    labels.forEach((l, i) => { const p = pt(i, R + 34); x.fillText(l, p.x, p.y + 7); });
    x.textAlign = 'left';
  }

  async function download(engine) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    const bg = v('--bg') || '#10121a', accent = v('--accent') || '#FF5C9A', accent2 = v('--accent2') || '#2EC5FF';
    const onAccent = v('--on-accent') || '#10070b', onAccent2 = v('--on-accent2') || '#04121a';
    const text = v('--text') || '#fff', muted = v('--text-muted') || '#aaa', border = v('--border') || '#333';

    const { raw, norm, picks } = engine._getTagScores();
    const prof = engine._lastProfile || engine._cachedProfile || {};
    const title = prof.title || ('My ' + cap(engine.config.domain) + ' Taste');
    const tags = (prof.topTags && prof.topTags.length ? prof.topTags : engine._topTags(raw, 5)).slice(0, 5);
    const scores = engine._getAxisScores(norm);

    const W = 1080, H = 1350, P = 84;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W * 0.92, 0, 0, W * 0.92, 0, W * 0.95);
    g.addColorStop(0, hexA(accent2, 0.20)); g.addColorStop(1, 'transparent');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    let y = P;
    chip(x, P, y, ('Your ' + cap(engine.config.domain) + ' Taste').toUpperCase(), accent, onAccent, 28);
    y += 96;
    x.fillStyle = text; x.textBaseline = 'top';
    y = wrapText(x, title, P, y, W - 2 * P, 84, "800 70px 'Unbounded', sans-serif");
    x.textBaseline = 'alphabetic';
    y += 34;
    y = drawTagRow(x, tags, P, y, W - 2 * P, accent2, onAccent2);
    y += 40;

    drawRadar(x, W / 2, y + 250, 230, engine.axes.map(a => a.label), scores, accent, border, muted);
    y += 560;

    x.fillStyle = muted; x.font = "700 22px 'Hanken Grotesk', sans-serif";
    x.fillText('BASED ON ' + picks.length + ' PICKS', P, y); y += 42;
    x.fillStyle = text;
    wrapText(x, picks.map(p => p.name).slice(0, 8).join('   ·   '), P, y, W - 2 * P, 38, "500 27px 'Hanken Grotesk', sans-serif");

    x.fillStyle = accent; x.font = "800 32px 'Unbounded', sans-serif";
    x.fillText('✦ Taste Engine', P, H - 64);

    c.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'taste-' + engine.config.domain + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }, 'image/png');
  }

  window.TasteExport = { download };
})();
