const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function wave() {
  const data = Buffer.alloc(44 + 16000); data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++) data.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 100 / 8000) * 1000), 44 + i * 2);
  return data;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const id = 'f'.repeat(32), analysisId = 'a'.repeat(64), calls = [], errors = [];
      const project = { title: 'Stem save test', starting_point: 'reference', live_set: null };
      let review = { analysis_id: analysisId, status: 'pending', decisions: {} };
      let timing = { analysis_id: analysisId, status: 'suggested', revision: 0, bpm: 122, numerator: 4, denominator: 4, sections: [{ name: 'Intro', start_seconds: 0, end_seconds: 6 }] };
      let failAudio = true, failPoll = false, reject = false, loseResponse = false, healthPassed = false, hold, release;
      const ref = () => ({ id, name: 'My saved song.wav', status: 'ready', created_at: '2026-09-27', timing, stem_review: review,
        report: { duration_seconds: 6, tempo: { bpm: 122 }, waveform: [0.1], key_candidates: [], stems: [], possible_change_points_seconds: [], limitations: [],
          stem_health: { checks_passed: healthPassed, stems: Object.fromEntries(['drums', 'bass', 'vocals', 'other'].map(stem => [stem, { aligned: true, finite: true, quiet: false, rms_dbfs: -20, clipped_sample_fraction: 0 }])) } } });
      await context.addInitScript(({ id, project }) => {
        localStorage.setItem('beatmind_token', 'fixture'); localStorage.setItem('beatmind_user', JSON.stringify({ id: 987671, subscribed: true }));
        if (!localStorage.getItem('beatmind_chat_v1_987671')) localStorage.setItem('beatmind_chat_v1_987671', JSON.stringify({ sessionId: 'stems-song', referenceId: id, project, messages: [], input: '' }));
      }, { id, project });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const body = req.postData() ? req.postDataJSON() : {};
        calls.push({ path, method: req.method(), body });
        const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
        if (path === '/api/auth/me') return reply({ id: 987671, subscribed: true });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path.startsWith('/api/chats/')) return reply({ project, referenceId: id, sessionId: 'stems-song', messages: [] });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/references') return failPoll ? reply({ detail: 'Unavailable' }, 503) : reply({ references: [ref()], available: true, max_bytes: 262144000, min_seconds: 5, max_seconds: 600, audio_listening: { available: true } });
        if (path.includes('/audio/')) {
          if (path.endsWith('/drums') && failAudio) { failAudio = false; return reply({ detail: 'Audio unavailable' }, 404); }
          return route.fulfill({ contentType: 'audio/wav', body: wave() });
        }
        if (path.endsWith('/refresh-analysis')) { healthPassed = true; return reply({ status: 'accepted' }); }
        if (path.endsWith('/stem-review')) {
          assert.equal(body.heard, true);
          if (reject) return reply({ detail: 'Reference processing is busy. Please wait.' }, 409);
          review = { ...body, status: Object.values(body.decisions).includes('needs_work') || !Object.values(body.decisions).includes('keep') ? 'needs_review' : 'accepted' };
          if (hold) await hold;
          if (loseResponse) return route.abort('failed');
          return reply(review);
        }
        if (path.endsWith('/timing')) { timing = { ...body, revision: timing.revision + 1, status: 'confirmed' }; return reply(timing); }
        throw Error('Unexpected API request: ' + path);
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      const open = async () => {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
        await page.getByRole('tab', { name: '1. Stems', exact: true }).click();
      };
      const section = () => page.getByRole('region', { name: 'Stem review', exact: true });
      const save = () => section().getByRole('button', { name: 'Save stem review', exact: true });
      const choice = stem => section().getByLabel(`${stem} reference decision`, { exact: true });
      const posts = () => calls.filter(c => c.path.endsWith('/stem-review') && c.method === 'POST');
      const confirm = () => section().getByLabel('I listened and reviewed each stem choice.');
      const next = name => section().getByLabel('Next stem review action', { exact: true }).getByRole('button', { name, exact: true });
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard'); await open();
      await next('Check stem files').waitFor();
      await save().click(); await section().getByRole('alert').filter({ hasText: 'Stem file integrity is not confirmed' }).waitFor();
      assert.equal(posts().length, 0);
      await section().getByRole('button', { name: 'Refresh stem checks', exact: true }).click();
      await section().getByText('4 separated audio files saved with this reference', { exact: true }).waitFor();
      assert.equal(calls.filter(c => c.path.endsWith('/refresh-analysis')).length, 1);
      await next('Review drums').click();
      assert.equal(await choice('drums').evaluate(el => document.activeElement === el), true);
      assert.equal(await choice('drums').inputValue(), '', 'Navigation must not make a choice');
      await section().getByText('Review not saved: 0 of 4 layer choices made', { exact: true }).waitFor();
      await section().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-stems-next-${width}.png` });
      await save().click(); await section().getByRole('alert').filter({ hasText: 'A choice is required for:' }).waitFor();
      assert.equal(posts().length, 0);
      await choice('drums').selectOption('keep');
      await page.reload(); await open();
      assert.equal(await choice('drums').inputValue(), 'keep', 'Unfinished choices survive reload');
      assert.equal(await confirm().isChecked(), false);
      await next('Review bass').waitFor();
      await section().getByRole('button', { name: 'Audition drums', exact: true }).click();
      await section().getByRole('alert').filter({ hasText: 'drums audio could not be loaded' }).waitFor();
      for (const stem of ['drums', 'bass', 'vocals', 'other']) {
        await section().getByRole('button', { name: `Audition ${stem}`, exact: true }).click();
        const player = section().getByLabel(`${stem} stem player`, { exact: true });
        await player.waitFor(); await player.evaluate(async audio => { await audio.play(); });
        assert.equal(await player.evaluate(audio => audio.error?.message || null), null);
        assert.equal(await page.locator('audio').evaluateAll(all => all.filter(audio => !audio.paused).length), 1, 'Only one stem plays at once');
        const download = page.waitForEvent('download');
        await section().getByRole('button', { name: `Download ${stem} WAV`, exact: true }).click();
        assert.equal((await download).suggestedFilename(), `My saved song-${stem}.wav`);
        await choice(stem).selectOption(stem === 'vocals' ? 'ignore' : 'keep');
      }
      await next('Confirm listening review').click();
      assert.equal(await confirm().evaluate(el => document.activeElement === el), true);
      assert.equal(await confirm().isChecked(), false, 'Navigation must not confirm listening');
      await save().click(); await section().getByRole('alert').filter({ hasText: 'Listening confirmation is required' }).waitFor();
      assert.equal(posts().length, 0);
      await confirm().check(); reject = true; await next('Save choices').click();
      await section().getByRole('alert').filter({ hasText: 'Reference processing is busy' }).waitFor();
      assert.equal(await choice('bass').inputValue(), 'keep'); assert.equal(await confirm().isChecked(), true);
      reject = false; hold = new Promise(resolve => { release = resolve; }); await save().click();
      await section().getByRole('button', { name: 'Saving...', exact: true }).waitFor();
      await section().getByRole('button', { name: 'Saving...', exact: true }).evaluate(button => { button.click(); button.click(); });
      assert.equal(posts().length, 2);
      failPoll = true; release(); hold = null;
      await section().getByText('Stem choices saved. The overview could not refresh; your save succeeded.', { exact: true }).waitFor();
      await section().getByRole('button', { name: 'Continue to timing', exact: true }).waitFor();
      await next('Next: Timing').waitFor();
      await section().scrollIntoViewIfNeeded(); await page.screenshot({ path: `/tmp/beatmind-stems-${width}.png` });
      assert.equal(await section().getByRole('button', { name: 'Stem choices saved', exact: true }).isDisabled(), true);
      failPoll = false;
      await page.reload(); await open();
      await section().getByRole('button', { name: 'Continue to timing', exact: true }).waitFor();
      assert.equal(posts().length, 2, 'Restoring a saved review must not write again');
      await choice('drums').selectOption('needs_work'); await confirm().check(); await save().click();
      await section().getByText('Saved review: needs review', { exact: true }).waitFor();
      assert.equal(await section().getByRole('button', { name: 'Continue to timing', exact: true }).count(), 0);
      await next('Revisit drums').click();
      assert.equal(await choice('drums').evaluate(el => document.activeElement === el), true);
      await choice('drums').selectOption('keep'); await confirm().check(); loseResponse = true; await save().click();
      await section().getByText('Save not confirmed', { exact: true }).waitFor();
      await next('Check save status').waitFor();
      const beforeReload = posts().length;
      await page.reload(); await open();
      await section().getByRole('button', { name: 'Continue to timing', exact: true }).waitFor();
      assert.equal(posts().length, beforeReload, 'Lost response recovers from server without duplicate save');
      loseResponse = false;
      await section().getByRole('button', { name: 'Check saved choices', exact: true }).click();
      await section().getByText('Stem choices saved. Ready for timing review.', { exact: true }).waitFor();
      await next('Next: Timing').click();
      await page.getByRole('heading', { name: 'Confirm reference timing', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Split section', exact: true }).click();
      await page.getByRole('button', { name: 'Merge with previous', exact: true }).nth(1).click();
      await page.getByRole('button', { name: 'Cue Intro', exact: true }).click();
      await page.getByLabel('I reviewed the section boundaries, tempo and meter.').check();
      await page.getByRole('button', { name: 'Confirm timing map', exact: true }).click();
      await page.getByText('Timing map saved.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Continue to listening', exact: true }).click();
      assert.equal(await page.getByRole('tab', { name: '3. Listening', exact: true }).getAttribute('aria-selected'), 'true');
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`PASS ${width}px: saved audio vs draft status, integrity gate/refresh, validation, persisted drafts/reviews, busy server, duplicate save guard, accepted POST/failed GET, lost-response reload, needs-work gate, all four audition/download controls, timing split/merge/cue/save/next`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
