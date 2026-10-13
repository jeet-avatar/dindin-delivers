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
      const project = { title: 'My minimal remix', mode: 'remix', starting_point: 'reference', live_set: null,
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
      let failNext = false;
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/bridge/latest.json', route => route.fulfill({ contentType: 'application/json', body: '{"version":"1.3.19"}' }));
      await context.route('**/api/**', async route => {
        const request = route.request(), pathname = new URL(request.url()).pathname;
        if (request.method() === 'POST') writes.push({ pathname, body: request.postDataJSON() });
        const reply = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
        if (pathname === '/api/auth/me') return reply(user);
        if (pathname === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, model_access: ['fast', 'pro'] });
        if (pathname === '/api/bridge/status') return reply({ bridge_connected: width > 400, bridge_version: '1.3.19' });
        if (pathname === '/api/recordings') return reply({ recordings: [] });
        if (pathname === '/api/chats') return reply({ chats: [{ id: sessionId, title: project.title }] });
        if (pathname.startsWith('/api/chats/')) return reply(saved);
        if (pathname.endsWith('/automatic-remixes')) {
          const job = id => ({ id, title: id === jobId ? 'This song preview' : 'Unrelated newer preview', status: 'ready', stage: 'Ready', review: 'accepted',
            project: { sessionId, referenceId, project }, recipe: { target_bpm: 124, segments: [] },
            result: { duration_seconds: 8, lufs: -16, true_peak_dbtp: -1, files: { mix: { sha256: 'd'.repeat(64) } }, limitations: [] } });
          return reply({ available: true, ableton_import_available: false, timing: { bpm: 124, sections: [] }, stems: ['drums', 'bass'],
            jobs: [job('e'.repeat(32)), job(jobId)] });
        }
        if (pathname === '/api/chat/stream') {
          const events = [{ type: 'session', session_id: sessionId, project, referenceId },
            { type: 'status', message: 'Reviewing your remix request...' },
            failNext ? { type: 'error', message: 'The AI provider did not finish this step within 90 seconds. No Ableton actions were started.' }
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
      assert.ok(box.height >= height * .5, `Conversation has ${box.height}px of ${height}px`);
      const input = page.getByRole('textbox', { name: 'Message BeatMind' });
      assert.ok((await input.boundingBox()).height >= 70);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.getByRole('button', { name: 'Open Ableton', exact: true }).isVisible(), false);
      await page.getByLabel('Song settings', { exact: true }).click();
      await page.getByRole('button', { name: 'Open Ableton', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Open BeatMind Bridge' }).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByLabel('Song settings', { exact: true }).click();
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
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      assert.equal(writes.length, 2);
      assert.ok(writes.every(item => item.pathname === '/api/chat/stream'));
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS remix chat ${width}x${height}: conversation >=50%, readable composer, settings, response/error, exact preview, no music writes`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
