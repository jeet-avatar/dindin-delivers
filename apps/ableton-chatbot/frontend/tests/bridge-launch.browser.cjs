/* Tests browser states without opening apps, signing in, or issuing music commands. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      let connected = false;
      const errors = [];
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture-not-a-token');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987654, email: 'fixture@example.invalid' }));
      });
      await context.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        assert.equal(route.request().method(), 'GET');
        const body = path === '/api/auth/me' ? { id: 987654, email: 'fixture@example.invalid' }
          : path === '/api/bridge/status' ? { bridge_connected: connected }
          : path === '/api/chats' ? { chats: [] } : { recordings: [] };
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3011') + '/dashboard');
      const region = page.getByRole('region', { name: 'Bridge connection' });
      const link = region.getByRole('link', { name: 'Open BeatMind Bridge', exact: true });
      await link.waitFor();
      assert.equal(await link.getAttribute('href'), 'beatmind-bridge://open');
      // Suppress the OS handoff only; React's click handler must still run.
      await link.evaluate(node => node.addEventListener('click', event => event.preventDefault()));
      await link.click();
      await region.getByText('Open request sent. Waiting for the bridge to connect...').waitFor();
      await page.clock.runFor(16000);
      await region.getByText(/No bridge connection detected/).waitFor();
      assert.equal(await region.getByRole('link', { name: 'Download for Mac' }).getAttribute('href'), '/BeatMind-Bridge.dmg');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-bridge-launch-${viewport.width}.png` });
      connected = true;
      await page.clock.runFor(6000);
      await region.waitFor({ state: 'detached' });
      await page.getByText('Ableton bridge connected', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}px: launch request, timeout fallback, server-confirmed connection, no music commands or overflow`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
