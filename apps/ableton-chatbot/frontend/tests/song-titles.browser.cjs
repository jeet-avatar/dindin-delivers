/* Isolated title metadata fixtures. No provider calls or Ableton writes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const errors = [];
      const song = { sessionId: 'title-fixture', messages: [], referenceId: null,
        project: { title: 'New song', starting_point: null, live_set: null } };
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987677, email: 'titles@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const body = req.postData() ? req.postDataJSON() : {};
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/auth/me') return reply({ id: 987677, email: 'titles@example.invalid', subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: false });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/stripe/usage') return route.fulfill({ status: 404, body: '' });
        if (path === '/api/chats') return reply(req.method() === 'POST' ? song : {
          chats: [{ id: song.sessionId, title: song.project.title }, { id: 'other-song', title: 'Afro house - 122 BPM' }] });
        if (path === '/api/chats/title-fixture/project') {
          song.project.title = body.title;
          song.project.title_source = 'user';
          return reply({ project: song.project, referenceId: null });
        }
        if (path === '/api/chats/title-fixture') return reply(song);
        if (path === '/api/chat/stream') {
          if (body.message === 'Make deep minimal at 124 BPM') {
            Object.assign(song.project, { title: 'Deep minimal - 124 BPM', title_source: 'auto', genre: 'deep minimal', bpm: 124 });
          } else if (body.message === 'Make it 126 BPM') {
            song.project.bpm = 126;
            if (song.project.title_source !== 'user') song.project.title = 'Deep minimal - 126 BPM';
          } else if (body.message === 'Call this song Night Circuit') {
            Object.assign(song.project, { title: 'Night Circuit', title_source: 'user' });
          } else throw Error('Unexpected chat request: ' + body.message);
          const response = 'Song details saved. No music changed.';
          song.messages.push({ role: 'user', content: body.message }, { role: 'assistant', content: response });
          return route.fulfill({ contentType: 'application/x-ndjson', body: [
            { type: 'session', session_id: song.sessionId },
            { type: 'complete', response, project: song.project, tool_calls: [] },
          ].map(e => JSON.stringify(e)).join('\n') + '\n' });
        }
        throw Error('Unexpected route: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://127.0.0.1:3023') + '/dashboard');
      const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/chats' && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'New song', exact: true }).click();
      await created;
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'New song' && !b.disabled));
      await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor();
      const send = async text => {
        await page.getByLabel('Message BeatMind', { exact: true }).fill(text);
        const done = page.waitForResponse(r => r.url().endsWith('/api/chat/stream'));
        await page.getByRole('button', { name: 'Send', exact: true }).click();
        await done;
        await page.waitForFunction(() => !document.querySelector('[aria-label="Thinking"]'));
      };
      await send('Make deep minimal at 124 BPM');
      await page.waitForFunction(() => document.querySelector('[aria-label="Song name"]')?.value === 'Deep minimal - 124 BPM');
      if (width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
      await page.getByRole('button', { name: 'Open saved song: Deep minimal - 124 BPM', exact: true }).waitFor();
      await page.screenshot({ path: `/tmp/beatmind-song-title-${width}.png` });
      if (width < 640) await page.getByRole('region', { name: 'Saved songs', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
      await send('Make it 126 BPM');
      await page.waitForFunction(() => document.querySelector('[aria-label="Song name"]')?.value === 'Deep minimal - 126 BPM');
      await send('Call this song Night Circuit');
      await page.waitForFunction(() => document.querySelector('[aria-label="Song name"]')?.value === 'Night Circuit');
      await send('Make it 126 BPM');
      assert.equal(await page.getByLabel('Song name').inputValue(), 'Night Circuit');
      await page.getByLabel('Song name').fill('My own title');
      const saved = page.waitForResponse(r => r.url().endsWith('/project') && r.request().method() === 'PATCH');
      await page.getByLabel('Song name').press('Tab');
      await saved;
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[aria-label="Song name"]')?.value === 'My own title');
      assert.equal(song.project.title_source, 'user');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: automatic genre/BPM title, tempo update, chat name, manual override, saved history and reload`);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
