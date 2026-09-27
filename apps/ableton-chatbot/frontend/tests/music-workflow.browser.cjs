const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function wave() {
  const count = 8000, buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) buffer.writeInt16LE(Math.round(Math.sin(i * Math.PI / 40) * 2000), 44 + i * 2);
  return buffer;
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const id = 'a'.repeat(32);
      let available = false, initialRead = false, decisions = 0, chats = [];
      let recording = { id, track_name: 'Kick', track: 0, scene: 0, source: 'QA fixture',
        created_at: '2099-01-01T00:00:00Z', decision: 'pending', metrics: { duration_seconds: 1, peak_dbfs: -12, waveform: [0.1, 0.2] } };
      await context.addInitScript(({ id }) => {
        localStorage.setItem('beatmind_token', 'fixture-not-a-token');
        localStorage.setItem('beatmind_user', JSON.stringify({ id: 987654, email: 'fixture@example.invalid', subscribed: true }));
        if (!localStorage.getItem('beatmind_chats_v2_987654')) {
          localStorage.setItem('beatmind_chats_v2_987654', JSON.stringify({ activeId: 'qa', chats: [{ id: 'qa', title: 'Kick' }] }));
          localStorage.setItem('beatmind_chats_v2_987654_qa', JSON.stringify({ sessionId: 'qa', input: '', messages: [
            { role: 'assistant', content: 'Your kick preview is ready.', toolCalls: [{ tool: 'audition_part', input: {}, result: { status: 'verified', recording: { id } } }] },
          ] }));
        }
        window.__plays = 0;
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () { window.__plays++; return play.call(this); };
      }, { id });
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (path === '/api/auth/me') return reply({ id: 987654, email: 'fixture@example.invalid', subscribed: true });
        if (path === '/api/bridge/status') return reply({ bridge_connected: true });
        if (path === '/api/chats') return reply({ chats: [] });
        if (path === '/api/references') return reply({ references: [], available: true, audio_listening: { available: true } });
        if (path === '/api/recordings') { initialRead = true; return reply({ recordings: available ? [recording] : [] }); }
        if (path === `/api/recordings/${id}/audio`) return route.fulfill({ contentType: 'audio/wav', body: wave() });
        if (path === `/api/recordings/${id}/decision`) {
          decisions++; recording = { ...recording, decision: 'accepted' };
          return reply({ ...recording, continuation: { session_id: 'qa', message: 'Legacy automatic continuation MUST NOT run.' } });
        }
        if (path === `/api/recordings/${id}`) return reply(available ? recording : {}, available ? 200 : 404);
        if (path === '/api/chat/stream') {
          chats.push(route.request().postDataJSON());
          return route.fulfill({ contentType: 'application/x-ndjson', body:
            JSON.stringify({ type: 'session', session_id: 'qa' }) + '\n' +
            JSON.stringify({ type: 'complete', response: 'Which part would you like next?', tool_calls: [] }) + '\n' });
        }
        throw Error('Unexpected API request: ' + route.request().method() + ' ' + path);
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
      await page.getByText('A linked recording is not available yet.', { exact: true }).waitFor();
      assert.equal(initialRead, true);
      await page.waitForTimeout(100);
      available = true;
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.getByRole('button', { name: 'Accept sound', exact: true }).waitFor();
      await page.waitForFunction(() => window.__plays === 1);
      await page.getByRole('button', { name: 'Accept sound', exact: true }).click();
      await page.getByText('Kick accepted. What would you like to do next?', { exact: true }).waitFor();
      assert.equal(decisions, 1);
      assert.equal(chats.length, 0, 'Accept must not submit a chat request');
      assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
      for (const name of ['Home', 'BeatMind']) {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
      }
      await page.locator('audio').waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(() => window.__plays), 1, 'Accepted audio must not replay on remount');
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Keep it and move on', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__plays), 0, 'Reload must preserve approval without replaying');
      await page.getByRole('button', { name: 'Keep it and move on', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Stop production"]'));
      assert.equal(chats.length, 1);
      assert.equal(chats[0].planning_only, true);
      assert.equal(chats[0].message, 'Keep Kick as it is. Which part should we choose next?');
      await page.getByText('Which part would you like next?', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'New chat', exact: true }).click();
      await page.getByRole('heading', { name: 'How would you like to start?' }).waitFor();
      await page.getByRole('button', { name: 'Use a reference track', exact: true }).click();
      await page.getByLabel('Reference audio file').waitFor();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      await page.getByRole('button', { name: 'Start from an idea', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Stop production"]'));
      assert.equal(chats.length, 2);
      assert.equal(chats[1].planning_only, true);
      assert.match(chats[1].message, /without a reference/);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-guided-workflow-${width}.png` });
      console.log(`PASS ${width}px: preview once, acceptance pauses without chat, remount silent, explicit next choice discussion-only, reference/idea routes`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
