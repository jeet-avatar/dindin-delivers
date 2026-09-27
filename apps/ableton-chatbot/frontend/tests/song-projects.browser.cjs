/* Isolated workflow fixtures: no real accounts, provider charges or Live writes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function wave() {
  const data = Buffer.alloc(44 + 16000);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(16000, 40);
  return data;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const songs = {}, calls = [], errors = [], refId = 'c'.repeat(32);
      let uploaded = false, listened = false;
      const ref = () => ({ id: refId, name: 'Original reference.wav', status: 'ready', created_at: '2026-09-26',
        report: { duration_seconds: 6, tempo: { bpm: 123 }, key_candidates: [], waveform: [0.1, 0.2, 0.5],
          possible_change_points_seconds: [], stems: [], limitations: [] },
        listening: { excerpts: [], coverage: { full_coverage: listened, coverage_percent: listened ? 100 : 0 } } });
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987655, email: 'songs@example.invalid', subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        const reply = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        const body = request.headers()['content-type']?.includes('application/json') && request.postData() ? request.postDataJSON() : {};
        calls.push({ path, method: request.method(), body });
        if (path === '/api/auth/me') return reply({ id: 987655, email: 'songs@example.invalid', subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/chats') {
          if (request.method() === 'POST') {
            const id = `song-${Object.keys(songs).length + 1}`;
            songs[id] = { sessionId: id, messages: [], referenceId: null,
              project: { title: 'New song', starting_point: null, live_set: null } };
            return reply(songs[id]);
          }
          return reply({ chats: Object.values(songs).map(song => ({ id: song.sessionId, title: song.project.title })) });
        }
        if (path.startsWith('/api/chats/')) {
          const song = songs[path.split('/')[3]];
          if (request.method() === 'PATCH') {
            if (body.title) song.project.title = body.title;
            if (body.starting_point) song.project.starting_point = body.starting_point;
            if ('reference_id' in body) song.referenceId = body.reference_id;
          }
          return reply(song);
        }
        if (path === '/api/references') {
          if (request.method() === 'POST') { uploaded = true; return reply({ id: refId }); }
          return reply({ available: true, audio_listening: { available: true }, references: uploaded ? [ref()] : [] });
        }
        if (path.includes('/audio/')) return route.fulfill({ contentType: 'audio/wav', body: wave() });
        if (path.endsWith('/listen-whole')) { assert.equal(body.consent, true); listened = true; return reply({ status: 'complete' }); }
        if (path === '/api/live-set') {
          const result = { status: 'observed', title: 'Disposable QA set', tracks: ['MIDI'], new_set_ready: true };
          if (body.operation.startsWith('confirm_')) {
            songs[body.session_id].project.live_set = { title: result.title, choice: body.operation };
            result.project = songs[body.session_id].project;
          }
          return reply(result);
        }
        if (path === '/api/chat/stream') {
          const song = songs[body.session_id];
          const response = 'What do you like most about the groove?';
          song.messages.push({ role: 'user', content: body.message }, { role: 'assistant', content: response });
          return route.fulfill({ contentType: 'application/x-ndjson', body:
            JSON.stringify({ type: 'session', session_id: body.session_id }) + '\n' +
            JSON.stringify({ type: 'complete', response, tool_calls: [] }) + '\n' });
        }
        throw Error('Unexpected route: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      await page.getByRole('button', { name: 'New song', exact: true }).click();
      await page.getByLabel('Song name').fill('Minimal reference study');
      await page.getByLabel('Song name').press('Tab');
      await page.waitForFunction(() => document.querySelector('input[aria-label="Song name"]')?.disabled === false);
      await page.getByRole('button', { name: 'Use a reference track', exact: true }).click();
      await page.getByLabel('Reference audio file').setInputFiles({ name: 'Original reference.wav', mimeType: 'audio/wav', buffer: wave() });
      assert.equal(await page.getByRole('button', { name: 'Analyze reference', exact: true }).isDisabled(), true);
      await page.getByLabel('I have permission to upload and analyze this audio.').check();
      await page.getByRole('button', { name: 'Analyze reference', exact: true }).click();
      await page.getByText('Would you like me to listen to this track? What stands out to you?', { exact: true }).waitFor();
      assert.equal(listened, false);
      assert.equal(calls.filter(c => c.path === '/api/live-set').length, 0, 'Planning must not open or change a Live Set');
      await page.getByLabel('What do you want from this reference?').fill('I like the restrained groove, but want my own bass and pads.');
      const listen = page.getByRole('button', { name: 'Listen to whole track', exact: true });
      assert.equal(await listen.isDisabled(), true);
      await page.getByLabel(/Send this whole track and my intent to OpenAI/).check();
      await listen.click();
      await page.getByRole('button', { name: 'Discuss what I like', exact: true }).click();
      await page.getByText('What do you like most about the groove?', { exact: true }).waitFor();
      const chat = calls.find(c => c.path === '/api/chat/stream');
      assert.equal(chat.body.reference_id, refId);
      assert.equal(chat.body.planning_only, true);
      await page.getByRole('button', { name: 'New song', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Reference review', exact: true }).count(), 0);
      await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor();
      if (width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
      await page.getByRole('region', { name: 'Saved songs', exact: true }).getByRole('button', { name: 'Open saved song: Minimal reference study', exact: true }).click();
      await page.getByText('What do you like most about the groove?', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reference review', exact: true }).click();
      await page.getByRole('button', { name: 'Discuss what I like', exact: true }).waitFor();
      await page.reload();
      await page.getByRole('button', { name: 'Reference review', exact: true }).click();
      await page.getByRole('button', { name: 'Discuss what I like', exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path.endsWith('/listen-whole')).length, 1, 'Restoring history must not send audio again');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      await page.getByRole('button', { name: 'Choose Live Set', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Use inspected set instead', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: '3. Inspect open set', exact: true }).click();
      await page.getByRole('button', { name: 'Use inspected set instead', exact: true }).click();
      await page.getByText('Selected set: Disposable QA set', { exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path === '/api/chat/stream').length, 1, 'Set selection must not start production');
      assert.deepEqual(calls.filter(c => c.path === '/api/live-set').map(c => c.body.operation), ['inspect', 'confirm_current']);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-song-projects-${width}.png` });
      console.log(`PASS ${width}px: durable named song history, reference upload/consent/listening/discussion, isolated new song, restored reference, explicit set confirmation without production`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
