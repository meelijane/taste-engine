import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Load the browser engine into a jsdom window and return the TasteEngine class.
function loadEngine(url = 'http://localhost/instances/comedy/') {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url });
  global.window = dom.window;
  global.document = dom.window.document;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  global.IntersectionObserver = class { observe() {} unobserve() {} };
  const code = fs.readFileSync(path.join(ROOT, 'engine/taste-engine.js'), 'utf8');
  (0, eval)(code); // sets dom.window.TasteEngine
  return { TasteEngine: dom.window.TasteEngine, dom };
}

const { TasteEngine } = loadEngine();
const mk = () => new TasteEngine();

test('parseItems: name + metadata, dedupes', () => {
  const e = mk();
  const items = e.parseItems('# Items\n- Bo Burnham | country:US | format:stand-up,musical | era:contemporary\n- Bo Burnham | country:US\n- Tim Key | country:GB | format:panel');
  assert.equal(items.length, 2, 'deduped by name');
  assert.equal(items[0].name, 'Bo Burnham');
  assert.equal(items[0].country, 'US');
  assert.deepEqual(items[0].format, ['stand-up', 'musical']);
});

test('parseTagging / parseAxes / parseTags', () => {
  const e = mk();
  assert.deepEqual(e.parseTagging('- Bo Burnham | meta, dark, musical')['Bo Burnham'], ['meta', 'dark', 'musical']);
  const axes = e.parseAxes('# Axes\n- Dark | dark, bleak, violent');
  assert.equal(axes[0].label, 'Dark');
  assert.deepEqual(axes[0].tags, ['dark', 'bleak', 'violent']);
  assert.deepEqual(e.parseTags('# Tags\nmeta, dark,  musical'), ['meta', 'dark', 'musical']);
});

test('parseMeta: scalars, theme fields and filters', () => {
  const e = mk();
  const cfg = e.parseMeta([
    'domain: comedy', 'itemLabel: comedian', 'minPicks: 5',
    'themeHue: 25', 'accent: #FF8A33', 'accent2: #36D6C3',
    'filters:', '  - label: Country', '    field: country',
    '      - label: 🇬🇧 British | value: GB'
  ].join('\n'));
  assert.equal(cfg.domain, 'comedy');
  assert.equal(cfg.themeHue, '25');
  assert.equal(cfg.accent, '#FF8A33');
  assert.equal(cfg.accent2, '#36D6C3');
  assert.equal(cfg.filters.length, 1);
  assert.equal(cfg.filters[0].field, 'country');
  assert.deepEqual(cfg.filters[0].options[0], { label: '🇬🇧 British', value: 'GB' });
});

test('_applyTheme sets primary AND contrast tokens', () => {
  const e = mk();
  e.config = { themeHue: '25', accent: '#FF8A33', accent2: '#36D6C3' };
  e._applyTheme();
  const s = document.documentElement.style;
  assert.equal(s.getPropertyValue('--accent').trim(), '#FF8A33');
  assert.equal(s.getPropertyValue('--accent2').trim(), '#36D6C3');
  assert.ok(s.getPropertyValue('--on-accent').includes('hsl'), 'ink for primary');
  assert.ok(s.getPropertyValue('--on-accent2').includes('hsl'), 'ink for contrast');
  assert.ok(s.getPropertyValue('--accent2-dim').includes('rgba'), 'contrast dim derived');
  assert.ok(s.getPropertyValue('--bg').includes('hsl'), 'bg derived from hue');
});

test('_mediaConfig picks the right image source per domain', () => {
  const e = mk();
  e.config = { domain: 'tv' };
  assert.equal(e._mediaConfig().kind, 'poster');
  assert.match(e._mediaConfig().proxy, /tmdb/);
  e.config = { domain: 'podcasts' };
  assert.match(e._mediaConfig().proxy, /itunes/);
  for (const d of ['comedy', 'music', 'film', 'books']) {
    e.config = { domain: d };
    assert.equal(e._mediaConfig().kind, 'person');
    assert.equal(e._mediaConfig().proxy, null);
  }
});

test('_avatarHTML uses poster shape only for poster domains', () => {
  const e = mk();
  e.config = { domain: 'comedy' };
  assert.ok(!e._avatarHTML('Bo Burnham', 'te-avatar-sm').includes('te-avatar--poster'));
  e.config = { domain: 'podcasts' };
  assert.ok(e._avatarHTML('Serial', 'te-avatar-sm').includes('te-avatar--poster'));
});

test('helpers: _hexToRgba, _normName, _initials', () => {
  const e = mk();
  assert.equal(e._hexToRgba('#FF8A33', 0.5), 'rgba(255,138,51,0.5)');
  assert.equal(e._normName("Grant O'Brien"), 'grantobrien');
  assert.equal(e._normName('Gabriel García Márquez'), 'gabrielgarciamarquez'); // diacritics stripped
  assert.equal(e._initials('Bo Burnham'), 'BB');
});

test('tag scoring + top tags from picks', () => {
  const e = mk();
  e.items = [{ name: 'A' }, { name: 'B' }];
  e.tagging = { A: ['dark', 'meta'], B: ['dark', 'silly'] };
  e.selected = new Set(['A', 'B']);
  const { raw } = e._getTagScores();
  assert.equal(raw.dark, 2);
  assert.equal(e._topTags(raw, 1)[0], 'dark');
});

// Integration: every shipped instance's real data files parse and cross-reference.
test('all instance data files are valid and consistent', () => {
  const e = mk();
  const dir = path.join(ROOT, 'instances');
  const domains = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory());
  assert.ok(domains.includes('podcasts'), 'podcasts section exists');
  assert.ok(domains.length >= 6, 'at least 6 sections');
  for (const d of domains) {
    const read = f => fs.readFileSync(path.join(dir, d, f), 'utf8');
    const cfg = e.parseMeta(read('meta.md'));
    assert.ok(cfg.accent && cfg.accent2 && cfg.themeHue, `${d}: theme + contrast colour set`);
    const items = e.parseItems(read('items.md'));
    const tagging = e.parseTagging(read('tagging.md'));
    const tags = new Set(e.parseTags(read('tags.md')));
    const axes = e.parseAxes(read('axes.md'));
    assert.ok(items.length >= 10, `${d}: has items`);
    for (const it of items) assert.ok(tagging[it.name], `${d}: "${it.name}" is tagged`);
    for (const ax of axes) for (const t of ax.tags) assert.ok(tags.has(t), `${d}: axis tag "${t}" in vocabulary`);
  }
});
