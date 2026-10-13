const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
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
  const importEnabled = process.env.BEATMIND_TEST_IMPORT_ENABLED !== '0';
  const backend = spawn(process.env.BEATMIND_TEST_PYTHON || 'python3', [path.resolve(__dirname, '../../backend/tests/remix_browser_server.py')], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BEATMIND_AUTOMATIC_REMIX_IMPORT_ENABLED: importEnabled ? '1' : '0' } });
  let browser, closing = false;
  const backendExit = new Promise(resolve => backend.once('exit', resolve));
  try {
    const port = await new Promise((resolve, reject) => {
      let buffer = '';
      const timeout = setTimeout(() => reject(new Error('Fixture server did not start')), Number(process.env.BEATMIND_TEST_STARTUP_TIMEOUT_MS || 30000));
      backend.once('error', e => { clearTimeout(timeout); reject(e); });
      backend.once('exit', code => { clearTimeout(timeout); reject(new Error(`Fixture server exited: ${code}`)); });
      backend.stdout.on('data', chunk => { buffer += chunk; if (buffer.includes('\n')) { clearTimeout(timeout); resolve(JSON.parse(buffer.split('\n')[0]).port); } });
      backend.stderr.on('data', chunk => process.stderr.write(chunk));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
      const calls = [], errors = [], id = 'e'.repeat(32);
      const user = { id: 987996, subscribed: true, subscription_status: 'active', plan_tier: 'pro' };
      await context.addInitScript(({ user, id }) => {
        localStorage.setItem('beatmind_token', 'synthetic-not-real'); localStorage.setItem('beatmind_user', JSON.stringify(user));
        if (localStorage.getItem('beatmind_chats_v2_987996')) return;
        localStorage.setItem('beatmind_chats_v2_987996', JSON.stringify({ activeId: 'original', chats: [{ id: 'original', title: 'Preserved song', sessionId: 'original' }] }));
        localStorage.setItem('beatmind_chats_v2_987996_original', JSON.stringify({ messages: [], sessionId: 'original', input: '',
          project: { title: 'Preserved song', starting_point: 'reference', live_set: null }, referenceId: id }));
      }, { user, id });
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()).pathname;
        if (req.method() === 'POST') calls.push(url);
        if (url.includes('/automatic-remixes')) {
          try {
            const response = await route.fetch({ url: `http://127.0.0.1:${port}${url}`, timeout: 60000 });
            return await route.fulfill({ response });
          } catch (error) {
            if (!closing) errors.push(`Fixture request failed: ${error.message}`);
            await route.abort().catch(() => {});
            return;
          }
        }
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (url === '/api/auth/me') return reply(user);
        if (url === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, model_access: ['fast', 'pro'] });
        if (url === '/api/bridge/status') return reply({ bridge_connected: false });
        if (url === '/api/recordings') return reply({ recordings: [] });
        if (url === '/api/chats') return reply({ chats: [] });
        if (url.startsWith('/api/chats/')) return reply({ sessionId: 'original', messages: [], referenceId: id,
          project: { title: 'Preserved song', starting_point: 'reference', live_set: null } });
        if (url.endsWith('/import-status')) return reply({ status: 'idle' });
        if (url === '/api/references') return reply({ available: true, local_separation: { available: false }, references: [{ id,
          name: 'Synthetic.wav', created_at: '2026-10-13', status: 'ready', report: { duration_seconds: 8, tempo: { bpm: 120 }, waveform: [0.1],
            key_candidates: [], stems: [{ name: 'drums' }, { name: 'bass' }], possible_change_points_seconds: [], limitations: [] } }] });
        return reply({});
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${process.env.BEATMIND_TEST_SITE_URL || `http://127.0.0.1:${server.address().port}`}/dashboard`);
      const references = () => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true });
      await references().click();
      await page.getByRole('button', { name: 'Automatic Remix', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Automatic Remix', exact: true });
      const revise = dialog.getByRole('button', { name: 'Revise choices and render a new preview' });
      await dialog.getByRole('status').or(dialog.getByLabel('Remix name')).first().waitFor();
      if (width === 390) { await revise.waitFor(); await revise.click(); }
      await dialog.getByLabel('Remix name', { exact: true }).fill(`Automatic test ${width}`);
      await dialog.getByLabel('Target BPM', { exact: true }).fill('125');
      await dialog.getByRole('button', { name: 'Move section 2 up', exact: true }).click();
      await dialog.getByLabel('Section 1 Bass dB', { exact: true }).fill('-6');
      await dialog.getByRole('checkbox', { name: /I have the rights/ }).check();
      const render = dialog.getByRole('button', { name: 'Render preview', exact: true });
      await page.screenshot({ path: `/tmp/beatmind-automatic-choices-${width}.png` });
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await render.click();
      await dialog.getByRole('button', { name: 'Play remix preview', exact: true }).waitFor({ timeout: 120000 });
      const approve = dialog.getByRole('button', { name: 'Approve preview', exact: true });
      assert.equal(await approve.isDisabled(), true);
      await dialog.getByRole('button', { name: 'Play remix preview', exact: true }).click();
      try { await page.waitForFunction(() => { const audio = document.querySelector('audio[aria-label="Remix preview"]'); return audio && !audio.paused && audio.currentTime > 1; }); }
      catch (error) {
        console.log(await page.locator('audio[aria-label="Remix preview"]').evaluate(a => ({ paused: a.paused, time: a.currentTime, ready: a.readyState, error: a.error?.message, duration: a.duration })));
        console.log(await dialog.getByRole('alert').allTextContents());
        await page.screenshot({ path: '/tmp/beatmind-automatic-playback-failure.png' }); throw error;
      }
      const signal = await page.locator('audio[aria-label="Remix preview"]').evaluate(async audio => {
        const bytes = await (await fetch(audio.src)).arrayBuffer(); const ctx = new AudioContext();
        try { const buffer = await ctx.decodeAudioData(bytes); let peak = 0; for (const v of buffer.getChannelData(0)) peak = Math.max(peak, Math.abs(v)); return { duration: buffer.duration, peak }; }
        finally { await ctx.close(); }
      });
      assert.ok(signal.duration > 7 && signal.duration < 8 && signal.peak > .01 && signal.peak < .95);
      await approve.click();
      await dialog.getByRole('button', { name: 'Preview approved', exact: true }).waitFor();
      const downloadEvent = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download aligned stems', exact: true }).click();
      const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      assert.ok(fs.readFileSync(await download.path()).subarray(0, 2).equals(Buffer.from('PK')));
      if (importEnabled) {
        await dialog.getByRole('button', { name: 'Check Ableton destination', exact: true }).click();
        await dialog.getByText('Connect a Bridge with approved-remix import support.', { exact: false }).waitFor();
      } else {
        await dialog.getByText('Ableton import is not enabled in this release.', { exact: false }).waitFor();
        assert.equal(await dialog.getByRole('button', { name: 'Check Ableton destination', exact: true }).count(), 0);
      }
      assert.equal(await dialog.getByRole('button', { name: 'Send approved remix to Ableton', exact: true }).count(), 0);
      await page.screenshot({ path: `/tmp/beatmind-automatic-preview-${width}.png` });
      if (width === 390) {
        await dialog.getByRole('button', { name: 'Play remix preview', exact: true }).click();
        const older = await dialog.getByRole('combobox').locator('option').last().getAttribute('value');
        await dialog.getByRole('combobox').selectOption(older);
        await page.waitForFunction(() => {
          const audio = document.querySelector('audio[aria-label="Remix preview"]');
          return audio && audio.paused && !audio.getAttribute('src');
        });
      }
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload(); await references().click();
      await page.getByRole('button', { name: 'Automatic Remix', exact: true }).click();
      await dialog.getByRole('button', { name: 'Preview approved', exact: true }).waitFor();
      assert.equal(calls.filter(url => url.endsWith('/automatic-remixes')).length, 1, 'Reload cannot start another render');
      assert.equal(calls.some(url => /\/import$|import-to-ableton|live-set|chat\/stream/.test(url)), false);
      assert.deepEqual(errors, []);
      console.log(`PASS automatic remix ${width}px: real renderer, audible decoded preview, explicit approval, aligned-stem ZIP, reload, no Ableton commands`);
      await context.close();
    }
  } finally {
    closing = true;
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    backend.kill('SIGTERM'); await backendExit;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
