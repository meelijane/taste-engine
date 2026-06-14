import { test, expect } from '@playwright/test';

// 1x1 transparent PNG — loads offline so avatar `onload` fires deterministically.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const PROFILE = JSON.stringify({ title: 'Test Archetype', body: 'A test profile.', topTags: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] });
const RECS = JSON.stringify({ recommendations: [{ name: 'Recommended One', reason: 'Because tests.', tags: ['x', 'y'], match: 91 }] });

const ACCENTS = {
  comedy: '#ff8a33', music: '#b96bff', tv: '#2ec5ff',
  film: '#ff4d58', books: '#2fe08a', podcasts: '#25d0c0'
};

// Deterministic network: Claude, image proxy and Wikipedia are all stubbed.
async function stub(page) {
  await page.route('**/api/claude', route => {
    const body = route.request().postData() || '';
    const text = /Recommend \d|recommendations/i.test(body) ? RECS : PROFILE;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text }] }) });
  });
  await page.route('**/api/image*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: PNG }) }));
  await page.route('**en.wikipedia.org/**', route => {
    const term = new URL(route.request().url()).searchParams.get('gsrsearch') || 'name';
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ query: { pages: { 1: { title: term, thumbnail: { source: PNG } } } } }) });
  });
}

const ready = (page, domain) => page.waitForFunction(d => window.engine && window.engine.config && window.engine.config.domain === d, domain);
const accentOf = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase());

async function pickAndRun(page, mode, count = 5) {
  await page.click(`.te-card[data-mode="${mode}"]`);
  const items = page.locator('#te-item-list .te-item');
  await items.first().waitFor();
  for (let i = 0; i < count; i++) await items.nth(i).click();
  await page.click('#te-cta');
}

test('landing hub: six sections, nav, and a way back to it', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await expect(page.locator('.te-domain')).toHaveCount(6);
  await expect(page.locator('.te-topnav-links a')).toHaveCount(6);
  await expect(page.locator('.te-topnav-logo')).toBeVisible();
  await expect(page.locator('.te-topnav-links a', { hasText: 'Podcasts' })).toBeVisible();
});

test('each section has its own accent colour + active nav, logo returns to hub', async ({ page }) => {
  for (const [domain, hex] of Object.entries(ACCENTS)) {
    await stub(page);
    await page.goto(`/instances/${domain}/`);
    await ready(page, domain);
    expect(await accentOf(page)).toBe(hex);
    await expect(page.locator(`.te-topnav-links a[data-domain="${domain}"]`)).toHaveClass(/on/);
  }
  // back to the main nav
  await page.click('.te-topnav-logo');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.te-domain')).toHaveCount(6);
});

test('picker → profile renders, and the result exports as a PNG', async ({ page }) => {
  await stub(page);
  await page.goto('/instances/comedy/');
  await ready(page, 'comedy');
  await pickAndRun(page, 'profile');
  await expect(page.locator('#te-profile-title')).toHaveText('Test Archetype');
  await expect(page.locator('#te-profile-result [data-export]')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#te-profile-result [data-export]')
  ]);
  expect(download.suggestedFilename()).toMatch(/^taste-comedy\.png$/);
});

test('recommendations render from picks', async ({ page }) => {
  await stub(page);
  await page.goto('/instances/music/');
  await ready(page, 'music');
  await pickAndRun(page, 'recommend');
  await expect(page.locator('#te-rec-cards .te-rec-name').first()).toHaveText('Recommended One');
  await expect(page.locator('.te-match-pill').first()).toContainText('91');
});

test('imagery loads (poster art) on the podcasts picker', async ({ page }) => {
  await stub(page);
  await page.goto('/instances/podcasts/');
  await ready(page, 'podcasts');
  await expect(page.evaluate(() => window.engine.items.length)).resolves.toBe(18);
  await page.click('.te-card[data-mode="profile"]');
  await expect(page.locator('.te-avatar--poster').first()).toBeVisible();
  await expect(page.locator('.te-avatar.has-img').first()).toBeVisible({ timeout: 12000 });
});

test('people imagery loads on a person-domain picker', async ({ page }) => {
  await stub(page);
  await page.goto('/instances/comedy/');
  await ready(page, 'comedy');
  await page.click('.te-card[data-mode="profile"]');
  await expect(page.locator('.te-avatar.has-img').first()).toBeVisible({ timeout: 12000 });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('content still renders with motion disabled', async ({ page }) => {
    await stub(page);
    await page.goto('/instances/film/');
    await ready(page, 'film');
    await expect(page.locator('.te-screen.active .te-display')).toBeVisible();
  });
});
