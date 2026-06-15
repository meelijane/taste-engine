import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadConfig() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.localStorage = dom.window.localStorage;
  const code = fs.readFileSync(path.join(ROOT, 'engine/te-config.js'), 'utf8');
  (0, eval)(code);
  return dom.window.TasteConfig;
}

const { computeEnabled, ALL } = loadConfig();

test('development hosts enable every section', () => {
  for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '', 'mymac.local']) {
    assert.deepEqual(computeEnabled(host), ALL, `${host || '(empty)'} → all`);
  }
});

test('production hosts launch with comedy only', () => {
  assert.deepEqual(computeEnabled('tasteengine.app'), ['comedy']);
  assert.deepEqual(computeEnabled('taste-engine.vercel.app'), ['comedy']);
});

test('overrides: forceAll opens prod, forceProd locks dev', () => {
  assert.deepEqual(computeEnabled('tasteengine.app', { forceAll: true }), ALL);
  assert.deepEqual(computeEnabled('localhost', { forceProd: true }), ['comedy']);
});
