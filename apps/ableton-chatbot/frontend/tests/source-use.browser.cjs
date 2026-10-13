const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
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
    for (const width of [1440, 390]) for (const storage of ['cloud', 'local']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const id = 'e'.repeat(32), calls = [], errors = [];
      const user = { id: 987995, subscribed: true, subscription_status: 'active', plan_tier: 'pro' };
      const project = { title: 'Rights check', starting_point: 'reference', live_set: null };
      let ready = false, importStatus = { status: 'idle' };
      await context.addInitScript(({ user, project, id }) => {
        localStorage.setItem('beatmind_token', 'fixture-not-real');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem('beatmind_chats_v2_987995', JSON.stringify({ activeId: 'rights-test', chats: [{ id: 'rights-test', title: project.title, sessionId: 'rights-test' }] }));
        localStorage.setItem('beatmind_chats_v2_987995_rights-test', JSON.stringify({ messages: [], sessionId: 'rights-test', input: '', project, referenceId: id }));
      }, { user, project, id });
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()).pathname;
        const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (req.method() === 'POST') calls.push({ url, body: req.postDataJSON() });
        if (url === '/api/auth/me') return reply(user);
        if (url === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, features: { references: true }, model_access: ['fast', 'pro'] });
        if (url === '/api/bridge/status') return reply({ bridge_connected: true, bridge_version: '1.3.19', live_set: 'Disposable QA' });
        if (url === '/api/recordings') return reply({ recordings: [] });
        if (url === '/api/chats') return reply({ chats: [] });
        if (url.startsWith('/api/chats/')) return reply({ sessionId: 'rights-test', messages: [], project, referenceId: id });
        if (url === '/api/references') return reply({ available: true, max_bytes: 262144000, min_seconds: 5, max_seconds: 600,
          local_separation: { available: true }, references: [{ id, name: 'Reference rights fixture.wav', storage,
            created_at: '2026-10-13', status: ready ? 'ready' : 'processing', report: ready ? {
              duration_seconds: 10, tempo: { bpm: 124 }, waveform: [0.2], key_candidates: [],
              stems: ['drums', 'bass', 'vocals', 'other'].map(name => ({ name })), possible_change_points_seconds: [], limitations: [],
            } : undefined }] });
        if (url.endsWith('/import-to-ableton')) return reply({ detail: 'Fixture: Bridge unavailable. No stems placed.' }, 409);
        if (url.endsWith('/import-status')) return reply(importStatus);
        return reply({});
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.BEATMIND_UI_URL || `http://127.0.0.1:${server.address().port}`) + '/dashboard');
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('heading', { name: 'Reference rights fixture.wav', exact: true }).waitFor();
      ready = true;
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await page.getByText('Stems are ready', { exact: true }).waitFor();
      const imports = () => calls.filter(c => c.url.endsWith('/import-to-ableton') || c.url.endsWith('/local-open'));
      assert.equal(imports().length, 0, 'Processing completion must not import audio');
      const choose = page.getByRole('button', { name: 'Choose a track on this computer', exact: true });
      assert.equal(await choose.isDisabled(), true, 'Local analysis needs its own permission');
      const button = page.getByRole('button', { name: storage === 'local' ? 'Place stems in Ableton' : 'Send all stems to Ableton', exact: true });
      await button.click();
      const dialog = page.getByRole('dialog', { name: 'Use reference audio in Ableton' });
      const confirm = dialog.getByRole('button', { name: 'Confirm and place stems' });
      const rights = dialog.getByRole('checkbox');
      assert.equal(await confirm.isDisabled(), true);
      await rights.check();
      await dialog.getByLabel('Publication or distribution', { exact: true }).check();
      assert.equal(await rights.isChecked(), false, 'Changing use invalidates confirmation');
      await rights.check();
      await page.screenshot({ path: `/tmp/beatmind-source-use-${storage}-${width}.png` });
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(imports().length, 0);
      assert.equal(await button.evaluate(el => document.activeElement === el), true);
      await button.click();
      assert.equal(await rights.isChecked(), false, 'Cancelled permission cannot be reused');
      assert.equal(await dialog.getByLabel('Private project only', { exact: true }).isChecked(), true);
      await rights.check();
      await confirm.click();
      await page.getByRole('alert').filter({ hasText: 'Fixture: Bridge unavailable' }).waitFor();
      assert.equal(imports().length, 1);
      assert.deepEqual(imports()[0].body.source_use, { rights_confirmed: true, intended_use: 'private' });
      assert.ok(imports()[0].url.includes(id));
      assert.match(imports()[0].body.operation_id, /^[a-f0-9]{32}$/);
      importStatus = { status: 'needs_inspection', error: 'Saved import needs inspection. Do not repeat the import.' };
      await page.reload();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Saved import needs inspection' }).waitFor();
      assert.equal(imports().length, 1, 'Reload must read the saved status, never repeat a music write');
      await page.screenshot({ path: `/tmp/beatmind-import-recovery-${storage}-${width}.png` });
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${storage} ${width}px: explicit consent, scoped request identity, saved interruption visible after reload without repeated import`);
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
