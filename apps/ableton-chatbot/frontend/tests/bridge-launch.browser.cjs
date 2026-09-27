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
      const launches = [];
      let launchFailed = false;
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture-not-a-token');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987654, email: 'fixture@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/live-set') {
          assert.equal(route.request().method(), 'POST');
          assert.deepEqual(route.request().postDataJSON(), { operation: 'activate' });
          launches.push('activate');
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify(launchFailed
            ? { status: 'failed', summary: 'Unable to open Ableton: finish the current dialog.' }
            : { status: 'observed', summary: 'Ableton brought forward. No set was changed.' }) });
        }
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
        assert.equal(await region.getByRole('link', { name: 'Open BeatMind Bridge', exact: true }).count(), 1);
        assert.equal(await region.getByRole('button', { name: 'Open Ableton', exact: true }).count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: '/tmp/beatmind-bridge-connected-' + name + '-' + viewport.width + '.png' });
      }
      assert.equal(launches.length, 0, 'Navigation must not launch Ableton');
      await region.getByRole('button', { name: 'Open Ableton', exact: true }).click();
      await label('Ableton brought forward. No set was changed.');
      assert.equal(launches.length, 1);
      launchFailed = true;
      await region.getByRole('button', { name: 'Open Ableton', exact: true }).click();
      await region.getByRole('alert').filter({ hasText: 'Unable to open Ableton' }).waitFor();
      assert.equal(launches.length, 2);
      launchFailed = false;
      state = 'disconnected';
      await page.clock.runFor(6000);
      await label('Bridge not connected');
      await region.getByRole('button', { name: 'Open Ableton', exact: true }).click();
      await label('Ableton launch waiting for Bridge connection.');
      assert.equal(launches.length, 2, 'Disconnected launch must wait without an API write');
      await region.getByRole('button', { name: 'Cancel pending Ableton launch', exact: true }).click();
      await label('Ableton launch canceled.');
      await region.getByRole('button', { name: 'Open Ableton', exact: true }).click();
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
      await label('Ableton brought forward. No set was changed.');
      assert.equal(launches.length, 3, 'Pending activation runs once after reconnect');
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
      assert.equal(launches.length, 3, 'Status polling must not repeat activation');
      console.log('PASS ' + viewport.width + 'px: persistent Bridge/Ableton controls, verified activation, failed activation, queued/canceled launch, once-only reconnect, optional installer, connection recovery; activate only, no Live Set edits');
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
