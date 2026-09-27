const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const id = 'd'.repeat(32), name = 'Full Moon - user reference.mp3';
      let state = 'processing', stage = 'Estimating drums, bass, vocals and other stems', failedPoll = false;
      let uploads = 0, releaseUpload, loseConfirmation = false;
      const held = new Promise(resolve => { releaseUpload = resolve; });
      const item = () => ({ id, name, status: state, stage, created_at: new Date(Date.now() - 180000).toISOString(),
        error: state === 'failed' ? 'Audio decoding failed. Choose another source file.' : undefined,
        ...(state === 'ready' ? { report: { duration_seconds: 452, tempo: { bpm: 123 }, key_candidates: [], waveform: [0.1, 0.3], stems: [], possible_change_points_seconds: [], limitations: [] } } : {}) });
      await context.addInitScript(() => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987662, subscribed: true }));
      });
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (path === '/api/auth/me') return reply({ id: 987662, subscribed: true });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/references') {
          if (route.request().method() === 'POST') {
            if (loseConfirmation) { uploads++; return route.abort('failed'); }
            uploads++; await held;
            return reply(item(), 202);
          }
          if (failedPoll) return reply({ detail: 'Service unavailable' }, 503);
          return reply({ references: [item()], available: true, processing: { busy: state === 'processing' }, max_bytes: 262144000, min_seconds: 5, max_seconds: 600 });
        }
        if (path.includes('/audio/')) return reply({}, 404);
        throw Error('Unexpected request ' + path);
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('heading', { name: 'Separating stems', exact: true }).waitFor();
      await page.getByText(/Upload confirmed/).waitFor();
      assert.equal(await page.getByRole('heading', { name: name, exact: true }).count(), 0, 'Showing a job must not select an old reference');
      await page.getByRole('button', { name: 'Open processing reference', exact: true }).click();
      await page.getByRole('heading', { name, exact: true }).waitFor();
      await page.getByText(/Server checked/).waitFor();
      await page.getByText(/Elapsed: 3m/).waitFor();
      await page.screenshot({ path: `/tmp/beatmind-reference-processing-${width}.png` });
      failedPoll = true;
      await page.getByRole('heading', { name: 'Current status not confirmed', exact: true }).waitFor();
      await page.getByText(/Do not upload another copy/).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Separating stems', exact: true }).count(), 0);
      failedPoll = false; stage = 'Measuring tempo, tonal centre and energy changes';
      await page.getByRole('heading', { name: 'Analyzing your track', exact: true }).waitFor();
      state = 'ready'; stage = undefined;
      await page.getByRole('heading', { name: 'Ready to listen', exact: true }).waitFor();
      const steps = page.getByRole('list', { name: 'Reference processing steps' });
      assert.equal(await steps.getByText('Done', { exact: true }).count(), 4);
      assert.equal(await steps.getByText('In progress', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Listen to stems', exact: true }).click();
      assert.equal(await page.getByRole('tab', { name: '1. Stems', exact: true }).getAttribute('aria-selected'), 'true');
      await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
      await page.getByRole('heading', { name: 'Ready to listen', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-reference-ready-${width}.png` });
      state = 'failed';
      await page.getByRole('heading', { name: 'Processing failed', exact: true }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Audio decoding failed' }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Listen to stems', exact: true }).count(), 0);
      await page.getByLabel('Reference audio file').setInputFiles({ name: 'Next reference.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('fixture') });
      await page.getByLabel('I have permission to upload and analyze this audio.').check();
      await page.getByRole('button', { name: 'Upload and analyze', exact: true }).click();
      await page.getByRole('progressbar', { name: 'Audio upload progress' }).waitFor();
      assert.equal(await page.getByText(/Not uploaded yet/).count(), 0, 'An active transfer must not say it has not uploaded');
      assert.equal(await page.getByRole('heading', { name: 'Ready to listen', exact: true }).count(), 0);
      state = 'processing'; stage = 'Estimating drums, bass, vocals and other stems';
      releaseUpload();
      await page.getByRole('heading', { name: 'Separating stems', exact: true }).waitFor();
      state = 'ready'; stage = undefined;
      await page.getByRole('heading', { name: 'Ready to listen', exact: true }).waitFor();
      assert.equal(uploads, 1);
      assert.equal(await page.getByRole('progressbar', { name: 'Audio upload progress' }).count(), 0);
      loseConfirmation = true;
      await page.getByLabel('Reference audio file').setInputFiles({ name: 'Lost connection.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('fixture') });
      await page.getByLabel('I have permission to upload and analyze this audio.').check();
      await page.getByRole('button', { name: 'Upload and analyze', exact: true }).click();
      await page.getByText(/Upload result unknown/).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Upload and analyze', exact: true }).isDisabled(), true);
      assert.equal(await page.getByText(/Not uploaded yet/).count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'Ready to listen', exact: true }).count(), 0, 'An old ready job must not replace an unknown new upload');
      await page.waitForTimeout(4500);
      assert.equal(uploads, 2, 'Never automatically re-upload after losing confirmation');
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`PASS ${width}px: job discovery without selection, processing stage/elapsed/check time, stale status recovery, ready CTA, failed state and confirmed upload transitions.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
