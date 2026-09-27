const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const oldId = 'a'.repeat(32), newId = 'b'.repeat(32), calls = [], errors = [];
      let attached = oldId, uploaded = false, rejectUpload = true, rejectAttachment = true;
      let delayUpload = false, releaseUpload;
      const delayedUpload = new Promise(resolve => { releaseUpload = resolve; });
      const project = { title: 'Reference replacement', starting_point: 'reference', live_set: null };
      const reference = (id, name) => ({ id, name, status: 'ready', created_at: '2026-09-26',
        report: { duration_seconds: 6, tempo: { bpm: 123 }, key_candidates: [], waveform: [0.1], stems: [], possible_change_points_seconds: [], limitations: [] },
        listening: { excerpts: [], coverage: { full_coverage: id === oldId, coverage_percent: id === oldId ? 100 : 0 } } });
      const oldRef = reference(oldId, 'BeatMind QA - old.wav'), newRef = reference(newId, 'My replacement.wav');
      await context.addInitScript(({ oldId, project }) => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987657, email: 'replace@example.invalid', subscribed: true }));
        if (!localStorage.getItem('beatmind_chat_v1_987657')) localStorage.setItem('beatmind_chat_v1_987657', JSON.stringify({
          sessionId: 'replacement-song', project, referenceId: oldId, messages: [], input: '' }));
      }, { oldId, project });
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        calls.push({ path, method: req.method() });
        if (path === '/api/auth/me') return reply({ id: 987657, subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path.endsWith('/project')) {
          const body = req.postDataJSON();
          if (body.reference_id === newId && rejectAttachment) { rejectAttachment = false; return reply({ detail: 'Attachment unavailable' }, 503); }
          if ('reference_id' in body) attached = body.reference_id;
          return reply({ project, referenceId: attached });
        }
        if (path === '/api/references') {
          if (req.method() === 'POST') {
            if (delayUpload) await delayedUpload;
            if (rejectUpload) { rejectUpload = false; return reply({ detail: 'Upload service unavailable' }, 503); }
            uploaded = true; return reply(newRef, 202);
          }
          return reply({ references: uploaded ? [oldRef, newRef] : [oldRef], available: true,
            max_bytes: 250 * 1024 * 1024, min_seconds: 5, max_seconds: 600, audio_listening: { available: true } });
        }
        if (path.includes('/audio/')) return route.fulfill({ status: 404 });
        throw Error('Unexpected API request: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      const references = () => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await references();
      await page.getByRole('heading', { name: oldRef.name, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Discuss what I like', exact: true }).waitFor();
      // Only UI size validation is simulated; the backend suite streams an actual >50 MB body.
      async function choose(name, megabytes) {
        await page.getByLabel('Reference audio file').evaluate((input, { name, megabytes }) => {
          const file = new File(['fixture'], name, { type: 'audio/wav' });
          Object.defineProperty(file, 'size', { value: megabytes * 1024 * 1024 });
          const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, { name, megabytes });
        await page.waitForFunction(() => !document.querySelector('[aria-label="Reference audio file"]').disabled);
      }
      await choose('Too large.wav', 251);
      await page.getByRole('alert').filter({ hasText: 'Too large.wav was not uploaded' }).waitFor();
      assert.equal(attached, null);
      assert.equal(await page.getByRole('heading', { name: oldRef.name, exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Discuss what I like', exact: true }).count(), 0);
      assert.equal(await page.locator('audio').count(), 0);
      assert.equal(calls.filter(c => c.path === '/api/references' && c.method === 'POST').length, 0);
      await page.reload(); await references();
      assert.equal(await page.getByRole('heading', { name: oldRef.name, exact: true }).count(), 0, 'Detached QA must not return on reload');
      await choose('My replacement.wav', 60);
      const consent = page.getByLabel('I have permission to upload and analyze this audio.');
      assert.equal(await consent.isChecked(), false);
      await consent.check();
      const submit = page.getByRole('button', { name: 'Upload and analyze', exact: true });
      await submit.click();
      await page.getByRole('alert').filter({ hasText: 'Upload service unavailable' }).waitFor();
      assert.equal(attached, null);
      assert.equal(await page.locator('audio').count(), 0);
      assert.equal(await page.getByRole('heading', { name: oldRef.name, exact: true }).count(), 0);
      await submit.click();
      await page.getByRole('alert').filter({ hasText: 'Attachment unavailable' }).waitFor();
      await page.getByText(/Uploaded; not attached to this song yet/).waitFor();
      assert.equal(attached, null);
      assert.equal(await page.locator('audio').count(), 0);
      await page.getByRole('button', { name: 'Attach uploaded reference', exact: true }).click();
      await page.getByRole('heading', { name: newRef.name, exact: true }).waitFor();
      assert.equal(attached, newId);
      assert.equal(calls.filter(c => c.path === '/api/references' && c.method === 'POST').length, 2, 'Attachment retry must not upload twice');
      assert.equal(await page.getByRole('heading', { name: oldRef.name, exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Discuss what I like', exact: true }).count(), 0, 'Old listening approval must not transfer');
      await choose('Leaving upload.wav', 60);
      await consent.check();
      delayUpload = true;
      const started = page.waitForRequest(r => r.url().endsWith('/api/references') && r.method() === 'POST');
      await submit.click(); await started;
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Home', exact: true }).click();
      releaseUpload();
      await references();
      await page.getByRole('heading', { name: 'Upload your reference track', exact: true }).waitFor();
      assert.equal(attached, null, 'Leaving an in-flight upload must not attach its late result');
      assert.equal(await page.locator('audio').count(), 0);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-reference-replacement-${width}.png` });
      console.log(`PASS ${width}px: selected QA detached, oversize rejection and reload stay empty, >50MB selection, failed upload isolation, attachment retry without duplicate upload, late result canceled on navigation`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
