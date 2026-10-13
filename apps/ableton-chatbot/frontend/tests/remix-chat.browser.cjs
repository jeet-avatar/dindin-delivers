const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../out');
const server = http.createServer((req, res) => {
  const base = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!base.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  const file = [base, base + '.html', path.join(base, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const site = process.env.BEATMIND_TEST_SITE_URL || `http://127.0.0.1:${server.address().port}`;
    for (const [width, height] of [[1440, 900], [390, 844], [390, 667]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const user = { id: 987994, email: 'remix-layout@example.com', name: 'QA', subscribed: true, subscription_status: 'active' };
      const referenceId = 'a'.repeat(32), jobId = 'b'.repeat(32), sessionId = 'remix_' + 'c'.repeat(32);
      const project = { title: 'My minimal remix', mode: 'remix', starting_point: 'reference', live_set: width > 400 ? { title: 'My remix set' } : null,
        remix: { source_name: 'My reference.wav', style: 'Deep minimal', target_bpm: 124, automatic_preview_id: jobId } };
      const saved = { sessionId, messages: [{ role: 'assistant', content: 'Your preview is saved. What would you like to change?' }],
        input: '', referenceId, project };
      await context.addInitScript(({ user, saved }) => {
        localStorage.setItem('beatmind_token', 'synthetic-layout-token');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem(`beatmind_chats_v2_${user.id}`, JSON.stringify({ activeId: 'test', chats: [{ id: 'test', title: saved.project.title, sessionId: saved.sessionId }] }));
        localStorage.setItem(`beatmind_chats_v2_${user.id}_test`, JSON.stringify(saved));
      }, { user, saved: { ...saved, messages: [{ role: 'assistant', content: 'Planning the next steps...' }] } });
      const writes = [], errors = [];
      let failNext = false, proposeNext = false, rendered = false;
      let uploaded = false;
      const sample = { id: '8'.repeat(32), name: 'Bass one shot.wav', duration_seconds: 1, peak_dbfs: -12 };
      const sampleAudio = Buffer.alloc(44 + 44100 * 2);
      sampleAudio.write('RIFF'); sampleAudio.writeUInt32LE(sampleAudio.length - 8, 4); sampleAudio.write('WAVEfmt ', 8);
      sampleAudio.writeUInt32LE(16, 16); sampleAudio.writeUInt16LE(1, 20); sampleAudio.writeUInt16LE(1, 22);
      sampleAudio.writeUInt32LE(44100, 24); sampleAudio.writeUInt32LE(88200, 28); sampleAudio.writeUInt16LE(2, 32); sampleAudio.writeUInt16LE(16, 34);
      sampleAudio.write('data', 36); sampleAudio.writeUInt32LE(sampleAudio.length - 44, 40);
      for (let i = 0; i < 44100; i++) sampleAudio.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 44100) * 4000), 44 + i * 2);
      const recipe = { analysis_id: 'd'.repeat(64), timing_revision: 1, target_bpm: 124,
        segments: [{ section: 0, repeats: 2, levels: { drums: 0, bass: -6 },
          effects: { drums: [{ kind: 'highpass', frequency_hz: 35 }] },
          parts: [{ id: 'part_bass', name: 'Sampled bass', sample_id: sample.id, root_note: 57,
            gain_db: -6, loop_beats: 4, replaces: 'bass', notes: [{ beat: 0, note: 57, duration_beats: 1, velocity: 100 }],
            effects: [{ kind: 'delay', beats: .75, feedback: .25, mix: .15 }] }] }] };
      const draft = { id: 'f'.repeat(32), title: 'My revised remix', recipe, duration_seconds: 16,
        changes: ['Position 1: Intro x1 (bass 0 dB, drums 0 dB) -> Intro x2 (bass -6 dB, drums 0 dB)'] };
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/bridge/latest.json', route => route.fulfill({ contentType: 'application/json', body: '{"version":"1.3.19"}' }));
      await context.route('**/api/**', async route => {
        const request = route.request(), pathname = new URL(request.url()).pathname;
        const reply = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        if (pathname.endsWith('/remix-samples')) {
          if (request.method() === 'POST') {
            assert.equal(request.headers()['x-rights-confirmed'], 'true');
            assert.ok(request.postDataBuffer().equals(sampleAudio));
            uploaded = true; return reply(sample);
          }
          return reply({ samples: uploaded ? [sample] : [] });
        }
        if (pathname.endsWith(`/remix-samples/${sample.id}/audio`)) return route.fulfill({ contentType: 'audio/wav', body: sampleAudio });
        if (request.method() === 'POST') writes.push({ pathname, body: request.postDataJSON() });
        if (pathname === '/api/auth/me') return reply(user);
        if (pathname === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, model_access: ['fast', 'pro'] });
        if (pathname === '/api/bridge/status') return reply({ bridge_connected: width > 400, bridge_version: '1.3.19' });
        if (pathname === '/api/recordings') return reply({ recordings: [] });
        if (pathname === '/api/chats') return reply({ chats: [{ id: sessionId, title: project.title }] });
        if (pathname.endsWith('/remix-edit-state')) return reply({ base_preview_id: jobId, title: project.title,
          recipe, draft: proposeNext ? draft : null, renders_remaining: 4 });
        if (pathname.startsWith('/api/chats/')) return reply(saved);
        if (pathname.endsWith('/automatic-remixes')) {
          if (request.method() === 'POST') {
            const body = request.postDataJSON();
            assert.equal(body.draft_id, draft.id); assert.equal(body.session_id, sessionId);
            assert.deepEqual(body.recipe, recipe); assert.equal(body.source_use.rights_confirmed, true);
            rendered = true;
            return reply({ id: '9'.repeat(32), title: draft.title, status: 'ready', stage: 'Preview ready for your review',
              review: 'pending', recipe, project: { sessionId, referenceId, project },
              result: { duration_seconds: 16, lufs: -16, true_peak_dbtp: -1, files: { mix: { sha256: 'd'.repeat(64) } }, limitations: [] } });
          }
          const job = id => ({ id, title: id === jobId ? 'This song preview' : 'Unrelated newer preview', status: 'ready', stage: 'Ready', review: 'accepted',
            project: { sessionId, referenceId, project }, recipe: { target_bpm: 124, segments: [] },
            result: { duration_seconds: 8, lufs: -16, true_peak_dbtp: -1, files: { mix: { sha256: 'd'.repeat(64) } }, limitations: [] } });
          return reply({ available: true, ableton_import_available: false, timing: { analysis_id: recipe.analysis_id, revision: 1, bpm: 124,
            sections: [{ name: 'Intro', start_seconds: 0, end_seconds: 8 }] }, stems: ['drums', 'bass'],
            jobs: [job('e'.repeat(32)), job(jobId)] });
        }
        if (pathname === '/api/chat/stream') {
          const native = request.postDataJSON().remix_edit_target === 'ableton';
          const events = [{ type: 'session', session_id: sessionId, project, referenceId },
            { type: 'status', message: 'Reviewing your remix request...' },
            failNext ? { type: 'error', message: 'The AI provider did not finish this step within 90 seconds. No Ableton actions were started.' }
              : native ? { type: 'complete', response: 'Instrument control read back in your linked Ableton set.', tool_calls: [] }
              : proposeNext ? { type: 'complete', response: 'Your remix changes are saved for review.', tool_calls: [
                { id: 'draft-action', tool: 'propose_remix_changes', input: {}, result: { status: 'observed',
                  summary: 'Saved for review; no audio changed.', remix_draft: { id: draft.id, changes: draft.changes } } }] }
              : { type: 'complete', response: 'Your preview is already accepted. We can reduce the bass in the breakdown next.', tool_calls: [] }];
          return route.fulfill({ contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event) + '\n').join('') });
        }
        return reply({});
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(site + '/dashboard');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      const conversation = page.getByRole('region', { name: 'Song conversation' });
      await conversation.getByText('Your preview is saved.', { exact: false }).waitFor();
      assert.equal(await conversation.getByText('Planning the next steps...', { exact: true }).count(), 0, 'Reload must recover the saved server answer');
      const box = await conversation.boundingBox();
      assert.ok(box.height >= 140, `Conversation has ${box.height}px of ${height}px`);
      const input = page.getByRole('textbox', { name: 'Message BeatMind' });
      assert.ok((await input.boundingBox()).height >= 70);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.getByLabel('Song settings', { exact: true }).count(), 0, 'Keep the original visible controls');
      await page.getByRole('button', { name: 'Open Ableton', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Open BeatMind Bridge' }).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await input.fill('Can we make the breakdown lighter?');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await conversation.getByText('Your preview is already accepted.', { exact: false }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Stop production' }).count(), 0);
      await page.screenshot({ path: `/tmp/beatmind-remix-chat-${width}-${height}.png` });
      failNext = true;
      await input.fill('Review my changes');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await conversation.getByText('90 seconds.', { exact: false }).first().waitFor();
      assert.equal(await page.getByRole('button', { name: 'Stop production' }).count(), 0);
      await page.getByRole('button', { name: 'Open Automatic Remix', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Automatic Remix' });
      await dialog.getByRole('button', { name: 'Preview approved', exact: true }).waitFor();
      assert.equal(await dialog.getByRole('combobox').inputValue(), jobId);
      assert.equal(await dialog.getByRole('button', { name: 'Check Ableton destination' }).count(), 0);
      await dialog.getByText('Samples and instruments (0/16)', { exact: true }).click();
      await dialog.locator('input[type="file"]').setInputFiles({ name: sample.name, mimeType: 'audio/wav', buffer: sampleAudio });
      const upload = dialog.getByRole('button', { name: 'Upload sample', exact: true });
      assert.equal(await upload.isDisabled(), true);
      await dialog.getByRole('checkbox', { name: 'I have permission to upload and reuse this sample.' }).check();
      await upload.click();
      await dialog.getByRole('button', { name: `Listen to ${sample.name}`, exact: true }).click();
      await page.waitForFunction(() => document.querySelector('audio[aria-label="Sample audition"]')?.currentTime > .1);
      assert.equal(uploaded, true); assert.equal(rendered, false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      assert.equal(writes.length, 2);
      assert.ok(writes.every(item => item.pathname === '/api/chat/stream'));
      failNext = false; proposeNext = true;
      // Acknowledge and remove the failed fixture request without replaying it.
      const removals = page.getByRole('button', { name: 'Remove saved instruction' });
      while (await removals.count()) await removals.first().click();
      await input.fill('Replace the intro bass with Bass one shot.wav, root A3, with a dotted eighth delay; repeat the intro twice.');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      const resume = page.getByRole('button', { name: 'Send unsent instructions', exact: true });
      await resume.click();
      await page.getByRole('button', { name: 'Review remix changes', exact: true }).click();
      await dialog.getByRole('heading', { name: 'Your requested changes' }).waitFor();
      assert.equal(rendered, false);
      assert.equal(await dialog.getByLabel('Target BPM', { exact: true }).isDisabled(), true);
      const confirm = dialog.getByRole('button', { name: 'Confirm changes and render', exact: true });
      assert.equal(await confirm.isDisabled(), true);
      await dialog.getByRole('checkbox', { name: /I have the rights/ }).check();
      await page.screenshot({ path: `/tmp/beatmind-chat-remix-draft-${width}-${height}.png` });
      await confirm.click();
      await dialog.getByRole('button', { name: 'Approve preview', exact: true }).waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Approve preview', exact: true }).isDisabled(), true);
      assert.equal(writes.filter(item => item.pathname.endsWith('/automatic-remixes')).length, 1);
      assert.equal(writes.filter(item => item.pathname === '/api/chat/stream').length, 3);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      const nativeTarget = page.getByRole('radio', { name: 'Ableton instruments', exact: true });
      if (width > 400) {
        await nativeTarget.check();
        await input.fill('Set my own synth cutoff to 1500 Hz in Ableton.');
        await page.getByRole('button', { name: 'Send', exact: true }).click();
        await conversation.getByText('Instrument control read back in your linked Ableton set.', { exact: true }).waitFor();
        assert.equal(writes.at(-1).body.remix_edit_target, 'ableton');
        await page.getByRole('radio', { name: 'Remix preview', exact: true }).check();
      } else assert.equal(await nativeTarget.isDisabled(), true);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS remix chat ${width}x${height}: original controls, readable composer, recovered replies, exact preview, chat draft, explicit render confirmation, no Ableton writes`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
