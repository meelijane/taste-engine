// ══════════════════════════════════════════════════════
// TASTE ENGINE v1.0
// A reusable taste profiler. Feed it a config and it
// builds the full picker + profile + radar + recs UI.
// ══════════════════════════════════════════════════════

class TasteEngine {

  constructor() {
    this.config = null;   // parsed from meta.md
    this.items = [];      // parsed from items.md
    this.tagging = {};    // name -> [tags], from tagging.md
    this.axes = [];       // parsed from axes.md
    this.allTags = [];    // parsed from tags.md
    this.selected = new Set();
    this.currentMode = null;
    this.userAddedItems = [];
    this.activeFilters = {}; // { field: Set(values) }
  }

  // ══════════════════════════════════════════════════
  // MARKDOWN PARSERS
  // ══════════════════════════════════════════════════

  parseItems(md) {
    const items = [];
    md.split('\n').forEach(line => {
      line = line.trim();
      if (!line.startsWith('- ')) return;
      const parts = line.slice(2).split(' | ');
      const name = parts[0].trim();
      const meta = {};
      parts.slice(1).forEach(p => {
        const [k, v] = p.split(':').map(s => s.trim());
        meta[k] = v.includes(',') ? v.split(',').map(s => s.trim()) : v;
      });
      items.push({ name, ...meta });
    });
    // dedupe by name
    const seen = new Set();
    return items.filter(i => { if (seen.has(i.name)) return false; seen.add(i.name); return true; });
  }

  parseTagging(md) {
    const map = {};
    md.split('\n').forEach(line => {
      line = line.trim();
      if (!line.startsWith('- ')) return;
      const parts = line.slice(2).split(' | ');
      if (parts.length < 2) return;
      const name = parts[0].trim();
      map[name] = parts[1].split(',').map(t => t.trim());
    });
    return map;
  }

  parseAxes(md) {
    return md.split('\n')
      .filter(l => l.trim().startsWith('- '))
      .map(l => {
        const parts = l.trim().slice(2).split(' | ');
        return {
          label: parts[0].trim(),
          tags: parts[1].split(',').map(t => t.trim()),
          opposite: parts[2] ? parts[2].trim() : null   // the low-end pole of the spectrum
        };
      });
  }

  parseTags(md) {
    return md.split('\n')
      .filter(l => !l.startsWith('#') && l.trim())
      .flatMap(l => l.split(',').map(t => t.trim()))
      .filter(Boolean);
  }

  parseMeta(md) {
    const config = { filters: [], prompts: {} };
    const lines = md.split('\n');
    let inFilters = false;
    let currentFilter = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { inFilters = false; return; }

      if (trimmed === 'filters:') { inFilters = true; return; }

      if (inFilters) {
        if (trimmed.startsWith('- label:') && !trimmed.includes('|')) {
          currentFilter = { label: trimmed.replace('- label:', '').trim(), field: '', options: [] };
          config.filters.push(currentFilter);
        } else if (trimmed.startsWith('field:') && currentFilter) {
          currentFilter.field = trimmed.replace('field:', '').trim();
        } else if (trimmed.startsWith('- label:') && trimmed.includes('| value:') && currentFilter) {
          const [lbl, val] = trimmed.slice(2).split(' | value: ');
          currentFilter.options.push({ label: lbl.replace('label:', '').trim(), value: val.trim() });
        }
        return;
      }

      if (trimmed.includes(': ')) {
        const idx = trimmed.indexOf(': ');
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 2).trim();
        config[key] = value;
      }
    });

    return config;
  }

  // ══════════════════════════════════════════════════
  // LOAD CONFIG FROM MARKDOWN FILES
  // ══════════════════════════════════════════════════

  async loadFromFiles(basePath) {
    const load = async (file) => {
      const res = await fetch(basePath + file);
      return res.text();
    };

    const [metaMd, itemsMd, taggingMd, axesMd, tagsMd] = await Promise.all([
      load('meta.md'), load('items.md'), load('tagging.md'),
      load('axes.md'), load('tags.md')
    ]);

    this.config = this.parseMeta(metaMd);
    this.items = this.parseItems(itemsMd);
    this.tagging = this.parseTagging(taggingMd);
    this.axes = this.parseAxes(axesMd);
    this.allTags = this.parseTags(tagsMd);

    // Load user-added items from shared storage
    try {
      const stored = await window.storage.get('te-user-items-' + this.config.domain, true);
      if (stored && stored.value) this.userAddedItems = JSON.parse(stored.value);
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════
  // INIT UI
  // ══════════════════════════════════════════════════

  init() {
    // Apply the section theme BEFORE building so every first paint (incl. radar
    // canvases) is already in the correct accent. Smoothness comes from the
    // backdrop fade-in + per-screen entrance animation, not a colour morph.
    this._applyTheme();
    this._buildPickerScreen();   // the picker IS the section home now
    this._buildResultScreens();
    this._buildAddScreen();
    this._showScreen('te-picker');
    if (window.TasteBackdrop) {
      const d = this.config.domain || '';
      const seed = [...d].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
      window.TasteBackdrop.start({ seed });
    }
    // Any "Save my result" button (profile / visual / summary) → export PNG.
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-export]') && window.TasteExport) window.TasteExport.download(this);
    });
  }

  _showScreen(id) {
    document.querySelectorAll('.te-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
    if (id === 'te-summary') this._buildSummary();
  }

  // ══════════════════════════════════════════════════
  // HOME SCREEN
  // ══════════════════════════════════════════════════

  _buildHomeScreen() {
    const c = this.config;
    document.getElementById('te-home').innerHTML = `
      <p class="te-eyebrow">${c.domain.charAt(0).toUpperCase() + c.domain.slice(1)} Taste</p>
      <h1 class="te-display">${this._formatHeadline(c.headline)}</h1>
      <p class="te-subtitle">${c.subheading}</p>

      <div class="te-home-grid">
        <div class="te-card featured" data-mode="profile">
          <div class="te-card-top"><div class="te-card-icon">🎭</div><span class="te-card-name">Your Taste Profile</span></div>
          <p class="te-card-desc">A portrait of your taste in words: what you love and why.</p>
        </div>
        <div class="te-card" data-mode="visual">
          <div class="te-card-top"><div class="te-card-icon">🕸️</div><span class="te-card-name">Visualise Your Taste</span></div>
          <p class="te-card-desc">See your preferences mapped across all dimensions.</p>
        </div>
        <div class="te-card" data-mode="recommend">
          <div class="te-card-top"><div class="te-card-icon">✦</div><span class="te-card-name">Recommend Me Someone</span></div>
          <p class="te-card-desc">Discover ${c.itemLabelPlural} you've probably never heard of but will love.</p>
        </div>
        <div class="te-card" data-screen="te-add">
          <div class="te-card-top"><div class="te-card-icon">＋</div><span class="te-card-name">Add a ${this._cap(c.itemLabel)}</span></div>
          <p class="te-card-desc">Someone missing? Add them and Claude will tag their style.</p>
        </div>
      </div>
    `;

    document.querySelectorAll('#te-home .te-card[data-mode]').forEach(card => {
      card.addEventListener('click', () => this._startMode(card.dataset.mode));
    });
    document.querySelector('#te-home .te-card[data-screen]').addEventListener('click', () => {
      this._showScreen('te-add');
    });
  }

  _formatHeadline(h) {
    // Italicise last word
    const words = h.split(' ');
    const last = words.pop();
    return words.join(' ') + ' <em>' + last + '</em>';
  }

  _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ══════════════════════════════════════════════════
  // PICKER SCREEN
  // ══════════════════════════════════════════════════

  _buildPickerScreen() {
    const c = this.config;
    const screen = document.getElementById('te-picker');
    screen.innerHTML = `
      <p class="te-eyebrow">${this._cap(c.domain)} Taste</p>
      <h1 class="te-display te-picker-head" id="te-picker-title">${this._formatHeadline(c.headline)}</h1>
      <p class="te-subtitle">${c.subheading}</p>
      <p class="te-picker-hint">Pick at least ${c.minPicks} you love · <span id="te-sel-count">0 selected</span></p>

      <div class="te-search-block">
        <div class="te-search-wrap">
          <span class="te-search-icon">🔍</span>
          <input class="te-search" id="te-search" type="text" placeholder="Search or add a${/^[aeiou]/i.test(c.itemLabel) ? 'n' : ''} ${c.itemLabel}…">
        </div>
        <div class="te-picker-tools">
          <button class="te-filters-toggle" id="te-filters-toggle">⚙ Filters</button>
        </div>
        <div class="te-filters te-hidden" id="te-filters"></div>
      </div>

      <div class="te-item-list" id="te-item-list"></div>
      <div id="te-add-inline" class="te-hidden"></div>

      <div class="te-footer">
        <div class="te-progress"><div class="te-progress-fill" id="te-progress" style="width:0%"></div></div>
        <button class="te-cta" id="te-cta" disabled>
          <span id="te-cta-label">Reveal my taste</span>
          <span class="te-cta-badge te-hidden" id="te-cta-badge">0</span>
        </button>
        <p class="te-footer-note" id="te-footer-note">Pick ${c.minPicks} ${c.itemLabelPlural} to continue</p>
      </div>
    `;

    document.getElementById('te-search').addEventListener('input', () => this._filterList());
    document.getElementById('te-filters-toggle').addEventListener('click', () => {
      const el = document.getElementById('te-filters');
      el.classList.toggle('te-hidden');
      document.getElementById('te-filters-toggle').textContent = el.classList.contains('te-hidden') ? '⚙ Filters' : '⚙ Hide filters';
    });
    document.getElementById('te-cta').addEventListener('click', () => this._runCombined());

    this._buildFilters();
    this._renderItemList();
  }

  // One flow: picks → the combined result (profile + radar + recs).
  _runCombined() {
    this._cachedProfile = null; this._cachedRecs = null; this._lastProfile = null;
    this._showScreen('te-summary'); // _showScreen triggers _buildSummary
  }

  _buildFilters() {
    const container = document.getElementById('te-filters');
    container.innerHTML = '';
    this.config.filters.forEach(f => {
      this.activeFilters[f.field] = new Set();
      const group = document.createElement('div');
      group.className = 'te-filter-group';
      group.innerHTML = `<p class="te-filter-label">${f.label}</p><div class="te-filter-options" id="te-filter-${f.field}"></div>`;
      container.appendChild(group);
      const optContainer = group.querySelector('.te-filter-options');
      f.options.forEach(opt => {
        const chip = document.createElement('button');
        chip.className = 'te-filter-chip';
        chip.textContent = opt.label;
        chip.addEventListener('click', () => {
          const active = this.activeFilters[f.field];
          if (active.has(opt.value)) { active.delete(opt.value); chip.classList.remove('on'); }
          else { active.add(opt.value); chip.classList.add('on'); }
          this._filterList();
        });
        optContainer.appendChild(chip);
      });
    });
  }

  _allItems() {
    return [...this.items, ...this.userAddedItems];
  }

  _renderItemList() {
    const container = document.getElementById('te-item-list');
    if (!container) return;
    container.innerHTML = '';
    const sorted = [...this._allItems()].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(item => {
      const el = document.createElement('div');
      el.className = 'te-item' + (this.selected.has(item.name) ? ' on' : '');
      el.dataset.name = item.name;
      el.dataset.country = Array.isArray(item.country) ? item.country.join(',') : (item.country || '');
      el.dataset.format = Array.isArray(item.format) ? item.format.join(',') : (item.format || '');
      el.dataset.era = item.era || '';
      const formatStr = el.dataset.format.split(',').map(f => this._cap(f)).join(' · ');
      el.innerHTML = `
        ${this._avatarHTML(item.name, 'te-avatar-sm')}
        <div class="te-item-text">
          <div class="te-item-name">${item.name}</div>
          ${formatStr ? `<div class="te-item-meta">${formatStr}</div>` : ''}
        </div>
        <div class="te-item-check">✓</div>
      `;
      el.addEventListener('click', () => this._toggleItem(item.name, el));
      container.appendChild(el);
    });
    this._hydrateAvatars(container);
  }

  // ══════════════════════════════════════════════════
  // MEDIA (domain-appropriate imagery) + AVATARS
  //   people  → Wikipedia pageimages (validated)
  //   tv      → TMDB poster   (via /api/image proxy)
  //   podcasts→ iTunes artwork (via /api/image proxy)
  // ══════════════════════════════════════════════════

  _initials(name) {
    return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // What kind of image this domain shows, and where it comes from.
  _mediaConfig() {
    const d = this.config.domain;
    if (d === 'tv') return { kind: 'poster', proxy: 'source=tmdb&type=tv' };
    if (d === 'podcasts') return { kind: 'poster', proxy: 'source=itunes&entity=podcast' };
    return { kind: 'person', proxy: null }; // comedy / music / film / books → Wikipedia people
  }

  _avatarHTML(name, cls) {
    const shape = this._mediaConfig().kind === 'poster' ? ' te-avatar--poster' : '';
    return `<div class="te-avatar ${cls || ''}${shape}" data-avatar="${encodeURIComponent(name)}"><span>${this._initials(name)}</span></div>`;
  }

  // Strip diacritics + non-alphanumerics for loose name/title comparison.
  _normName(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Does the article title plausibly name this person? Word-boundary match, so
  // "Anna Garcia" doesn't latch onto "JoAnna Garcia Swisher" via a substring.
  _nameInTitle(name, title) {
    const strip = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const titleWords = strip(title).split(/[^a-z0-9]+/).filter(Boolean);
    const tokens = strip(name).split(/[^a-z0-9]+/).filter(t => t.length >= 2);
    return tokens.length > 0 && tokens.every(tok => titleWords.some(w => w === tok || w.startsWith(tok)));
  }

  async _wikiSearchPhoto(name, suffix) {
    const q = encodeURIComponent(`${name} ${suffix}`.trim());
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}` +
                `&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=240&format=json&origin=*`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const pages = (data.query && data.query.pages ? Object.values(data.query.pages) : [])
        .sort((a, b) => (a.index || 0) - (b.index || 0));
      // First hit that has a photo AND whose title matches the name — skips the
      // popular near-miss (e.g. "Amy Poehler" → "Greg Poehler") and thumbnail-less
      // results (e.g. "Aziz Ansari" → his comedy special instead of his bio).
      for (const p of pages) {
        if (p.thumbnail && this._nameInTitle(name, p.title)) return p.thumbnail.source;
      }
    } catch (e) {}
    return null;
  }

  async _wikiPhoto(name) {
    // Suffix-disambiguated search first (rescues common names), then a bare
    // search (rescues people the suffix mis-ranks), then the REST summary page.
    let src = await this._wikiSearchPhoto(name, this.config.itemLabel || '');
    if (!src) src = await this._wikiSearchPhoto(name, '');
    if (src) return src;
    try {
      const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name.replace(/ /g, '_')));
      if (res.ok) {
        const d = await res.json();
        if (d.thumbnail && d.thumbnail.source && this._nameInTitle(name, d.title || name)) return d.thumbnail.source;
      }
    } catch (e) {}
    return null;
  }

  // Keyless fallback: Wikidata P18 portrait (Special:FilePath redirects to the
  // Commons file). Catches people whose Wikipedia article carries no page image.
  async _wikidataPhoto(name) {
    try {
      const s = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json&origin=*`);
      const sd = await s.json();
      for (const hit of (sd.search || [])) {
        if (!this._nameInTitle(name, hit.label || '')) continue;
        const e = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${hit.id}&property=P18&format=json&origin=*`);
        const ed = await e.json();
        const claim = ed.claims && ed.claims.P18 && ed.claims.P18[0];
        const file = claim && claim.mainsnak && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value;
        if (file) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=240`;
      }
    } catch (e) {}
    return null;
  }

  async _getMedia(name) {
    this._mediaCache = this._mediaCache || {};
    if (name in this._mediaCache) return this._mediaCache[name];
    const lsKey = 'te-media:v2:' + this.config.domain + ':' + name;
    try {
      const cached = localStorage.getItem(lsKey);
      if (cached !== null) { this._mediaCache[name] = cached || null; return this._mediaCache[name]; }
    } catch (e) {}

    const mc = this._mediaConfig();
    let src = null;
    if (mc.proxy) {
      try {
        const res = await fetch(`/api/image?${mc.proxy}&q=${encodeURIComponent(name)}`);
        const data = await res.json();
        src = data.url || null;
      } catch (e) {}
    } else {
      src = await this._wikiPhoto(name);
      if (!src) src = await this._wikidataPhoto(name);
      // Last resort for people Wikipedia/Wikidata has no usable portrait of: TMDB's
      // person database (server-proxied, name-validated, needs TMDB_API_KEY). Catches
      // comedians who appear in film/TV but lack a photo-bearing free-source article.
      if (!src) {
        try {
          const res = await fetch(`/api/image?source=tmdb&type=person&q=${encodeURIComponent(name)}`);
          const data = await res.json();
          src = data.url || null;
        } catch (e) {}
      }
    }

    this._mediaCache[name] = src;
    try { localStorage.setItem(lsKey, src || ''); } catch (e) {}
    return src;
  }

  _hydrateAvatars(root) {
    const els = (root || document).querySelectorAll('.te-avatar[data-avatar]:not([data-loaded])');
    if (!('IntersectionObserver' in window)) { els.forEach(el => this._loadAvatar(el)); return; }
    if (!this._avatarObserver) {
      this._avatarObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => { if (e.isIntersecting) { this._loadAvatar(e.target); obs.unobserve(e.target); } });
      }, { rootMargin: '300px' });
    }
    els.forEach(el => this._avatarObserver.observe(el));
  }

  async _loadAvatar(el) {
    el.setAttribute('data-loaded', '1');
    const name = decodeURIComponent(el.getAttribute('data-avatar'));
    const src = await this._getMedia(name);
    if (!src) return;
    const img = new Image();
    img.onload = () => { el.style.backgroundImage = `url("${src}")`; el.classList.add('has-img'); };
    img.src = src;
  }

  _toggleItem(name, el) {
    if (this.selected.has(name)) { this.selected.delete(name); el.classList.remove('on'); }
    else { this.selected.add(name); el.classList.add('on'); }
    this._updateFooter();
  }

  _filterList() {
    const q = document.getElementById('te-search').value.toLowerCase().trim();
    const items = document.querySelectorAll('#te-item-list .te-item');
    let visibleCount = 0;

    items.forEach(el => {
      const name = el.dataset.name.toLowerCase();
      const matchesSearch = !q || name.includes(q);

      // Check active filters
      let matchesFilters = true;
      this.config.filters.forEach(f => {
        const active = this.activeFilters[f.field];
        if (active.size === 0) return;
        const itemVal = el.dataset[f.field] || '';
        const itemVals = itemVal.split(',');
        if (![...active].some(v => itemVals.includes(v))) matchesFilters = false;
      });

      const visible = matchesSearch && matchesFilters;
      el.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Show "add" inline prompt if search has text and no exact match
    const addInline = document.getElementById('te-add-inline');
    const exactMatch = this._allItems().some(i => i.name.toLowerCase() === q);
    if (q && !exactMatch && visibleCount === 0) {
      addInline.classList.remove('te-hidden');
      addInline.innerHTML = `
        <div class="te-add-inline">
          <p class="te-add-inline-label">Can't find <span>"${q}"</span>? Add them to the database.</p>
          <button class="te-add-btn" id="te-add-inline-btn">Analyse "${q}" with Claude →</button>
        </div>
      `;
      document.getElementById('te-add-inline-btn').addEventListener('click', () => {
        this._addItemInline(q);
      });
    } else if (q && !exactMatch && visibleCount > 0) {
      addInline.classList.remove('te-hidden');
      addInline.innerHTML = `
        <div class="te-add-inline" style="margin-top:8px">
          <p class="te-add-inline-label">Don't see <span>"${q}"</span> exactly?</p>
          <button class="te-add-btn" id="te-add-inline-btn">Add "${q}" with Claude →</button>
        </div>
      `;
      document.getElementById('te-add-inline-btn').addEventListener('click', () => {
        this._addItemInline(q);
      });
    } else {
      addInline.classList.add('te-hidden');
    }
  }

  _updateFooter() {
    const n = this.selected.size;
    const min = parseInt(this.config.minPicks);
    document.getElementById('te-sel-count').textContent = `${n} selected`;
    const pct = Math.min((n / min) * 100, 100);
    document.getElementById('te-progress').style.width = pct + '%';
    const btn = document.getElementById('te-cta');
    const badge = document.getElementById('te-cta-badge');
    btn.disabled = n < min;
    if (n >= min) {
      badge.textContent = n;
      badge.classList.remove('te-hidden');
      document.getElementById('te-footer-note').textContent = `${n} ${this.config.itemLabelPlural} selected`;
    } else {
      badge.classList.add('te-hidden');
      document.getElementById('te-footer-note').textContent = `Pick ${min - n} more to continue`;
    }
  }

  _startMode(mode) {
    this.currentMode = mode;
    const labels = { profile: 'Build my profile', visual: 'Visualise my taste', recommend: 'Find my matches' };
    document.getElementById('te-cta-label').textContent = labels[mode];
    document.getElementById('te-picker-title').textContent = `Who do you love?`;
    this._renderItemList();
    this._updateFooter();
    this._showScreen('te-picker');
  }

  // ══════════════════════════════════════════════════
  // RESULT SCREENS SCAFFOLDING
  // ══════════════════════════════════════════════════

  _buildResultScreens() {
    // Profile
    document.getElementById('te-profile').innerHTML = `
      <button class="te-back" id="te-profile-back">← Change my picks</button>
      <p class="te-eyebrow">Your Taste Profile</p>
      <div class="te-loading" id="te-profile-loading"><div class="te-spinner"></div> Analysing your taste…</div>
      <div class="te-hidden" id="te-profile-result">
        <h2 class="te-display" style="font-size:30px;font-style:italic" id="te-profile-title"></h2>
        <div class="te-result-body" id="te-profile-body"></div>
        <div class="te-tag-cloud" id="te-profile-tags"></div>
        <div class="te-divider"></div>
        <p class="te-eyebrow">Based on</p>
        <div class="te-picks-row" id="te-profile-picks"></div>
        <button class="te-export-btn" data-export>↓ Save my result</button>
        <div class="te-nudge" id="te-profile-nudge">
          <span class="te-nudge-arrow">→</span>
          <p class="te-nudge-label">See everything</p>
          <p class="te-nudge-title">📋 Full summary</p>
          <p class="te-nudge-sub">Profile + radar + recommendations on one page</p>
        </div>
      </div>
    `;
    document.getElementById('te-profile-back').addEventListener('click', () => this._showScreen('te-picker'));
    document.getElementById('te-profile-nudge').addEventListener('click', () => this._showScreen('te-summary'));

    // Visual
    document.getElementById('te-visual').innerHTML = `
      <button class="te-back" id="te-visual-back">← Change my picks</button>
      <p class="te-eyebrow">Your Taste Map</p>
      <h2 class="te-display" style="font-size:28px;margin-bottom:20px">What your picks say, visually.</h2>
      <div class="te-loading" id="te-visual-loading"><div class="te-spinner"></div> Building your taste map…</div>
      <div class="te-hidden" id="te-visual-result">
        <div class="te-radar-wrap"><canvas id="te-radar" width="320" height="300"></canvas></div>
        <div class="te-tag-cloud" id="te-visual-tags" style="justify-content:center"></div>
        <button class="te-export-btn" data-export>↓ Save my result</button>
        <div class="te-nudge" id="te-visual-nudge">
          <span class="te-nudge-arrow">→</span>
          <p class="te-nudge-label">See everything</p>
          <p class="te-nudge-title">📋 Full summary</p>
          <p class="te-nudge-sub">Profile + radar + recommendations on one page</p>
        </div>
      </div>
    `;
    document.getElementById('te-visual-back').addEventListener('click', () => this._showScreen('te-picker'));
    document.getElementById('te-visual-nudge').addEventListener('click', () => this._showScreen('te-summary'));

    // Recommend
    document.getElementById('te-recommend').innerHTML = `
      <button class="te-back" id="te-rec-back">← Change my picks</button>
      <p class="te-eyebrow">You Might Like</p>
      <h2 class="te-display" style="font-size:28px;margin-bottom:6px">Picked for you.</h2>
      <p class="te-subtitle" id="te-rec-sub"></p>
      <div class="te-loading" id="te-rec-loading"><div class="te-spinner"></div> Finding your matches…</div>
      <div class="te-hidden" id="te-rec-result">
        <div id="te-rec-cards"></div>
        <div id="te-recalc-bar" class="te-recalc-bar te-hidden">
          <p class="te-recalc-label"><span id="te-recalc-count">0</span> added to your picks</p>
          <button class="te-recalc-btn" onclick="engine._runRecommend()">Recalculate →</button>
        </div>
        <div class="te-nudge" id="te-rec-nudge">
          <span class="te-nudge-arrow">→</span>
          <p class="te-nudge-label">See everything</p>
          <p class="te-nudge-title">📋 Full summary</p>
          <p class="te-nudge-sub">Profile + radar + recommendations on one page</p>
        </div>
      </div>
    `;
    document.getElementById('te-rec-back').addEventListener('click', () => this._showScreen('te-picker'));
    document.getElementById('te-rec-nudge').addEventListener('click', () => this._showScreen('te-summary'));
  }

  _buildAddScreen() {
    document.getElementById('te-add').innerHTML = `
      <button class="te-back" id="te-add-back">← Back</button>
      <p class="te-eyebrow">Add a ${this._cap(this.config.itemLabel)}</p>
      <h2 class="te-display" style="font-size:28px;margin-bottom:8px">Someone missing?</h2>
      <p class="te-subtitle">Type their name and Claude will analyse their style and add them to the database.</p>
      <input class="te-add-input" id="te-add-name" type="text" placeholder="${this.config.addItemPlaceholder}">
      <button class="te-outline-btn" id="te-add-submit" disabled>Analyse their style →</button>
      <div class="te-loading te-hidden" id="te-add-loading"><div class="te-spinner"></div> Analysing…</div>
      <div class="te-hidden" id="te-add-result">
        <div class="te-divider"></div>
        <p class="te-eyebrow" style="margin-bottom:8px">Analysis complete</p>
        <div id="te-add-result-head" style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <p style="font-weight:600;font-size:16px;color:var(--text)" id="te-add-result-name"></p>
        </div>
        <div class="te-tag-cloud" id="te-add-result-tags"></div>
        <p class="te-result-body" id="te-add-result-bio" style="margin-bottom:20px"></p>
        <button class="te-cta" id="te-add-confirm">Add to database</button>
        <p class="te-footer-note" style="margin-top:10px">They'll appear in the picker for everyone</p>
      </div>
    `;
    document.getElementById('te-add-back').addEventListener('click', () => this._showScreen('te-home'));
    const nameInput = document.getElementById('te-add-name');
    const submitBtn = document.getElementById('te-add-submit');
    nameInput.addEventListener('input', () => { submitBtn.disabled = !nameInput.value.trim(); });
    submitBtn.addEventListener('click', () => this._analyseNewItem(nameInput.value.trim(), false));
    document.getElementById('te-add-confirm').addEventListener('click', () => this._confirmAddItem());
  }

  // ══════════════════════════════════════════════════
  // MODES
  // ══════════════════════════════════════════════════

  async _runMode() {
    if (this.currentMode === 'profile') await this._runProfile();
    else if (this.currentMode === 'visual') await this._runVisual();
    else if (this.currentMode === 'recommend') await this._runRecommend();
  }

  _goNext(from) {
    const flow = { profile: 'visual', visual: 'recommend', recommend: 'profile' };
    this.currentMode = flow[from];
    this._runMode();
  }

  // ── TAG SCORING ──
  _getTagScores() {
    const scores = {};
    const picks = this._allItems().filter(c => this.selected.has(c.name));
    picks.forEach(c => {
      const tags = this.tagging[c.name] || [];
      tags.forEach(t => { scores[t] = (scores[t] || 0) + 1; });
    });
    const max = Math.max(...Object.values(scores), 1);
    const norm = {};
    Object.entries(scores).forEach(([t, v]) => norm[t] = v / max);
    return { raw: scores, norm, picks };
  }

  _topTags(scores, n) {
    return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
  }

  // ── PROFILE ──
  async _runProfile() {
    this._showScreen('te-profile');
    document.getElementById('te-profile-loading').classList.remove('te-hidden');
    document.getElementById('te-profile-result').classList.add('te-hidden');

    const { raw, picks } = this._getTagScores();
    const top = this._topTags(raw, 8);
    const names = picks.map(c => c.name).join(', ');

    const prompt = this.config.profileUserPrompt
      .replace('{names}', names)
      .replace('{topTags}', top.join(', '));

    try {
      const text = await this._callClaude(prompt, this.config.profileSystemPrompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      this._lastProfile = data;

      document.getElementById('te-profile-title').textContent = data.title;
      document.getElementById('te-profile-body').innerHTML = data.body.replace(/\n/g, '<br><br>');

      const tagCloud = document.getElementById('te-profile-tags');
      tagCloud.innerHTML = '';
      data.topTags.forEach((t, i) => {
        const span = document.createElement('span');
        span.className = 'te-tag ' + (i < 2 ? 'te-tag-lg' : i < 4 ? 'te-tag-md' : 'te-tag-sm');
        span.textContent = t;
        tagCloud.appendChild(span);
      });

      const picksEl = document.getElementById('te-profile-picks');
      picksEl.innerHTML = '';
      picks.slice(0, 5).forEach(c => {
        const pill = document.createElement('div');
        pill.className = 'te-pick-pill';
        pill.textContent = c.name;
        picksEl.appendChild(pill);
      });
      if (picks.length > 5) {
        const more = document.createElement('span');
        more.style.cssText = 'font-size:12px;color:var(--text-dim);align-self:center;margin-left:4px';
        more.textContent = `+${picks.length - 5} more`;
        picksEl.appendChild(more);
      }

      document.getElementById('te-profile-loading').classList.add('te-hidden');
      document.getElementById('te-profile-result').classList.remove('te-hidden');
    } catch(e) {
      document.getElementById('te-profile-loading').innerHTML = `<p style="color:var(--text-muted)">${this._errMsg(e)}</p>`;
    }
  }

  // ── VISUAL ──
  async _runVisual() {
    this._showScreen('te-visual');
    document.getElementById('te-visual-loading').classList.remove('te-hidden');
    document.getElementById('te-visual-result').classList.add('te-hidden');

    const { norm, raw } = this._getTagScores();
    const scores = this.axes.map(ax => {
      const vals = ax.tags.map(t => norm[t] || 0);
      return vals.reduce((a, b) => a + b, 0) / ax.tags.length;
    });

    await new Promise(r => setTimeout(r, 500));

    this._drawRadar('te-radar', this.axes.map(a => a.label), scores);

    const sorted = this.axes.map((a, i) => ({ label: a.label, score: scores[i] }))
      .sort((a, b) => b.score - a.score);
    const tagEl = document.getElementById('te-visual-tags');
    tagEl.innerHTML = '';
    sorted.forEach((s, i) => {
      if (s.score < 0.05) return;
      const span = document.createElement('span');
      span.className = 'te-tag ' + (i === 0 ? 'te-tag-lg' : i < 3 ? 'te-tag-md' : 'te-tag-sm');
      span.textContent = s.label + (i < 2 ? ' ↑↑' : i < 4 ? ' ↑' : '');
      tagEl.appendChild(span);
    });

    document.getElementById('te-visual-loading').classList.add('te-hidden');
    document.getElementById('te-visual-result').classList.remove('te-hidden');
  }

  // Reads the active theme from CSS custom properties so the radars
  // recolour automatically with the rest of the UI.
  _palette() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    const accent = g('--accent') || '#E0698A';
    const accent2 = g('--accent2') || '#5AA9B8';
    const grid = g('--border') || '#4A2331';
    const muted = g('--text-muted') || '#B08A95';
    const text = g('--text') || '#F4EEF3';
    return {
      accent, accent2, grid, muted, text,
      accentFill: this._hexToRgba(accent, 0.18),
      accentFillStrong: this._hexToRgba(accent, 0.25),
      accent2Fill: this._hexToRgba(accent2, 0.25)
    };
  }

  _hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Per-domain theme: derive a cohesive dark palette from a single hue in meta.md
  // (themeHue), plus an explicit accent / accent2. Falls back to the CSS :root
  // defaults (the neutral landing-page palette) when meta.md defines no theme.
  _applyTheme() {
    const c = this.config;
    if (!c) return;
    const s = document.documentElement.style;
    const set = (k, v) => s.setProperty(k, v);
    if (c.themeHue !== undefined) {
      const h = parseFloat(c.themeHue);
      set('--bg', `hsl(${h}, 34%, 8%)`);
      set('--surface', `hsl(${h}, 28%, 11%)`);
      set('--surface2', `hsl(${h}, 26%, 15%)`);
      set('--border', `hsl(${h}, 22%, 32%)`);
      set('--text', `hsl(${h}, 20%, 93%)`);
      set('--text-muted', `hsl(${h}, 14%, 66%)`);
      set('--text-dim', `hsl(${h}, 13%, 44%)`);
      set('--footer-bg', `hsla(${h}, 36%, 7%, 0.86)`);
      set('--on-accent', `hsl(${h}, 40%, 9%)`);  // near-black ink for text on bright fills
    }
    if (c.accent) {
      set('--accent', c.accent);
      set('--accent-dim', this._hexToRgba(c.accent, 0.16));
      set('--accent-soft', this._hexToRgba(c.accent, 0.42));
    }
    if (c.accent2) {
      const h = parseFloat(c.themeHue || 0);
      set('--accent2', c.accent2);
      set('--accent2-dim', this._hexToRgba(c.accent2, 0.16));
      set('--accent2-soft', this._hexToRgba(c.accent2, 0.42));
      set('--on-accent2', `hsl(${h}, 40%, 9%)`);
    }
  }

  _errMsg(e) {
    const m = (e && e.message) || '';
    if (/ANTHROPIC_API_KEY|api[_ ]?key/i.test(m)) {
      return 'No Claude API key configured. Add ANTHROPIC_API_KEY to taste-engine/.env and restart the server.';
    }
    return 'Something went wrong. Please try again.';
  }

  // Make a canvas crisp on high-DPR screens: keep logical drawing coords but
  // back it with devicePixelRatio× pixels. `responsive` lets the main radar
  // scale to its container (height auto) while staying sharp.
  _prepCanvas(canvas, responsive) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas._lw || (canvas._lw = canvas.width);
    const H = canvas._lh || (canvas._lh = canvas.height);
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw) { canvas.width = bw; canvas.height = bh; }
    canvas.style.width = W + 'px';
    canvas.style.height = responsive ? 'auto' : H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  }

  _drawRadar(canvasId, labels, scores) {
    const canvas = document.getElementById(canvasId);
    const { ctx, W, H } = this._prepCanvas(canvas, true);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 76; // leave room for full axis labels (e.g. "Improvisational")
    const N = labels.length;
    const pal = this._palette();

    ctx.clearRect(0, 0, W, H);

    const angle = i => (i / N) * Math.PI * 2 - Math.PI / 2;
    const pt = (i, r) => ({ x: cx + Math.cos(angle(i)) * r, y: cy + Math.sin(angle(i)) * r });

    [0.25, 0.5, 0.75, 1].forEach(f => {
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const p = pt(i, R * f); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
      ctx.closePath(); ctx.strokeStyle = pal.grid; ctx.lineWidth = 1; ctx.stroke();
    });

    for (let i = 0; i < N; i++) {
      const p = pt(i, R);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.beginPath();
    scores.forEach((s, i) => { const p = pt(i, R * Math.max(s, 0.05)); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = pal.accentFill; ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();

    scores.forEach((s, i) => {
      const p = pt(i, R * Math.max(s, 0.05));
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = pal.accent; ctx.fill();
    });

    ctx.font = "700 15px 'Hanken Grotesk', sans-serif"; ctx.fillStyle = pal.text || pal.muted; ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const p = pt(i, R + 30);
      // keep left/right-edge labels inside the canvas
      const x = Math.max(54, Math.min(W - 54, p.x));
      ctx.fillText(label, x, p.y + 5);
    });
  }

  // ── RECOMMEND ──
  async _runRecommend() {
    this._showScreen('te-recommend');
    this._pendingAlreadyLike = 0;
    const bar = document.getElementById('te-recalc-bar');
    if (bar) bar.classList.add('te-hidden');
    document.getElementById('te-rec-loading').classList.remove('te-hidden');
    document.getElementById('te-rec-result').classList.add('te-hidden');

    const { raw, picks } = this._getTagScores();
    const top = this._topTags(raw, 8);
    const names = picks.map(c => c.name);
    document.getElementById('te-rec-sub').textContent = `Based on your ${names.length} picks.`;

    const notSelected = this._allItems().filter(c => !this.selected.has(c.name));
    const db = notSelected.map(c => `${c.name} (${(this.tagging[c.name] || []).join(', ')})`).join('\n');

    const prompt = this.config.recommendUserPrompt
      .replace('{names}', names.join(', '))
      .replace('{topTags}', top.join(', '))
      .replace('{database}', db);

    try {
      const text = await this._callClaude(prompt, this.config.recommendSystemPrompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());

      const container = document.getElementById('te-rec-cards');
      container.innerHTML = '';
      const { norm } = this._getTagScores();
      const myScores = this._getAxisScores(norm);

      data.recommendations.forEach((rec, idx) => {
        const card = document.createElement('div');
        card.className = 'te-rec-card';
        const safeId = 'rec-' + rec.name.replace(/[^a-z0-9]/gi, '-');
        const miniId = 'te-mini-' + idx;
        const comedian = this._allItems().find(c => c.name === rec.name);
        const hasRadar = !!comedian;
        card.innerHTML = `
          <div class="te-rec-header">
            <div class="te-rec-header-text">
              <div class="te-rec-top">
                <div class="te-rec-name-wrap">${this._avatarHTML(rec.name, 'te-avatar-md')}<p class="te-rec-name">${rec.name}</p></div>
                <span class="te-match-pill">${rec.match}% match</span>
              </div>
              <p class="te-rec-reason">${rec.reason}</p>
              <div class="te-rec-tags">${(rec.tags || []).map(t => `<span class="te-rec-tag">${t}</span>`).join('')}</div>
            </div>
            ${hasRadar ? `<div class="te-mini-radar-wrap"><canvas id="${miniId}" width="280" height="280"></canvas></div>` : ''}
          </div>
          <div class="te-rec-footer">
            <button class="te-already-btn" id="${safeId}">I already like them</button>
          </div>
        `;
        container.appendChild(card);
        if (hasRadar) {
          const recScores = this._getComedianAxisScores(comedian);
          this._drawMiniRadar(miniId, myScores, recScores);
        }
        document.getElementById(safeId).addEventListener('click', (e) => {
          this._alreadyLike(rec.name, safeId, e.target);
        });
      });

      this._hydrateAvatars(container);
      document.getElementById('te-rec-loading').classList.add('te-hidden');
      document.getElementById('te-rec-result').classList.remove('te-hidden');
    } catch(e) {
      document.getElementById('te-rec-loading').innerHTML = `<p style="color:var(--text-muted)">${this._errMsg(e)}</p>`;
    }
  }

  _alreadyLike(name, btnId, btn) {
    this.selected.add(name);
    this._pendingAlreadyLike = (this._pendingAlreadyLike || 0) + 1;
    btn.textContent = '✓ Added';
    btn.classList.add('added');
    btn.disabled = true;
    const bar = document.getElementById('te-recalc-bar');
    if (bar) {
      bar.classList.remove('te-hidden');
      document.getElementById('te-recalc-count').textContent = this._pendingAlreadyLike;
    }
  }

  // ══════════════════════════════════════════════════
  // ADD ITEM (from dedicated screen)
  // ══════════════════════════════════════════════════

  async _analyseNewItem(name, inline) {
    if (!name) return;
    this._pendingItem = null;

    const loadingEl = document.getElementById('te-add-loading');
    const resultEl = document.getElementById('te-add-result');
    const submitBtn = document.getElementById('te-add-submit');

    if (loadingEl) loadingEl.classList.remove('te-hidden');
    if (resultEl) resultEl.classList.add('te-hidden');
    if (submitBtn) submitBtn.disabled = true;

    const prompt = this.config.addItemUserPrompt
      .replace('{name}', name)
      .replace('{tags}', this.allTags.join(', '));

    try {
      const text = await this._callClaude(prompt, this.config.addItemSystemPrompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      this._pendingItem = { name, tags: data.tags, group: 'User Added' };

      if (loadingEl) loadingEl.classList.add('te-hidden');
      if (resultEl) {
        const head = document.getElementById('te-add-result-head');
        if (head && !head.querySelector('.te-avatar')) {
          head.insertAdjacentHTML('afterbegin', this._avatarHTML(name, 'te-avatar-md'));
          this._hydrateAvatars(head);
        }
        document.getElementById('te-add-result-name').textContent = name;
        document.getElementById('te-add-result-bio').textContent = data.bio;
        const tagEl = document.getElementById('te-add-result-tags');
        tagEl.innerHTML = '';
        data.tags.forEach((t, i) => {
          const span = document.createElement('span');
          span.className = 'te-tag ' + (i < 2 ? 'te-tag-lg' : i < 4 ? 'te-tag-md' : 'te-tag-sm');
          span.textContent = t;
          tagEl.appendChild(span);
        });
        resultEl.classList.remove('te-hidden');
      }
    } catch(e) {
      if (loadingEl) loadingEl.innerHTML = `<p style="color:var(--text-muted)">${this._errMsg(e)}</p>`;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async _addItemInline(name) {
    // Replace inline add block with loading state
    const container = document.getElementById('te-add-inline');
    container.innerHTML = `<div class="te-add-inline"><div class="te-loading" style="padding:16px"><div class="te-spinner"></div> Analysing ${name}…</div></div>`;

    const prompt = this.config.addItemUserPrompt
      .replace('{name}', name)
      .replace('{tags}', this.allTags.join(', '));

    try {
      const text = await this._callClaude(prompt, this.config.addItemSystemPrompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      const newItem = { name, tags: data.tags, group: 'User Added' };

      // Show result inline
      container.innerHTML = `
        <div class="te-add-inline">
          <p style="font-weight:600;font-size:14px;color:var(--text);margin-bottom:8px">${name}</p>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:10px">${data.bio}</p>
          <div class="te-tag-cloud" style="margin-bottom:12px">${data.tags.map((t,i) => `<span class="te-tag ${i<2?'te-tag-lg':i<4?'te-tag-md':'te-tag-sm'}">${t}</span>`).join('')}</div>
          <button class="te-add-btn" id="te-inline-confirm">Add ${name} and select them →</button>
        </div>
      `;

      document.getElementById('te-inline-confirm').addEventListener('click', async () => {
        // Save to user added
        this.userAddedItems.push(newItem);
        this.tagging[name] = data.tags;
        try { await window.storage.set('te-user-items-' + this.config.domain, JSON.stringify(this.userAddedItems), true); } catch(e) {}

        // Add to selected
        this.selected.add(name);
        this._renderItemList();
        this._updateFooter();
        container.classList.add('te-hidden');
        document.getElementById('te-search').value = '';
        this._filterList();
      });
    } catch(e) {
      container.innerHTML = `<div class="te-add-inline"><p style="color:var(--text-muted);font-size:13px">${this._errMsg(e)}</p></div>`;
    }
  }

  async _confirmAddItem() {
    if (!this._pendingItem) return;
    const item = this._pendingItem;
    this.userAddedItems.push(item);
    this.tagging[item.name] = item.tags;

    try { await window.storage.set('te-user-items-' + this.config.domain, JSON.stringify(this.userAddedItems), true); } catch(e) {}

    const btn = document.getElementById('te-add-confirm');
    btn.textContent = '✓ Added!';
    setTimeout(() => {
      btn.textContent = 'Add to database';
      document.getElementById('te-add-name').value = '';
      document.getElementById('te-add-result').classList.add('te-hidden');
      document.getElementById('te-add-submit').disabled = true;
      this._pendingItem = null;
      this._showScreen('te-home');
    }, 1200);
  }

  // ══════════════════════════════════════════════════
  // AXIS SCORES
  // ══════════════════════════════════════════════════

  _getAxisScores(norm) {
    return this.axes.map(ax => {
      const vals = ax.tags.map(t => norm[t] || 0);
      return vals.reduce((a, b) => a + b, 0) / ax.tags.length;
    });
  }

  _getComedianAxisScores(comedian) {
    const norm = {};
    (this.tagging[comedian.name] || comedian.tags || []).forEach(t => norm[t] = 1);
    return this._getAxisScores(norm);
  }

  // YouTube search link to "try the vibe" of a recommendation.
  _watchUrl(name) {
    const hint = { comedy: 'stand up', tv: 'trailer', film: 'trailer', podcasts: 'podcast' }[this.config.domain] || '';
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent((name + ' ' + hint).trim());
  }

  // ══════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════

  async _buildSummary() {
    const summaryLoading = document.getElementById('te-summary-loading');
    const summaryContent = document.getElementById('te-summary-content');
    if (!summaryLoading || !summaryContent) return;
    summaryLoading.classList.remove('te-hidden');
    summaryContent.classList.add('te-hidden');

    const { raw, norm, picks } = this._getTagScores();
    const myScores = this._getAxisScores(norm);
    const top = this._topTags(raw, 8);

    // Profile
    if (!this._cachedProfile) {
      const prompt = this.config.profileUserPrompt.replace('{names}', picks.map(c=>c.name).join(', ')).replace('{topTags}', top.join(', '));
      try {
        const text = await this._callClaude(prompt, this.config.profileSystemPrompt);
        this._cachedProfile = JSON.parse(text.replace(/```json|```/g,'').trim());
      } catch(e) { this._cachedProfile = { title:'Your Taste', body:'', topTags: top.slice(0,5) }; }
    }

    // Recs
    if (!this._cachedRecs) {
      const notSelected = this._allItems().filter(c => !this.selected.has(c.name));
      const db = notSelected.map(c => `${c.name} (${(this.tagging[c.name]||[]).join(', ')})`).join('\n');
      const prompt = this.config.recommendUserPrompt.replace('{names}',picks.map(c=>c.name).join(', ')).replace('{topTags}',top.join(', ')).replace('{database}',db);
      try {
        const text = await this._callClaude(prompt, this.config.recommendSystemPrompt);
        this._cachedRecs = JSON.parse(text.replace(/```json|```/g,'').trim()).recommendations;
      } catch(e) { this._cachedRecs = []; }
    }

    // Render profile
    document.getElementById('te-sum-title').textContent = this._cachedProfile.title;
    document.getElementById('te-sum-body').innerHTML = this._cachedProfile.body.replace(/\n/g,'<br><br>');
    const sumTags = document.getElementById('te-sum-tags');
    sumTags.innerHTML = '';
    this._cachedProfile.topTags.forEach((t,i) => {
      const span = document.createElement('span');
      span.className = 'te-tag '+(i<2?'te-tag-lg':i<4?'te-tag-md':'te-tag-sm');
      span.textContent = t; sumTags.appendChild(span);
    });

    // Render radar
    await new Promise(r => setTimeout(r, 100));
    this._drawRadar('te-sum-radar', this.axes.map(a=>a.label), myScores);

    // Render the spectrum key (each spoke = high pole ↔ its opposite)
    const legend = document.getElementById('te-sum-legend');
    if (legend) {
      legend.innerHTML = this.axes.map(a => `
        <div class="te-radar-pole">
          <span class="te-pole-hi">${a.label}</span>
          <span class="te-pole-sep">↔</span>
          <span class="te-pole-lo">${a.opposite || '—'}</span>
        </div>`).join('');
    }

    // Render recs
    const recContainer = document.getElementById('te-sum-recs');
    recContainer.innerHTML = '';
    if (!this._cachedRecs || !this._cachedRecs.length) {
      // Empty state: the recommend call returned nothing (or failed). Never leave
      // the section blank — say so and offer a retry.
      const empty = document.createElement('div');
      empty.className = 'te-rec-empty';
      empty.innerHTML = `
        <p class="te-rec-empty-title">No recommendations came through.</p>
        <p class="te-rec-empty-sub">That usually means the request timed out or hit a snag. Your profile and taste map above are still good.</p>
        <button class="te-rec-retry" type="button">Try again</button>`;
      empty.querySelector('.te-rec-retry').addEventListener('click', () => {
        this._cachedRecs = null;
        this._buildSummary();
      });
      recContainer.appendChild(empty);
    }
    (this._cachedRecs || []).forEach((rec, idx) => {
      const comedian = this._allItems().find(c => c.name === rec.name);
      const miniId = 'te-sum-mini-' + idx;
      const card = document.createElement('div');
      card.className = 'te-rec-card';
      card.innerHTML = `
        <div class="te-rec-header">
          <div class="te-rec-header-text">
            <div class="te-rec-top">
              <div class="te-rec-name-wrap">${this._avatarHTML(rec.name, 'te-avatar-md')}<p class="te-rec-name">${rec.name}</p></div>
              <span class="te-match-pill">${rec.match}% match</span>
            </div>
            <p class="te-rec-reason">${rec.reason}</p>
            <div class="te-rec-tags">${(rec.tags||[]).map(t=>`<span class="te-rec-tag">${t}</span>`).join('')}</div>
          </div>
          ${comedian ? `<div class="te-mini-radar-wrap"><canvas id="${miniId}" width="280" height="280"></canvas></div>` : ''}
        </div>
        <div class="te-rec-foot">
          <a class="te-rec-watch" href="${this._watchUrl(rec.name)}" target="_blank" rel="noopener">▶ Watch on YouTube</a>
        </div>
      `;
      recContainer.appendChild(card);
      if (comedian) this._drawMiniRadar(miniId, myScores, this._getComedianAxisScores(comedian));
    });
    this._hydrateAvatars(recContainer);

    // Picks
    const sumPicks = document.getElementById('te-sum-picks');
    sumPicks.innerHTML = '';
    picks.forEach(c => {
      const pill = document.createElement('div');
      pill.className = 'te-pick-pill'; pill.textContent = c.name; sumPicks.appendChild(pill);
    });

    if (!summaryContent.querySelector('[data-export]')) {
      const btn = document.createElement('button');
      btn.className = 'te-export-btn'; btn.setAttribute('data-export', ''); btn.textContent = '↓ Save my result';
      summaryContent.appendChild(btn);
    }

    summaryLoading.classList.add('te-hidden');
    summaryContent.classList.remove('te-hidden');
  }

  // ══════════════════════════════════════════════════
  // MINI RADAR
  // ══════════════════════════════════════════════════

  _drawMiniRadar(canvasId, myScores, recScores) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, W, H } = this._prepCanvas(canvas, true);
    const cx = W/2, cy = H/2;
    const LABEL_PAD = 36;
    const R = Math.min(W,H)/2 - LABEL_PAD;
    const N = myScores.length;
    const labels = this.axes.map(a => a.label);
    const pal = this._palette();

    ctx.clearRect(0,0,W,H);
    const angle = i => (i/N)*Math.PI*2 - Math.PI/2;
    const pt = (i,r) => ({ x: cx+Math.cos(angle(i))*r, y: cy+Math.sin(angle(i))*r });

    // Grid rings
    [0.25,0.5,0.75,1].forEach(f => {
      ctx.beginPath();
      for(let i=0;i<N;i++){const p=pt(i,R*f);i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}
      ctx.closePath(); ctx.strokeStyle=pal.grid; ctx.lineWidth=1; ctx.stroke();
    });

    // Spokes
    for(let i=0;i<N;i++){
      const p=pt(i,R);
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);
      ctx.strokeStyle=pal.grid;ctx.lineWidth=1;ctx.stroke();
    }

    // My scores (terracotta)
    ctx.beginPath();
    myScores.forEach((s,i)=>{const p=pt(i,R*Math.max(s,0.05));i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.closePath(); ctx.fillStyle=pal.accentFillStrong; ctx.fill();
    ctx.strokeStyle=pal.accent; ctx.lineWidth=2.5; ctx.stroke();
    myScores.forEach((s,i)=>{const p=pt(i,R*Math.max(s,0.05));ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle=pal.accent;ctx.fill();});

    // Rec scores (blue)
    ctx.beginPath();
    recScores.forEach((s,i)=>{const p=pt(i,R*Math.max(s,0.05));i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
    ctx.closePath(); ctx.fillStyle=pal.accent2Fill; ctx.fill();
    ctx.strokeStyle=pal.accent2; ctx.lineWidth=2.5; ctx.stroke();
    recScores.forEach((s,i)=>{const p=pt(i,R*Math.max(s,0.05));ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle=pal.accent2;ctx.fill();});

    // Labels — colour-coded by who scores higher
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const p = pt(i, R + 16);
      const diff = recScores[i] - myScores[i];
      ctx.fillStyle = diff > 0.3 ? pal.accent2 : diff < -0.3 ? pal.accent : pal.muted;
      ctx.fillText(label, p.x, p.y + 4);
    });

    // Legend
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.accent;
    ctx.fillRect(8, H-22, 10, 10);
    ctx.fillStyle = pal.muted;
    ctx.fillText('You', 22, H-13);
    ctx.fillStyle = pal.accent2;
    ctx.fillRect(50, H-22, 10, 10);
    ctx.fillStyle = pal.muted;
    ctx.fillText('Them', 64, H-13);
  }

  // ══════════════════════════════════════════════════
  // CLAUDE API
  // ══════════════════════════════════════════════════

  async _callClaude(userPrompt, systemPrompt) {
    // In the Claude chat sandbox, post directly (auth + CORS injected by the host).
    // When served by the local Node proxy, window.CLAUDE_PROXY_URL points at /api/claude,
    // which attaches the API key server-side. See engine/local-shim.js + server.js.
    const endpoint = window.CLAUDE_PROXY_URL || 'https://api.anthropic.com/v1/messages';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  }
}

// Export for use in instance index.html
window.TasteEngine = TasteEngine;
