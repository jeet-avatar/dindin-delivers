/* Isolated browser fixtures. Never opens the bridge or sends music commands. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      let state = 'hold', releaseFirst;
      const firstResponse = new Promise(resolve => { releaseFirst = resolve; });
      const errors = [];
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture-not-a-token');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987654, email: 'fixture@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        assert.equal(route.request().method(), 'GET');
        if (path === '/api/bridge/status') {
          if (state === 'hold') await firstResponse;
          if (state === 'network-error') return route.abort('failed');
          const code = state === 'error' ? 503 : state === 'signed-out' ? 401 : 200;
          const body = state === 'malformed' ? {} : { bridge_connected: state === 'connected' };
          return route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
        }
        assert.notEqual(path, '/api/health', 'Global bridge count must not determine account status.');
        const body = path === '/api/auth/me' ? { id: 987654, email: 'fixture@example.invalid', subscribed: true }
          : path === '/api/chats' ? { chats: [] } : { recordings: [] };
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      const region = page.getByRole('region', { name: 'Bridge connection', exact: true });
      const label = text => region.getByText(text, { exact: true }).waitFor();
      const noInstaller = async () => assert.equal(await page.locator('a[href="/BeatMind-Bridge.dmg"]:visible').count(), 0);
      await label('Checking bridge connection...');
      await noInstaller();
      state = 'connected'; releaseFirst();
      await label('Bridge connected');
      await noInstaller();
      for (const name of ['Home', 'Downloads', 'BeatMind']) {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
        await label('Bridge connected');
        await noInstaller();
        assert.equal(await region.getByRole('link', { name: 'Open BeatMind Bridge', exact: true }).count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: '/tmp/beatmind-bridge-connected-' + name + '-' + viewport.width + '.png' });
      }
      state = 'disconnected';
      await page.clock.runFor(6000);
      await label('Bridge not connected');
      const link = region.getByRole('link', { name: 'Open BeatMind Bridge', exact: true });
      assert.equal(await link.getAttribute('href'), 'beatmind-bridge://open');
      await noInstaller();
      await link.evaluate(node => node.addEventListener('click', event => event.preventDefault()));
      await link.click();
      await label('Open request sent. Waiting for the bridge to connect...');
      // Let mocked network promises settle between clock ticks; a single large
      // jump can otherwise trigger request timeouts before responses resolve.
      for (let second = 0; second < 16; second++) {
        await page.clock.runFor(1000);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      await region.getByText(/No connection detected yet/).waitFor();
      await region.getByText('Need to install the bridge?', { exact: true }).click();
      assert.equal(await region.getByRole('link', { name: 'Download for Mac' }).getAttribute('href'), '/BeatMind-Bridge.dmg');
      state = 'connected';
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await label('Bridge connected');
      await noInstaller();
      for (const failure of ['error', 'malformed', 'network-error']) {
        state = failure;
        await page.clock.runFor(6000);
        await label('Unable to check bridge connection');
        await noInstaller();
        state = 'connected';
        await region.getByRole('button', { name: 'Check bridge connection' }).click();
        await label('Bridge connected');
      }
      state = 'signed-out';
      await page.clock.runFor(6000);
      await label('Sign in to check bridge connection');
      await noInstaller();
      state = 'connected';
      await page.clock.runFor(6000);
      await label('Bridge connected');
      assert.deepEqual(errors, []);
      console.log('PASS ' + viewport.width + 'px: checking, connected across all views, disconnected launch, optional installer, focus refresh, errors/retry, session expiry; no music commands');
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
