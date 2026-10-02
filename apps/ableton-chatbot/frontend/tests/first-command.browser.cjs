/* First-command and interrupted-request fixtures; never writes to Ableton. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const calls = [], errors = [];
      const project = { title: 'New song', starting_point: null, live_set: null };
      const actions = [
        ['create_midi_track', { index: 1 }], ['set_track_name', { track: 0, name: 'Bass' }],
        ['load_library_item', { track: 1, kind: 'instrument', folders: ['Wavetable'] }],
        ['set_track_name', { track: 1, name: 'Bass' }],
      ].map(([tool, input], i) => ({ id: `a${i}`, tool, input, result: { status: 'verified' } }));
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987656, email: 'first@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === '/api/stripe/usage') return route.fulfill({ status: 404, body: '' });
        const body = req.postData() ? req.postDataJSON() : {};
        calls.push({ path, method: req.method(), body });
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/auth/me') return reply({ id: 987656, subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/chats') return reply(req.method() === 'POST'
          ? { sessionId: 'fresh-song', project, messages: [], referenceId: null }
          : { chats: [{ id: 'interrupted-song', title: 'Interrupted bass' }] });
        if (path === '/api/chats/interrupted-song') return reply({ sessionId: 'interrupted-song', project: null,
          status: 'interrupted', messages: [{ role: 'user', content: 'Build a deep house groove with warm bass' },
            { role: 'assistant', content: 'This saved request has no confirmed completion. Inspect the action log before retrying.',
              requestStatus: 'interrupted', toolCalls: actions }] });
        if (path === '/api/chats/fresh-song') return reply({ project, referenceId: null });
        if (path === '/api/chat/stream' && calls.filter(c => c.path === path).length > 1) {
          return route.fulfill({ contentType: 'application/x-ndjson', body:
            JSON.stringify({ type: 'complete', response: 'Retry completed', tool_calls: [] }) + '\n' });
        }
        if (path === '/api/chat/stream') return route.fulfill({ contentType: 'application/x-ndjson', body:
          [ { type: 'session', session_id: 'fresh-song', project, referenceId: null },
            ...actions.map(action => ({ type: 'action_completed', action })) ].map(e => JSON.stringify(e)).join('\n') + '\n' });
        throw Error('Unexpected route: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      if (width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
      await page.getByRole('button', { name: 'Open saved song: Interrupted bass', exact: true }).click();
      await page.getByRole('heading', { name: 'Request interrupted', exact: true }).waitFor();
      await page.getByText('Ableton Track 1', { exact: true }).waitFor();
      await page.getByText('Ableton Track 2', { exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Changes checked', exact: true }).count(), 0);
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Home', exact: true }).click();
      await page.getByRole('button', { name: 'Build a deep house groove with warm bass', exact: true }).click();
      await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path === '/api/chats' && c.method === 'POST').length, 1);
      assert.equal(calls.filter(c => c.path === '/api/chat/stream').length, 0);
      assert.equal(await page.locator('#chat-input').inputValue(), 'Build a deep house groove with warm bass');
      await page.locator('#chat-input').press('Enter');
      await page.getByRole('heading', { name: 'Request interrupted', exact: true }).waitFor();
      assert.equal(calls.find(c => c.path === '/api/chat/stream').body.session_id, 'fresh-song');
      assert.equal(await page.getByRole('heading', { name: 'Changes checked', exact: true }).count(), 0);
      await page.getByRole('alert').filter({ hasText: 'Connection ended before completion' }).waitFor();
      await page.locator('#chat-input').fill('Inspect existing work; do not recreate it.');
      await page.locator('#chat-input').press('Enter');
      await page.getByText('Retry completed', { exact: true }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Connection ended before completion' }).count(), 0,
        'A new request must clear the stale global error, while retaining historical interruption details');
      await page.reload();
      await page.getByRole('heading', { name: 'Request interrupted', exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path === '/api/chat/stream').length, 2, 'Reload must never retry music');
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-first-command-${width}.png` });
      console.log(`PASS ${width}px: interrupted history, distinct track references, fresh-song starter, stream interruption and silent reload`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
