/* A tool result whose notes lack a field (set_note_feel reports no duration) must render, not crash the page. */
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
      const prefix = 'beatmind_chats_v2_987680';
      const messages = [{ id: 'u1', role: 'user', content: 'Humanize the Drop' },
        { id: 'a1', role: 'assistant', content: 'Nudged the clap.', toolCalls: [{ tool: 'set_note_feel', input: { track: 1, scene: 4, pitches: [39] },
          result: { status: 'verified', summary: '16 note(s) changed: nudged +5.0 ms', notes: [{ pitch: 39, start: 1.01, probability: 1 }] } }] }];
      localStorage.setItem(prefix, JSON.stringify({ activeId: 'feel', chats: [{ id: 'feel', title: 'Feel', sessionId: 'feel-song' }] }));
      localStorage.setItem(`${prefix}_feel`, JSON.stringify({ messages, sessionId: 'feel-song', input: '' }));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
    await page.getByText('Nudged the clap.').first().waitFor({ timeout: 15000 });
    await page.getByText('Technical history', { exact: false }).first().click().catch(() => {});
    await page.waitForTimeout(1500);
    assert.deepEqual(errors, []);
    assert.doesNotMatch(await page.locator('body').innerText(), /Application error/);
    console.log('note table with missing fields renders without errors');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
