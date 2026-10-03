/* API-fixture UI checks only; no real credits, accounts, provider calls or music writes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const errors = [], calls = [], songs = {};
      let used = 9;
      const state = id => ({ included: 10, used, remaining: 10 - used, period: '2026-10',
        authorized: !!songs[id]?.authorized, started: !!songs[id]?.started, live_title: songs[id]?.project.live_set?.title || null });
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987688, email: 'allowance@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname, body = req.postData() ? req.postDataJSON() : {};
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/auth/me') return reply({ id: 987688, email: 'allowance@example.invalid', subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/stripe/usage') return reply({ enforced: true, plan: { source: 'subscription', plan: 'starter', included_tracks: 10 }, songs: state(),
          packs: [], ai_usage: { estimated_usd: 7, fair_use_cap_usd: 8, fair_use_enforced: true } });
        if (path === '/api/chats') {
          if (req.method() === 'POST') {
            const id = `song-${Object.keys(songs).length + 1}`;
            songs[id] = { sessionId: id, messages: [], project: { title: 'New song', starting_point: null, live_set: null } };
            return reply(songs[id]);
          }
          return reply({ chats: Object.values(songs).map(s => ({ id: s.sessionId, title: s.project.title })) });
        }
        if (path.startsWith('/api/chats/')) {
          const id = path.split('/')[3], song = songs[id];
          if (path.endsWith('/allowance')) return reply(state(id));
          if (path.endsWith('/project')) { Object.assign(song.project, body); return reply({ project: song.project }); }
          return reply(song);
        }
        if (path === '/api/live-set') {
          calls.push(body);
          const result = { status: 'observed', title: 'Allowance test set', tracks: ['Kick'], new_set_ready: false };
          if (body.operation.startsWith('confirm')) {
            assert.equal(body.authorize_song, true);
            assert.ok(used < 10 || songs[body.session_id].started);
            songs[body.session_id].authorized = true;
            songs[body.session_id].project.live_set = { title: result.title, choice: body.operation };
            result.project = songs[body.session_id].project;
          }
          return reply(result);
        }
        if (path === '/api/chat/stream') {
          const song = songs[body.session_id];
          if (!body.planning_only) {
            assert.ok(song.authorized);
            if (!song.started) { used++; song.started = true; }
          }
          const response = 'Updated this song.';
          song.messages.push({ role: 'user', content: body.message }, { role: 'assistant', content: response });
          return route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'complete', response, tool_calls: [], project: song.project }) + '\n' });
        }
        throw new Error('Unexpected API route: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://127.0.0.1:3023') + '/dashboard');
      const newSong = async () => {
        const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/chats' && r.request().method() === 'POST');
        await page.getByRole('button', { name: 'New song', exact: true }).click();
        await created;
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'New song' && !b.disabled));
      };
      await newSong();
      await page.getByRole('button', { name: 'Start from an idea', exact: true }).click();
      const confirm = page.getByRole('button', { name: 'Use this Live Set', exact: true });
      await page.getByText('9 of 10 new songs used this month (UTC).', { exact: true }).waitFor();
      assert.equal(await confirm.isDisabled(), true);
      await page.getByLabel(/I agree to use one song credit/).check();
      await confirm.click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(used, 9, 'Set confirmation does not consume a song');
      const send = async message => {
        await page.getByLabel('Message BeatMind', { exact: true }).fill(message);
        await page.getByRole('button', { name: 'Send', exact: true }).click();
        await page.getByText(message, { exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('[aria-label="Thinking"]'));
        await page.getByText('This song is counted', { exact: true }).waitFor();
      };
      await send('Build the kick');
      assert.equal(used, 10);
      await send('Refine the kick');
      assert.equal(used, 10, 'Revisions do not consume another song');
      await page.getByText('AI allowance: 87% used - nearing monthly limit', { exact: true }).waitFor();
      await page.screenshot({ path: `/tmp/beatmind-song-allowance-${width}.png` });
      await newSong();
      await page.getByRole('button', { name: 'Start from an idea', exact: true }).click();
      await page.getByText(/No new songs remaining. Continue an existing song/).waitFor();
      assert.equal(await confirm.isDisabled(), true);
      assert.equal(calls.filter(c => c.operation.startsWith('confirm')).length, 1);
      await page.screenshot({ path: `/tmp/beatmind-song-limit-${width}.png` });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: explicit consent, no charge on setup, tenth song, revisions, AI warning, eleventh-song block`);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
