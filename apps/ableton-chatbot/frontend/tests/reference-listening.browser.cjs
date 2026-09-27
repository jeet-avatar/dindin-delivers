/* Browser contracts with intercepted API responses. No provider charges or Live writes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const id = 'e'.repeat(32), calls = [], errors = [];
      const project = { title: 'Listening workflow', starting_point: 'reference', live_set: null };
      let failPoll = false, reject = false, loseResponse = false, hold, release;
      let listening = { excerpts: [], coverage: { full_coverage: false, coverage_percent: 0 } };
      let timing = { analysis_id: 'fixture-analysis', revision: 1, status: 'estimated', bpm: 122, numerator: 4, denominator: 4,
        sections: [{ name: 'Intro', start_seconds: 0, end_seconds: 30 }, { name: 'Main', start_seconds: 30, end_seconds: 60 }] };
      let review = { analysis_id: timing.analysis_id, status: 'pending', decisions: {} }, template;
      const item = () => ({ id, name: 'My reference.wav', status: 'ready', created_at: new Date().toISOString(),
        listening, listening_busy: listening.job?.status === 'running', timing, stem_review: review, template,
        report: { duration_seconds: 60, tempo: { bpm: 122 }, key_candidates: [], waveform: [0.1, 0.5], stems: [], possible_change_points_seconds: [], limitations: [],
          stem_health: { checks_passed: true, stems: Object.fromEntries(['drums', 'bass', 'vocals', 'other'].map(s => [s, { aligned: true, finite: true, quiet: false, clipped_sample_fraction: 0, rms_dbfs: -20 }])) } } });
      const note = (intent, layer = 'mix') => ({ id: `note-${Date.now()}`, created_at: new Date().toISOString(), intent, layer, start_seconds: 0, end_seconds: 30,
        model: 'fixture', validation: 'checks_passed', notes: 'Warm bass with a restrained groove. Build gradually, then leave space for your own melody.' });
      await context.addInitScript(({ id, project }) => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987670, subscribed: true }));
        if (!localStorage.getItem('beatmind_chat_v1_987670')) localStorage.setItem('beatmind_chat_v1_987670', JSON.stringify({ sessionId: 'listen-song', referenceId: id, project, messages: [], input: '' }));
      }, { id, project });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const body = req.postData() && req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : {};
        const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        calls.push({ path, method: req.method(), body });
        if (path === '/api/auth/me') return reply({ id: 987670, subscribed: true });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path.startsWith('/api/chats/')) return reply({ project, referenceId: id, sessionId: 'listen-song', messages: [] });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/live-set') {
          assert.deepEqual(body, { operation: 'activate' });
          return reply({ status: 'observed', summary: 'Ableton brought forward. No set was changed.' });
        }
        if (path === '/api/references') return failPoll ? reply({ detail: 'Temporarily unavailable' }, 503) : reply({ references: [item()], available: true, audio_listening: { available: true }, max_bytes: 262144000, min_seconds: 5, max_seconds: 600 });
        if (path.includes('/audio/')) {
          const wav = Buffer.alloc(44 + 16000); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
          wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
          wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
          return route.fulfill({ contentType: 'audio/wav', body: wav });
        }
        if (path.endsWith('/listen-whole')) {
          assert.equal(body.consent, true);
          if (reject) return reply({ detail: 'Listening quota reached. Try later.' }, 429);
          listening = { ...listening, job: { status: 'running', completed: 0, total: 2, failures: [], intent: body.intent, started_at: new Date().toISOString() } };
          if (hold) await hold;
          if (loseResponse) return route.abort('failed');
          return reply(listening, 202);
        }
        if (path.endsWith('/listen')) { const result = note(body.intent, body.layer); listening.excerpts.push(result); return reply(result); }
        if (path.endsWith('/listen-cancel')) { listening.job.status = 'interrupted'; return reply({ status: 'interrupted' }); }
        if (path.endsWith('/comparisons')) return reply({ comparisons: [], available: true });
        if (path.endsWith('/stem-review')) { review = { ...review, decisions: body.decisions, status: 'accepted' }; return reply(review); }
        if (path.endsWith('/timing')) { timing = { ...body, status: 'confirmed', revision: timing.revision + 1 }; return reply(timing); }
        if (path.endsWith('/template/approve')) { template.status = 'approved'; return reply(template); }
        if (path.endsWith('/template/download')) return route.fulfill({ contentType: 'application/zip', body: Buffer.from('fixture download') });
        if (path.endsWith('/template')) {
          template = { brief: body, revision: 1, status: 'draft', total_bars: 30.5, duration_seconds: 60, limitations: [],
            sections: body.sections.map((s, i) => ({ ...s, start_bar: 1 + i * 15.25, end_bar_exclusive: 1 + (i + 1) * 15.25, start_seconds: i * 30, end_seconds: (i + 1) * 30 })) };
          return reply(template);
        }
        if (path === '/api/chat/stream') return route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'complete', response: 'Let us choose your first original kick.', tool_calls: [] }) + '\n' });
        throw Error('Unexpected request: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const open = async () => {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
        await page.getByRole('tab', { name: '3. Listening', exact: true }).click();
      };
      const send = () => page.getByRole('button', { name: 'Send listening request', exact: true });
      const input = () => page.getByLabel('What do you want from this reference?');
      const consent = () => page.getByLabel(/Send this (whole track|excerpt) and my intent to OpenAI/);
      const posts = () => calls.filter(c => /\/listen(-whole)?$/.test(c.path) && c.method === 'POST');
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard'); await open();
      await page.getByRole('tab', { name: '4. Template', exact: true }).click();
      await page.getByText('Template prerequisites pending: stem review, timing confirmation.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Review stems', exact: true }).click();
      assert.equal(await page.getByRole('tab', { name: '1. Stems', exact: true }).getAttribute('aria-selected'), 'true');
      await page.getByRole('tab', { name: '3. Listening', exact: true }).click();
      // Locator.click auto-scrolls, so explicitly check discoverability while the answer has focus.
      for (const height of [900, 500]) {
        await page.setViewportSize({ width, height });
        await input().focus();
        const button = await send().boundingBox(), answer = await input().boundingBox();
        assert.ok(button && answer && answer.y >= 56 && answer.y + answer.height <= height && button.y >= answer.y + answer.height && button.y + button.height <= height,
          `Answer and send button must fit without overlap at ${width}x${height}: ${JSON.stringify({ answer, button })}`);
        assert.equal(await send().evaluate(button => {
          const box = button.getBoundingClientRect();
          return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        }), true, 'Send action must not be covered by a sticky header or another control');
        await page.screenshot({ path: `/tmp/beatmind-listening-submit-${width}-${height}.png` });
        await input().blur();
      }
      await input().focus();
      await page.setViewportSize({ width, height: 360 });
      await page.waitForFunction(() => {
        const form = document.querySelector('section[aria-label="AI listening"] form');
        const answer = form.querySelector('textarea').getBoundingClientRect();
        const action = form.querySelector('button[type="submit"]').getBoundingClientRect();
        return answer.y >= 56 && action.y >= answer.bottom && action.bottom <= innerHeight;
      });
      await page.screenshot({ path: `/tmp/beatmind-listening-submit-${width}-360.png` });
      await page.setViewportSize({ width, height: 900 });
      await send().click(); await page.getByRole('alert').filter({ hasText: 'Tell me what you want' }).waitFor();
      await input().fill('Keep the warm bass, but use my own sounds.');
      await send().click(); await page.getByRole('alert').filter({ hasText: 'Your permission' }).waitFor();
      await page.getByText('Allow audio analysis', { exact: true }).waitFor();
      assert.equal(await consent().getAttribute('aria-invalid'), 'true');
      assert.equal(await consent().evaluate(el => document.activeElement === el), true);
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Your permission' }).count(), 1, 'Show one consent error beside the permission checkbox');
      assert.equal(posts().length, 0);
      await consent().check();
      assert.equal(await consent().getAttribute('aria-invalid'), null);
      assert.equal(posts().length, 0, 'Checking consent must not send audio automatically');
      await page.reload(); await open();
      assert.equal(await input().inputValue(), 'Keep the warm bass, but use my own sounds.', 'Draft survives reload');
      assert.equal(await consent().isChecked(), false, 'Consent never survives reload');
      await page.getByLabel('Excerpt', { exact: true }).check();
      await page.getByLabel('Start (seconds)').fill('58');
      await consent().check(); await send().click();
      assert.equal(posts().length, 0, 'Out-of-range excerpts never sent');
      await page.getByLabel('Whole track', { exact: true }).check();
      assert.equal(await consent().isChecked(), false, 'Changing scope resets charge consent');
      await consent().check();
      hold = new Promise(resolve => { release = resolve; });
      await send().click();
      await page.getByRole('button', { name: 'Sending listening request...', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Sending listening request...', exact: true }).evaluate(el => { el.click(); el.click(); });
      assert.equal(posts().length, 1);
      assert.equal(await input().isDisabled(), true);
      failPoll = true; release(); hold = null;
      await page.getByText('Request accepted, but status updates are unavailable. Do not resend it; check status below.', { exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Submitted listening intent', exact: true }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Listening failed' }).count(), 0);
      await page.getByRole('button', { name: 'Check listening status', exact: true }).click();
      assert.equal(posts().length, 1);
      failPoll = false;
      listening.excerpts = [note(listening.job.intent)];
      listening.job = { ...listening.job, status: 'complete', completed: 2 };
      listening.coverage = { full_coverage: true, coverage_percent: 100 };
      await page.getByRole('button', { name: 'Check listening status', exact: true }).click();
      await page.getByText('Listening complete. 2 of 2 intervals passed checks.', { exact: true }).waitFor();
      await page.getByText(/^Warm bass with a restrained groove/).waitFor();
      await page.getByRole('region', { name: 'AI listening', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-listening-${width}.png` });
      assert.equal(await consent().isChecked(), false);
      assert.equal(posts()[0].body.intent, 'Keep the warm bass, but use my own sounds.');

      await input().fill('Focus on the new bass intent.'); await consent().check();
      loseResponse = true;
      await send().click();
      await page.getByText('Submission unconfirmed. Sending again is paused to avoid duplicate charges.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Check listening status', exact: true }).click();
      await page.getByText('Your listening request is saved.', { exact: true }).waitFor();
      assert.equal(posts().length, 2, 'Recovering a lost response must only read status');
      assert.equal(await page.getByRole('button', { name: 'Discuss what I like', exact: true }).count(), 0, 'Old complete coverage cannot finish a new job');
      await page.getByRole('button', { name: 'Stop listening', exact: true }).click();
      await page.getByText('Listening stopped before completion. 0 of 2 intervals passed checks.', { exact: true }).waitFor();
      loseResponse = false; reject = true;
      await consent().check(); await send().click();
      await page.getByRole('alert').filter({ hasText: 'Listening quota reached' }).waitFor();
      assert.equal(await send().isEnabled(), true, 'Explicit rejection releases submit state');
      reject = false;
      // Clear fixture throttling after verifying that the rate-limit response was visible.
      await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.includes('poll')) localStorage.removeItem(key); });
      await page.getByLabel('Excerpt', { exact: true }).check();
      await page.getByLabel('Start (seconds)').fill('0');
      await page.getByLabel('Length (seconds)').fill('10');
      await page.getByLabel('Listening audio layer', { exact: true }).selectOption('bass');
      await consent().check(); await send().click();
      await page.getByText('Listening complete. Your answer is ready below.', { exact: true }).waitFor();
      assert.equal(posts().at(-1).body.layer, 'bass');
      assert.equal(posts().at(-1).body.duration_seconds, 10);

      // Complete the actual UI path from listening to reviewed stems, timing, approved plan and chat.
      await page.getByRole('tab', { name: '1. Stems', exact: true }).click();
      await page.getByRole('button', { name: 'Save stem review', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'A choice is required for:' }).waitFor();
      for (const stem of ['drums', 'bass', 'vocals', 'other']) {
        await page.getByLabel('Reference audio layer').selectOption(stem);
        const audio = page.getByLabel(`${stem} audio`, { exact: true }); await audio.waitFor();
        await audio.evaluate(async el => { await el.play(); el.pause(); });
        await page.getByLabel(`${stem} reference decision`, { exact: true }).selectOption(stem === 'vocals' ? 'ignore' : 'keep');
      }
      await page.getByLabel('I listened and reviewed each stem choice.').check();
      await page.getByRole('button', { name: 'Save stem review', exact: true }).click();
      await page.getByText('Saved review: accepted', { exact: true }).waitFor();
      await page.getByRole('tab', { name: '2. Timing', exact: true }).click();
      await page.getByLabel('I reviewed the section boundaries, tempo and meter.').check();
      await page.getByRole('button', { name: 'Confirm timing map', exact: true }).click();
      await page.getByText('confirmed / Section labels and meter require your review', { exact: true }).waitFor();
      await page.getByRole('tab', { name: '4. Template', exact: true }).click();
      await page.getByLabel('What do you want to keep from the reference?').fill('Warm bass, restrained groove; original instruments.');
      await page.getByRole('tab', { name: 'Direction', exact: true }).click();
      await page.getByLabel('Style', { exact: true }).fill('Deep house');
      await page.getByLabel('Mood', { exact: true }).fill('Warm, spacious');
      await page.getByRole('tab', { name: 'Sections', exact: true }).click();
      failPoll = true;
      await page.getByRole('button', { name: 'Save template draft', exact: true }).click();
      await page.getByText('Template saved. The overview could not refresh; your save succeeded.', { exact: true }).waitFor();
      failPoll = false;
      assert.equal(calls.filter(c => c.path === '/api/live-set').length, 0, 'Draft saves must not launch Ableton');
      if (width === 390) await page.getByLabel('Open Ableton after approval', { exact: true }).uncheck();
      await page.getByRole('button', { name: 'Approve planning brief', exact: true }).click();
      await page.getByRole('button', { name: 'Plan first part in chat', exact: true }).waitFor();
      if (width === 1440) await page.getByText('Ableton brought forward. No set was changed.', { exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path === '/api/live-set').length, width === 1440 ? 1 : 0);
      if (width === 390) {
        await page.getByRole('region', { name: 'Bridge connection', exact: true }).getByRole('button', { name: 'Open Ableton', exact: true }).click();
        await page.getByText('Ableton brought forward. No set was changed.', { exact: true }).waitFor();
      }
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download timing guide and blueprint', exact: true }).click();
      assert.equal((await download).suggestedFilename(), 'beatmind-reference-template.zip');
      await page.getByRole('button', { name: 'Continue to comparison', exact: true }).click();
      await page.getByText('No saved Ableton auditions yet.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Open music chat', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Back to template', exact: true }).click();
      await page.getByRole('button', { name: 'Plan first part in chat', exact: true }).click();
      await page.getByText('Let us choose your first original kick.', { exact: true }).waitFor();
      const chat = calls.find(c => c.path === '/api/chat/stream');
      assert.equal(chat.body.reference_id, id); assert.equal(chat.body.planning_only, true);
      assert.equal(calls.filter(c => c.path === '/api/live-set').length, 1, 'Navigation/download never repeat activation');
      assert.equal(calls.filter(c => c.path.endsWith('/template/suggest')).length, 0, 'Manual planning needs no paid suggestion');
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`PASS ${width}px: validation, durable draft, fresh consent, duplicate prevention, accepted POST/failed GET, real job progress, lost-response recovery, stop, rate limit, excerpt, four playable stems, timing, template approval/download/chat`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
