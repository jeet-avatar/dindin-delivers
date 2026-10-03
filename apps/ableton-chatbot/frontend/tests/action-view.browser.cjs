/* Display-result fixtures only. This test never connects to or changes Ableton. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const errors = [];
      const action = (track, name, status) => ({ tool: 'show_live_view', input: { view: 'track', track }, result: {
        status: status === 'verified' ? 'observed' : 'unverified',
        view: { status, track_name: name, target: { view: 'track' } },
      } });
      const messages = [{ role: 'user', content: 'Show Bass after Kick' }, {
        role: 'assistant', content: 'Display rehearsal', requestStatus: 'complete',
        toolCalls: [action(0, 'Kick', 'verified'), action(3, 'Bass', 'verified')],
      }, { role: 'user', content: 'Show Drums' }, {
        role: 'assistant', content: 'Display could not be checked', requestStatus: 'complete',
        toolCalls: [action(1, 'Drums', 'unverified')],
      }];
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987681, email: 'views@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/auth/me') return reply({ id: 987681, subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/references') return reply({ references: [] });
        if (path === '/api/chats') return reply({ chats: [{ id: 'views', title: 'Display rehearsal' }] });
        if (path === '/api/chats/views') return reply({ sessionId: 'views', project: null, messages });
        return route.fulfill({ status: 404, body: '' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3017') + '/dashboard');
      if (width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
      await page.getByRole('button', { name: 'Open saved song: Display rehearsal', exact: true }).click();
      await page.getByText('Display checked in Ableton: Bass', { exact: true }).waitFor();
      await page.getByText('Ableton display needs checking: Drums', { exact: true }).waitFor();
      assert.equal(await page.getByText('Display checked in Ableton: Kick', { exact: true }).count(), 0);
      assert.equal(await page.getByText('Display checked in Ableton: Drums', { exact: true }).count(), 0);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-action-view-${width}.png` });
      console.log(`PASS ${width}px: latest target, explicit display failure, no overflow or React errors`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
