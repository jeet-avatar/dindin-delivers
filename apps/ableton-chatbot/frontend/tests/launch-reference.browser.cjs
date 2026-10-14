/* Production assets, isolated API fixtures: no accounts, music or provider requests are changed. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = process.env.BEATMIND_UI_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const id = 'a'.repeat(32), errors = [], calls = [];
      const user = { id: 987981, subscribed: true, subscription_status: 'active', plan_tier: 'studio' };
      const project = { title: 'Launch reference audit', starting_point: 'reference', live_set: null };
      const reference = { id, name: 'Launch reference.wav', status: 'ready', created_at: '2026-10-13',
        timing: { analysis_id: 'fixture', revision: 0, status: 'suggested', bpm: 124, numerator: 4, denominator: 4,
          sections: [{ name: 'Intro', start_seconds: 0, end_seconds: 30 }] },
        stem_review: { analysis_id: 'fixture', status: 'pending', decisions: {} },
        report: { duration_seconds: 30, tempo: { bpm: 124 }, waveform: [0.1, 0.3], key_candidates: [],
          stems: ['drums', 'bass', 'vocals', 'other'].map(name => ({ name })), possible_change_points_seconds: [], limitations: [],
          stem_health: { checks_passed: true, stems: Object.fromEntries(['drums', 'bass', 'vocals', 'other'].map(name =>
            [name, { aligned: true, finite: true, quiet: false, rms_dbfs: -20, clipped_sample_fraction: 0 }])) } } };
      await context.addInitScript(({ user, project, id }) => {
        localStorage.setItem('beatmind_token', 'synthetic-not-real');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem('beatmind_chats_v2_987981', JSON.stringify({ activeId: 'launch', chats: [{ id: 'launch', sessionId: 'launch', title: project.title }] }));
        localStorage.setItem('beatmind_chats_v2_987981_launch', JSON.stringify({ messages: [], sessionId: 'launch', project, referenceId: id, input: '' }));
      }, { user, project, id });
      await context.route('**/release.json', route => route.fulfill({ json: {} }));
      await context.route('**/bridge/latest.json', route => route.fulfill({ json: { version: '1.3.20' } }));
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        calls.push({ path, method: req.method() });
        const reply = (json, status = 200) => route.fulfill({ json, status });
        if (path === '/api/auth/me') return reply(user);
        if (path === '/api/stripe/usage') return reply({ plan: { plan: 'studio', tier: 'studio', source: 'subscription', status: 'active' },
          model_access: ['fast', 'pro', 'ultra'], features: { references: true, cloud_hq: true } });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true, bridge_version: '1.3.20' });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path.startsWith('/api/chats/')) return reply({ sessionId: 'launch', project, referenceId: id, messages: [] });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/references') return reply({ references: [reference], available: true,
          local_separation: { available: true }, cloud_separation: { available: true }, audio_listening: { available: true },
          max_bytes: 262144000, min_seconds: 5, max_seconds: 600 });
        if (path === '/api/references/local') return reply({ detail: 'Finder permission is required on your Mac.' }, 409);
        if (path.endsWith('/listen-whole')) {
          const body = req.postDataJSON();
          assert.equal(body.consent, true);
          assert.equal(body.intent, 'Keep the groove but create original bass sounds.');
          return reply({ detail: 'Listening temporarily unavailable. Please retry later.' }, 503);
        }
        if (path.endsWith('/comparisons')) return reply({ comparisons: [], available: true });
        if (path.endsWith('/import-status')) return reply({ status: 'idle' });
        throw new Error('Unexpected API request: ' + path);
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(site + '/dashboard');
      const nav = page.getByRole('navigation', { name: 'Main navigation' });
      for (const name of ['Dashboard', 'BeatMind', 'Recordings', 'Downloads', 'References']) {
        await nav.getByRole('button', { name, exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      await page.getByRole('button', { name: 'Automatic Remix', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Remix this reference', exact: true }).waitFor();
      const local = page.getByLabel('Separate on this computer', { exact: true });
      const choose = local.getByRole('button', { name: 'Choose a track on this computer', exact: true });
      assert.equal(await choose.isDisabled(), true);
      await local.getByRole('checkbox').check();
      await choose.click();
      await local.getByRole('alert').filter({ hasText: 'Finder permission' }).waitFor();
      const file = page.getByLabel('Reference audio file', { exact: true });
      assert.equal(await file.isEnabled(), true);
      await file.setInputFiles({ name: 'Selected only.wav', mimeType: 'audio/wav', buffer: Buffer.from('Not uploaded') });
      await page.getByText(/Selected file: Selected only.wav/).waitFor();
      assert.equal(calls.some(c => c.path.includes('cloud-upload') && c.method === 'POST'), false);
      await page.getByRole('button', { name: 'Choose a saved reference', exact: true }).click();
      await page.getByLabel('Saved references', { exact: true }).getByRole('button', { name: 'Launch reference.wav ready', exact: true }).click();
      await page.getByRole('button', { name: 'Listen to stems', exact: true }).click();
      await page.getByRole('tab', { name: '1. Stems', exact: true }).waitFor({ state: 'visible' });
      await page.getByRole('tab', { name: '4. Template', exact: true }).click();
      await page.getByText('Template prerequisites pending: stem review, timing confirmation.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Review stems', exact: true }).click();
      assert.equal(await page.getByRole('tab', { name: '1. Stems', exact: true }).getAttribute('aria-selected'), 'true');
      await page.getByRole('tab', { name: '3. Listening', exact: true }).click();
      await page.getByLabel('What do you want from this reference?').fill('Keep the groove but create original bass sounds.');
      const send = page.getByRole('button', { name: 'Send listening request', exact: true });
      await send.click();
      await page.getByRole('alert').filter({ hasText: 'Your permission' }).waitFor();
      assert.equal(calls.filter(c => c.path.endsWith('/listen-whole')).length, 0);
      await page.getByLabel(/Send this whole track and my intent to OpenAI/).check();
      await send.click();
      await page.getByRole('alert').filter({ hasText: 'Listening temporarily unavailable' }).waitFor();
      assert.equal(calls.filter(c => c.path.endsWith('/listen-whole')).length, 1);
      await page.getByRole('button', { name: 'Check listening status', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Checking request status', exact: true }).isDisabled(), true);
      await page.screenshot({ path: `/tmp/beatmind-launch-reference-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      console.log(`PASS launch reference ${width}px: current navigation, remix entry points, file selection, local permission error, prerequisites, listening consent/submission/error recovery`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
