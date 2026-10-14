/* No real account, billing changes, provider calls or Ableton writes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      let state = 'failed', release;
      const calls = [], errors = [];
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'synthetic');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987982, subscribed: true }));
      });
      await context.route('**/release.json', r => r.fulfill({ json: {} }));
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        calls.push({ path, method: route.request().method() });
        if (path === '/api/stripe/usage') {
          if (state === 'held') await new Promise(resolve => { release = resolve; });
          if (state === 'failed' || state === 'held') return route.fulfill({ status: 503, json: {} });
          if (state === 'malformed') return route.fulfill({ json: {} });
          return route.fulfill({ json: require('./fixtures/usage.cjs') });
        }
        const json = path === '/api/auth/me' ? { id: 987982, subscribed: true }
          : path === '/api/chats' ? { chats: [] }
          : path === '/api/bridge/status' ? { bridge_connected: false }
          : path === '/api/recordings' ? { recordings: [] }
          : path === '/api/references' ? { references: [], available: true, local_separation: { available: false } } : {};
        return route.fulfill({ json });
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3000') + '/dashboard');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Could not check your plan access' }).waitFor();
      assert.equal(await page.getByText('Checking reference access...', { exact: true }).count(), 0);
      state = 'malformed';
      await page.getByRole('button', { name: 'Retry plan access', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Plan access could not be confirmed' }).waitFor();
      state = 'held';
      await page.getByRole('button', { name: 'Retry plan access', exact: true }).click();
      await page.getByText('Checking reference access...', { exact: true }).waitFor();
      await page.getByRole('alert').filter({ hasText: 'timed out' }).waitFor({ timeout: 16000 });
      state = 'ready';
      await page.getByRole('button', { name: 'Retry plan access', exact: true }).click();
      await page.getByRole('heading', { name: 'Reference tracks', exact: true }).waitFor();
      release();
      await page.waitForTimeout(200);
      assert.equal(await page.getByRole('button', { name: 'Retry plan access', exact: true }).count(), 0);
      assert.equal(calls.some(c => c.method !== 'GET'), false);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `/tmp/beatmind-plan-recovered-${width}.png` });
      console.log(`PASS plan access ${width}px: server failure, malformed response, timeout, explicit retry, stale response ignored, no writes`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
