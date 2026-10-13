const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../out');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const base = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!base.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  const file = [base, base + '.html', path.join(base, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const user = { id: 987990, email: 'outbox@example.invalid', subscribed: true, subscription_status: 'active', plan_tier: 'pro' };
      const project = { title: 'Outbox QA', starting_point: 'idea', live_set: { title: 'QA fixture', choice: 'current' } };
      const queueKey = 'beatmind_outbox_v1_987990_qa-song';
      let connected = false, pending = [], calls = [], failNext = false;
      await context.addInitScript(({ user, project, width }) => {
        if (localStorage.getItem('fixture-seeded')) return;
        localStorage.setItem('fixture-seeded', '1');
        localStorage.setItem('beatmind_token', 'fixture-not-real');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem('beatmind_chats_v2_987990', JSON.stringify({ activeId: 'qa-song', chats: [{ id: 'qa-song', title: 'Outbox QA', sessionId: 'qa-song' }] }));
        localStorage.setItem('beatmind_chats_v2_987990_qa-song', JSON.stringify({ messages: [], sessionId: width === 390 ? null : 'qa-song', input: '', project: width === 390 ? null : project }));
      }, { user, project, width });
      await context.route('**/api/**', async route => {
        const req = route.request(), p = new URL(req.url()).pathname;
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (p === '/api/auth/me') return reply(user);
        if (p === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, songs_this_month: 1, songs_limit: 25, model_access: ['fast', 'pro'], features: { references: true } });
        if (p === '/api/bridge/status') return reply({ bridge_connected: connected, bridge_version: '1.3.18', live_set: 'QA fixture' });
        if (p === '/api/recordings') return reply({ recordings: [] });
        if (p === '/api/chats') return reply(req.method() === 'POST' ? { sessionId: 'qa-song', messages: [], project, referenceId: null } : { chats: [] });
        if (p === '/api/chats/qa-song') return reply({ sessionId: 'qa-song', messages: [], project, referenceId: null });
        if (p === '/api/chat/stream') {
          calls.push(req.postDataJSON());
          if (failNext) { failNext = false; return route.abort('failed'); }
          pending.push(() => route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'complete', response: `Fixture response ${calls.length}`, tool_calls: [] }) + '\n' }));
          return;
        }
        return reply({});
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const openChat = async () => {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
        await page.locator('#chat-input').waitFor();
      };
      const send = async text => { await page.locator('#chat-input').fill(text); await page.locator('#chat-input').press('Enter'); };
      const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), queueKey);
      await page.goto(`http://127.0.0.1:${server.address().port}/dashboard`);
      await openChat();
      await send('Build minimal techno at 124 BPM');
      await send('Keep bass dry, change tempo to 123 BPM');
      assert.equal(calls.length, 0, 'Offline instructions must not dispatch');
      assert.equal((await stored()).items.length, 2);
      await page.reload(); await openChat();
      assert.equal((await stored()).items.length, 2, 'Both instructions survive refresh');
      assert.equal(await page.locator('#chat-input').inputValue(), '', 'Queued instructions must not remain as a duplicate draft');
      assert.equal((await stored()).paused, true);
      connected = true;
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      const resume = page.getByRole('button', { name: 'Send unsent instructions', exact: true });
      await resume.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Send unsent instructions' && !b.disabled));
      await resume.click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).items.every(item => item.state === 'sending'), queueKey);
      await page.waitForTimeout(150);
      assert.equal(calls.length, 1);
      assert.match(calls[0].message, /124 BPM/); assert.match(calls[0].message, /123 BPM/);
      await send('Then add quiet water texture');
      await send('No vocals anywhere in this song');
      assert.equal(calls.length, 1, 'Steering waits for the active request');
      await pending.shift()();
      await page.getByText('Fixture response 1', { exact: true }).waitFor();
      await page.waitForTimeout(300);
      assert.equal(calls.length, 2, 'Saved steering uses a fresh callback exactly once');
      assert.match(calls[1].message, /water texture/); assert.match(calls[1].message, /No vocals/);
      await pending.shift()();
      await page.getByText('Fixture response 2', { exact: true }).waitFor();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).items.length === 0, queueKey);
      failNext = true;
      await send('Add hats, without repeating the kick');
      await page.getByText('Delivery uncertain; inspect chat and Ableton', { exact: true }).waitFor();
      assert.equal(calls.length, 3);
      await page.reload(); await openChat();
      await page.getByText('Delivery uncertain; inspect chat and Ableton', { exact: true }).waitFor();
      await page.waitForTimeout(400);
      assert.equal(calls.length, 3, 'No automatic replay after lost delivery or reload');
      assert.equal(await resume.isDisabled(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `/tmp/beatmind-outbox-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Remove saved instruction', exact: true }).click();
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); }; });
      await send('Keep this draft if storage is full');
      assert.equal(await page.locator('#chat-input').inputValue(), 'Keep this draft if storage is full');
      assert.equal(calls.length, 3);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, bridgeVersion: '1.3.18', offlineSave: 'passed', refresh: 'passed', steeringBatch: 'passed', noReplay: 'passed', storageFailure: 'passed' }));
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
