/* Streaming UI fixture. No provider calls or Ableton changes. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const errors = [];
      const messages = Array.from({ length: 18 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `History ${i}: ` + 'Earlier musical decisions. '.repeat(15) }));
      await context.addInitScript(({ messages }) => {
        localStorage.setItem('beatmind_token', 'fixture');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987690, subscribed: true }));
        localStorage.setItem('beatmind_chats_v2_987690', JSON.stringify({ activeId: 'scroll', chats: [{ id: 'scroll', title: 'Scroll fixture' }] }));
        localStorage.setItem('beatmind_chats_v2_987690_scroll', JSON.stringify({ messages, sessionId: 'scroll', project: null }));
        const original = window.fetch.bind(window);
        window.fetch = (input, init) => {
          if (String(input).endsWith('/api/chat/stream')) {
            return Promise.resolve(new Response(new ReadableStream({ start(controller) {
              window.emitChat = event => controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\n'));
              window.endChat = () => controller.close();
            } }), { headers: { 'Content-Type': 'application/x-ndjson' } }));
          }
          return original(input, init);
        };
      }, { messages });
      await context.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/auth/me') return reply({ id: 987690, subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/recordings') return reply({ recordings: [] });
        if (path === '/api/chats') return reply({ chats: [] });
        return route.fulfill({ status: 404, body: '' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3018') + '/dashboard');
      const timeline = page.getByRole('region', { name: 'Song conversation' });
      await timeline.waitFor().catch(async error => {
        await page.screenshot({ path: `/tmp/beatmind-chat-scroll-failed-${width}.png` });
        console.error({ url: page.url(), errors, body: (await page.locator('body').innerText()).slice(0, 2000) });
        throw error;
      });
      const atBottom = () => timeline.evaluate(e => e.scrollHeight - e.scrollTop - e.clientHeight <= 5);
      async function bottom() { await page.waitForFunction(() => { const e = document.querySelector('[aria-label="Song conversation"]'); return e && e.scrollHeight - e.scrollTop - e.clientHeight <= 5; }); }
      await bottom();
      await page.locator('#chat-input').fill('Add the same kick pattern. '.repeat(30));
      await page.waitForFunction(() => document.querySelector('#chat-input').offsetHeight >= 100);
      await page.locator('#chat-input').press('Enter');
      await page.waitForFunction(() => document.querySelector('#chat-input').offsetHeight < 70);
      await page.waitForFunction(() => !!window.emitChat);
      for (let i = 0; i < 3; i++) {
        await page.evaluate(i => window.emitChat({ type: 'narration', text: `Progress ${i}\n` + 'Verifying the existing kick and its timing.\n'.repeat(12) }), i);
        await bottom();
      }
      // Reading history must not be interrupted by later stream updates.
      await timeline.hover();
      await page.mouse.wheel(0, -700);
      await page.getByRole('button', { name: 'Jump to latest', exact: true }).waitFor();
      await page.waitForTimeout(150);
      const before = await timeline.evaluate(e => e.scrollTop);
      await page.evaluate(() => window.emitChat({ type: 'narration', text: 'Later progress\n'.repeat(30) }));
      await page.waitForTimeout(150);
      assert.ok(Math.abs(await timeline.evaluate(e => e.scrollTop) - before) < 5, 'Do not pull the user away from history');
      await page.getByRole('button', { name: 'Jump to latest', exact: true }).click();
      await bottom();
      await page.evaluate(() => {
        window.emitChat({ type: 'complete', response: 'Verified note timing.\n'.repeat(35) + '\nKick complete. Ready for review.', tool_calls: [] });
        window.endChat();
      });
      await page.getByText('Kick complete. Ready for review.', { exact: false }).waitFor();
      await bottom();
      // Media/recording layouts can grow without a new chat message or a parent render.
      await timeline.evaluate(e => {
        const media = document.createElement('div');
        media.dataset.testMedia = 'true'; media.style.height = '500px';
        e.firstElementChild.append(media);
      });
      await bottom();
      await timeline.evaluate(e => e.querySelector('[data-test-media]').remove());
      await bottom();
      assert.ok(await atBottom());
      assert.ok(await page.locator('#chat-input').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `/tmp/beatmind-chat-scroll-${width}.png` });
      console.log(`PASS ${width}px: Enter, streamed growth, completion, delayed media, history pause and jump-to-latest`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
