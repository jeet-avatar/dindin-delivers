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
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const id = 'e'.repeat(32), calls = [], errors = [], user = { id: 987995, subscribed: true, subscription_status: 'active', plan_tier: 'pro' };
      const project = { title: 'Original preserved', starting_point: 'reference', live_set: null };
      let saved = null, reject = true;
      await context.addInitScript(({ user, project, id }) => {
        if (localStorage.getItem('beatmind_chats_v2_987995')) return;
        localStorage.setItem('beatmind_token', 'fixture-not-real');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem('beatmind_chats_v2_987995', JSON.stringify({ activeId: 'original', chats: [{ id: 'original', title: project.title, sessionId: 'original' }] }));
        localStorage.setItem('beatmind_chats_v2_987995_original', JSON.stringify({ messages: [], sessionId: 'original', input: 'Original draft', project, referenceId: id }));
      }, { user, project, id });
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()).pathname;
        const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (req.method() === 'POST') calls.push({ url, body: req.postDataJSON() });
        if (url === '/api/chats/remix') {
          if (reject) return reply({ detail: 'Temporary save error. Retry the same request.' }, 503);
          const body = req.postDataJSON();
          saved = { sessionId: 'remix_' + body.request_id, referenceId: id, project: { title: body.title,
            starting_point: 'reference', mode: 'remix', live_set: null, remix: { source_name: 'Synthetic reference.wav',
              style: body.style, target_bpm: body.target_bpm, layers: body.layers, execution_status: 'unavailable' } } };
          return reply(saved);
        }
        if (url === '/api/auth/me') return reply(user);
        if (url === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, features: { references: true }, model_access: ['fast', 'pro'] });
        if (url === '/api/bridge/status') return reply({ bridge_connected: false });
        if (url === '/api/recordings') return reply({ recordings: [] });
        if (url === '/api/chats') return reply({ chats: [] });
        if (url.startsWith('/api/chats/')) return reply(url.includes('/remix_') ? { ...saved, messages: [] } : { sessionId: 'original', messages: [], project, referenceId: id });
        if (url.endsWith('/import-status')) return reply({ status: 'idle' });
        if (url === '/api/references') return reply({ available: true, local_separation: { available: false }, references: [{ id,
          name: 'Synthetic reference.wav', created_at: '2026-10-13', status: 'ready', report: { duration_seconds: 8,
            tempo: { bpm: 124 }, waveform: [0.1], key_candidates: [], stems: ['drums', 'bass', 'vocals', 'other'].map(name => ({ name })),
            possible_change_points_seconds: [], limitations: [] } }] });
        return reply({});
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || `http://127.0.0.1:${server.address().port}`) + '/dashboard');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      const button = page.getByRole('button', { name: 'Remix this reference', exact: true });
      await button.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-remix-button-${width}.png` });
      await button.click();
      const dialog = page.getByRole('dialog', { name: 'Plan a remix' });
      const submit = dialog.getByRole('button', { name: 'Save remix plan and open chat' });
      const submitBounds = await submit.boundingBox();
      assert.ok(submitBounds && submitBounds.y >= 0 && submitBounds.y + submitBounds.height <= 900, 'Save action stays in the viewport');
      assert.equal(await submit.isDisabled(), true);
      await dialog.getByLabel('Remix name', { exact: true }).fill('My deep minimal remix');
      await dialog.getByLabel('Target style', { exact: true }).fill('Deep minimal techno');
      await dialog.getByLabel('Bass choice', { exact: true }).selectOption('retain');
      await dialog.getByLabel('Drums choice', { exact: true }).selectOption('replace');
      await dialog.getByRole('checkbox').check();
      await dialog.getByLabel('Publication or distribution', { exact: true }).check();
      assert.equal(await dialog.getByRole('checkbox').isChecked(), false);
      await dialog.getByLabel('Private project only', { exact: true }).check();
      await dialog.getByRole('checkbox').check();
      await submit.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-remix-dialog-${width}.png` });
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await submit.click();
      await dialog.getByRole('alert').filter({ hasText: 'Temporary save error' }).waitFor();
      reject = false;
      await submit.click();
      await page.getByRole('region', { name: 'Saved remix plan' }).waitFor();
      const saves = calls.filter(c => c.url === '/api/chats/remix');
      assert.equal(saves.length, 2);
      assert.equal(saves[0].body.request_id, saves[1].body.request_id);
      assert.deepEqual(saves[1].body.layers, { drums: 'replace', bass: 'retain', vocals: 'omit', other: 'omit' });
      assert.equal(calls.some(c => /import-to-ableton|local-open|live-set|chat\/stream/.test(c.url)), false, 'Planning cannot send music or AI requests');
      const old = await page.evaluate(() => JSON.parse(localStorage.getItem('beatmind_chats_v2_987995_original')));
      assert.equal(old.project.title, 'Original preserved');
      assert.equal(await page.locator('#chat-input').inputValue(), 'Review my saved remix plan. Ask me about the retained source layers and replacement sounds one step at a time. Do not change Ableton.');
      await page.reload();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      await page.getByRole('region', { name: 'Saved remix plan' }).waitFor();
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS remix ${width}px: visible action, consent, choices, idempotent retry, separate saved chat, no music writes, reload`);
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
