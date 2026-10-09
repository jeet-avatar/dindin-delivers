/* A long production chat must open and keep saving even when it no longer fits in browser storage. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const reply = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (path === '/api/auth/me') return reply({ id: 987680, email: 'long@example.invalid', subscribed: true });
      if (path === '/api/bridge/status') return reply({ bridge_connected: true });
      if (path === '/api/recordings') return reply({ recordings: [] });
      if (path === '/api/chats') return reply({ chats: [] });
      if (path === '/api/references') return reply({ references: [] });
      if (path.startsWith('/api/chats/')) return reply({ messages: [], sessionId: 'long-song', project: null, referenceId: null });
      return route.fulfill({ status: 404, body: '' });
    });
    await context.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('beatmind_token', 'fixture');
      localStorage.setItem('beatmind_user', JSON.stringify({ id: 987680, email: 'long@example.invalid', subscribed: true }));
      const trace = 'x'.repeat(20000);
      const messages = [];
      for (let i = 0; i < 90; i++) {
        messages.push({ id: `u${i}`, role: 'user', content: `Step ${i}` });
        messages.push({ id: `a${i}`, role: 'assistant', content: `Done step ${i}`, toolCalls: [{ tool: 'write_clip_automation', input: {},
          result: { status: 'verified', summary: 'ok', steps: [{ trace }], detail: trace } }] });
      }
      const prefix = 'beatmind_chats_v2_987680';
      const recent = JSON.stringify({ messages: messages.slice(-60), sessionId: 'long-song', input: '' });  // about 2.4M chars
      localStorage.setItem(prefix, JSON.stringify({ activeId: 'long', chats: [{ id: 'long', title: 'Long song', sessionId: 'long-song' }] }));
      localStorage.setItem(`${prefix}_long`, recent);
      localStorage.setItem('beatmind_chat_v1_987680', recent);
    });
    const page = await context.newPage();
    await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
    await page.getByText('Done step 89').first().waitFor({ timeout: 15000 }).catch(async e => { await page.screenshot({ path: process.env.SHOT || '/dev/null' }); console.log((await page.locator('body').innerText()).slice(0, 1500)); throw e; });
    await page.getByPlaceholder('Message BeatMind...').fill('draft that must save');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    assert.doesNotMatch(body, /exceeded the quota|could not be saved/);
    const stored = await page.evaluate(() => ({ legacy: localStorage.getItem('beatmind_chat_v1_987680'),
      chat: localStorage.getItem('beatmind_chats_v2_987680_long') }));
    assert.equal(stored.legacy, null);
    const saved = JSON.parse(stored.chat);
    assert.ok(stored.chat.length <= 1000000, `stored ${stored.chat.length} chars`);
    assert.equal(saved.input, 'draft that must save');
    assert.equal(saved.messages.at(-1).content, 'Done step 89');
    assert.equal(saved.messages.at(-1).toolCalls[0].result.steps, undefined);
    console.log(`chat storage ok: ${saved.messages.length} messages, ${stored.chat.length} chars`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
