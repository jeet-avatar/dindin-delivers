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
      let uploaded = false, listened = false, inspections = 0;
      const ref = () => ({ id: refId, name: 'Original reference.wav', status: 'ready', created_at: '2026-09-26',
        report: { duration_seconds: 6, tempo: { bpm: 123 }, key_candidates: [], waveform: [0.1, 0.2, 0.5],
          possible_change_points_seconds: [], stems: [], limitations: [] },
        listening: { excerpts: [], coverage: { full_coverage: listened, coverage_percent: listened ? 100 : 0 },
          ...(listened ? { job: { status: 'complete', completed: 1, total: 1, failures: [], intent: 'I like the restrained groove, but want my own bass and pads.', started_at: '2026-09-26T20:00:00Z' } } : {}) } });
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
        if (path === '/api/stripe/usage') return route.fulfill({ status: 404, body: '' });
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
          if (request.method() === 'POST') { uploaded = true; return reply(ref()); }
          const oldReference = { ...ref(), id: 'd'.repeat(32), name: 'QA - Earlier reference.wav' };
          return reply({ available: true, max_bytes: 250 * 1024 * 1024, min_seconds: 5, max_seconds: 600, audio_listening: { available: true }, references: uploaded ? [oldReference, ref()] : [oldReference] });
        }
        if (path.includes('/audio/')) return route.fulfill({ contentType: 'audio/wav', body: wave() });
        if (path.endsWith('/listen-whole')) { assert.equal(body.consent, true); listened = true; return reply(ref().listening); }
        if (path === '/api/live-set') {
          if (body.operation === 'inspect' && ++inspections === 1) return reply({ status: 'failed', summary: '502:608: execution error: Unable to identify one Ableton document window. Close extra document or plug-in windows and check again. (-2700)' });
          if (body.operation === 'save') return reply({ status: 'failed', summary: 'System Events: osascript is not allowed assistive access. (-25211)' });
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
      await page.getByRole('button', { name: 'Upload a reference track', exact: true }).click();
      await page.getByRole('heading', { name: 'Upload your reference track', exact: true }).waitFor();
      assert.equal(await page.getByText('QA - Earlier reference.wav', { exact: true }).count(), 0);
      assert.equal(await page.locator('audio').count(), 0, 'New song must not load old audio');
      assert.equal(songs['song-1'].referenceId, null);
      await page.getByRole('button', { name: 'Choose a saved reference', exact: true }).click();
      await page.getByText('QA - Earlier reference.wav', { exact: true }).waitFor();
      assert.equal(await page.locator('[aria-label="Saved references"] [aria-pressed="true"]').count(), 0);
      assert.equal(await page.locator('audio').count(), 0, 'Opening the library must not select a reference');
      await page.getByRole('button', { name: 'Hide saved references', exact: true }).click();
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByLabel('Reference audio file').click();
      await (await fileChooser).setFiles({ name: 'Original reference.wav', mimeType: 'audio/wav', buffer: wave() });
      assert.equal(await page.getByRole('button', { name: 'Upload and analyze', exact: true }).isDisabled(), true);
      await page.getByLabel('I have permission to upload and analyze this audio.').check();
      await page.getByRole('button', { name: 'Upload and analyze', exact: true }).click();
      await page.getByText('Would you like me to listen to this track? What stands out to you?', { exact: true }).waitFor();
      assert.equal(songs['song-1'].referenceId, refId, 'Only the uploaded file becomes this song reference');
      await page.getByRole('heading', { name: 'Original reference.wav', exact: true }).waitFor();
      assert.equal(listened, false);
      assert.equal(calls.filter(c => c.path === '/api/live-set').length, 0, 'Planning must not open or change a Live Set');
      await page.getByLabel('What do you want from this reference?').fill('I like the restrained groove, but want my own bass and pads.');
      const listen = page.getByRole('button', { name: 'Send listening request', exact: true });
      await listen.click();
      await page.getByRole('alert').filter({ hasText: 'Your permission to send this audio' }).waitFor();
      assert.equal(listened, false, 'Validation must never send audio without consent');
      await page.getByLabel(/Send this whole track and my intent to OpenAI/).check();
      await listen.click();
      await page.getByRole('button', { name: 'Discuss what I like', exact: true }).click();
      await page.getByText('What do you like most about the groove?', { exact: true }).waitFor();
      const chat = calls.find(c => c.path === '/api/chat/stream');
      assert.equal(chat.body.reference_id, refId);
      assert.equal(chat.body.planning_only, true);
      await page.getByRole('button', { name: 'New song', exact: true }).click();
      await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Reference review', exact: true }).count(), 0);
      assert.equal(await page.getByLabel('Song name').inputValue(), 'New song');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('heading', { name: 'Upload your reference track', exact: true }).waitFor();
      assert.equal(await page.getByText('QA - Earlier reference.wav', { exact: true }).count(), 0);
      assert.equal(await page.locator('audio').count(), 0);
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      await page.getByRole('button', { name: 'Upload a reference track', exact: true }).click();
      await page.getByRole('heading', { name: 'Upload your reference track', exact: true }).waitFor();
      assert.equal(songs['song-2'].referenceId, null);
      assert.equal(await page.locator('audio').count(), 0);
      assert.equal(await page.getByLabel('Reference audio file').inputValue(), '');
      assert.equal(await page.getByLabel('I have permission to upload and analyze this audio.').isChecked(), false);
      assert.equal(await page.getByText('QA - Earlier reference.wav', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'Original reference.wav', exact: true }).count(), 0);
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
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
      await page.getByRole('button', { name: 'Upload song', exact: true }).click();
      await page.getByLabel('Reference audio file').waitFor();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      await page.getByRole('button', { name: 'Choose Live Set', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'could not identify your Live Set window' }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'macOS blocked' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Use this Live Set', exact: true }).isDisabled(), true);
      await page.screenshot({ path: `/tmp/beatmind-live-set-recovery-${width}.png` });
      await page.getByRole('button', { name: 'Retry inspection', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Use this Live Set' && !b.disabled));
      await page.getByText('Start a new Live Set instead', { exact: true }).click();
      const openNew = page.getByRole('button', { name: '2. Open new Live Set', exact: true });
      assert.equal(await openNew.isDisabled(), true, 'A new set needs the open set saved or closed first');
      await page.getByRole('button', { name: '1. Close it without saving', exact: true }).click();
      assert.equal(await openNew.isDisabled(), false);
      await page.getByText("When Ableton asks to save, choose Don't Save.", { exact: false }).waitFor();
      await page.getByRole('button', { name: '1. Save current set', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'macOS blocked bridge control.' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Use this new set', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: '3. Inspect open set', exact: true }).click();
      await page.getByRole('button', { name: 'Use this Live Set', exact: true }).click();
      await page.getByText('Selected set: Disposable QA set', { exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path === '/api/chat/stream').length, 1, 'Set selection must not start production');
      assert.deepEqual(calls.filter(c => c.path === '/api/live-set').map(c => c.body.operation), ['inspect', 'inspect', 'save', 'inspect', 'confirm_current']);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-song-projects-${width}.png` });
      await page.getByRole('button', { name: 'New song', exact: true }).click();
      await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor();
      await page.getByLabel('Message BeatMind', { exact: true }).fill('Load a 909 kit and make a human four-bar kick loop.');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      const setup = page.getByRole('region', { name: 'Song setup', exact: true });
      await setup.getByRole('button', { name: 'Start from an idea', exact: true }).waitFor();
      const bounds = await setup.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height < 900, 'Setup choices stay beside the composer');
      await page.screenshot({ path: `/tmp/beatmind-setup-next-step-${width}.png` });
      await setup.getByRole('button', { name: 'Start from an idea', exact: true }).click();
      await page.getByRole('button', { name: 'Use this Live Set', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '1. Close it without saving', exact: true }).isVisible(), false);
      await page.screenshot({ path: `/tmp/beatmind-confirm-current-${width}.png` });
      await page.getByRole('button', { name: 'Use this Live Set', exact: true }).click();
      await page.getByText('Selected set: Disposable QA set', { exact: true }).waitFor();
      await setup.getByRole('button', { name: 'Build agreed sound', exact: true }).waitFor();
      assert.equal(await setup.locator('[aria-current="step"]').innerText(), '3. Create sound');
      assert.equal(songs['song-3'].project.starting_point, 'idea');
      assert.equal(songs['song-3'].messages[0].content, 'Load a 909 kit and make a human four-bar kick loop.');
      const beforeBuild = calls.filter(c => c.path === '/api/chat/stream').length;
      await setup.getByRole('button', { name: 'Build agreed sound', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Send"]')?.disabled === true && !document.querySelector('[aria-label="Thinking"]'));
      const buildRequests = calls.filter(c => c.path === '/api/chat/stream');
      assert.equal(buildRequests.length, beforeBuild + 1, 'Only an explicit build click sends the continuation');
      assert.equal(buildRequests.at(-1).body.planning_only, false);
      assert.match(buildRequests.at(-1).body.message, /keeping existing parts/);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`PASS ${width}px: durable named song history, reference upload/consent/listening/discussion, isolated new song, restored reference, explicit set confirmation without production`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
