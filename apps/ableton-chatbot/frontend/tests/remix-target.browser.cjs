/* Isolated API fixtures only: never opens or changes a real Ableton set. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[1440, 900], [390, 667], [320, 568], [768, 600], [1100, 600]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const user = { id: 987970, subscribed: true }, referenceId = 'a'.repeat(32);
      const prefix = `beatmind_chats_v2_${user.id}`;
      const chats = ['first', 'second'].map(id => ({ sessionId: id, messages: [], referenceId, input: '',
        project: { title: `${id} remix`, mode: 'remix', starting_point: 'reference', live_set: { title: 'QA set' },
          remix: { source_name: 'Fixture.wav', style: 'Minimal', target_bpm: 124 } } }));
      chats.push({ sessionId: 'ordinary', messages: [], referenceId: null, input: '',
        project: { title: 'ordinary song', starting_point: 'idea', live_set: { title: 'QA set' } } });
      await context.addInitScript(({ user, prefix, chats }) => {
        localStorage.setItem('beatmind_token', 'synthetic');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        if (!localStorage.getItem(prefix)) {
          localStorage.setItem(prefix, JSON.stringify({ activeId: 'first', chats: chats.map(c =>
            ({ id: c.sessionId, sessionId: c.sessionId, title: c.project.title })) }));
          chats.forEach(c => localStorage.setItem(`${prefix}_${c.sessionId}`, JSON.stringify(c)));
        }
      }, { user, prefix, chats });
      const writes = [], errors = [];
      let connected = true;
      let holdReply = false, finishReply;
      await context.route('**/release.json', r => r.fulfill({ json: {} }));
      await context.route('**/bridge/latest.json', r => r.fulfill({ json: { version: '1.3.20' } }));
      await context.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() });
        if (path === '/api/chat/stream') {
          if (holdReply) await new Promise(resolve => { finishReply = resolve; });
          return route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({
            type: 'complete', response: 'Fixture response; no real Ableton actions.', tool_calls: [] }) + '\n' });
        }
        const json = path === '/api/auth/me' ? user
          : path === '/api/stripe/usage' ? require('./fixtures/usage.cjs')
          : path === '/api/bridge/status' ? { bridge_connected: connected, bridge_version: '1.3.20', live_set: { title: 'QA set' } }
          : path === '/api/chats' ? { chats: width > 400 ? chats.map(c => ({ id: c.sessionId, title: c.project.title })) : [] }
          : path.startsWith('/api/chats/') ? chats.find(c => path.endsWith('/' + c.sessionId))
          : path === '/api/recordings' ? { recordings: [] } : {};
        return route.fulfill({ json: json || {} });
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const goToChat = async () => {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
        await page.getByLabel('Command mode').waitFor();
      };
      const switchChat = async name => {
        if (width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
        await page.getByRole('region', { name: 'Saved songs' }).getByRole('button', { name: `Open saved song: ${name}`, exact: true }).click();
        await page.waitForFunction(label => [...document.querySelectorAll('[aria-current="true"]')]
          .some(element => element.getAttribute('aria-label') === label), `Open saved song: ${name}`);
      };
      const mode = page.getByRole('combobox', { name: 'Command mode', exact: true });
      await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3000') + '/dashboard');
      await goToChat();
      const composer = page.getByLabel('Message composer', { exact: true });
      const timeline = page.getByRole('region', { name: 'Song conversation', exact: true });
      const checkLayout = async (minimumChatHeight = 160) => {
        const chatBox = await timeline.boundingBox(), inputBox = await page.locator('#chat-input').boundingBox();
        const composerBox = await composer.boundingBox(), sendBox = await page.getByRole('button', { name: 'Send', exact: true }).boundingBox();
        assert.ok(chatBox.height >= minimumChatHeight, `Conversation needs usable space at ${width}x${height}: ${chatBox.height}`);
        assert.ok(chatBox.y + chatBox.height <= composerBox.y + 1, 'Chat must not overlap composer');
        assert.ok(inputBox.width >= composerBox.width - 50, 'Message field should use the full composer width');
        assert.ok(sendBox.y + sendBox.height <= height, 'Send must be on screen without scrolling');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      };
      await checkLayout();
      assert.equal(await page.getByLabel('Song settings', { exact: true }).getAttribute('open'), null);
      assert.equal(await page.getByLabel('Reference actions', { exact: true }).getAttribute('open'), null);
      await page.getByLabel('Song settings', { exact: true }).locator('summary').click();
      await page.getByRole('button', { name: 'Open Automatic Remix', exact: true }).waitFor();
      await page.getByLabel('Song settings', { exact: true }).locator('summary').click();
      await page.getByLabel('Reference actions', { exact: true }).locator('summary').click();
      await page.getByRole('button', { name: 'Review source reference', exact: true }).waitFor();
      await page.getByLabel('Reference actions', { exact: true }).locator('summary').press('Escape');
      assert.equal(await page.getByLabel('Reference actions', { exact: true }).getAttribute('open'), null);
      await page.screenshot({ path: `/tmp/beatmind-clean-remix-${width}-${height}.png` });
      assert.equal(await mode.inputValue(), 'preview');
      await mode.selectOption('ableton');
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).remixEditTarget === 'ableton', `${prefix}_first`);
      await switchChat('second remix');
      assert.equal(await mode.inputValue(), 'preview', 'A different song must not inherit action intent');
      await switchChat('first remix');
      assert.equal(await mode.inputValue(), 'ableton', 'Returning to a song must restore its explicit target');
      await page.reload(); await goToChat();
      assert.equal(await mode.inputValue(), 'ableton', 'Refreshing must not silently switch action to preview');
      assert.equal(writes.length, 0, 'Restoring a target must not execute anything');
      holdReply = true;
      await page.locator('#chat-input').fill('Add a closed hat to the linked Ableton set.');
      await page.locator('#chat-input').press('Enter');
      await page.getByRole('button', { name: 'Stop production', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('[aria-label="Command mode"]').clientWidth >= 140);
      await checkLayout(80);
      await page.screenshot({ path: `/tmp/beatmind-clean-loading-${width}-${height}.png` });
      while (!finishReply) await new Promise(resolve => setTimeout(resolve, 10));
      holdReply = false; finishReply();
      await page.getByText('Fixture response; no real Ableton actions.', { exact: true }).waitFor();
      const sent = writes.find(x => x.path === '/api/chat/stream');
      assert.equal(sent.body.remix_edit_target, 'ableton');
      assert.equal(sent.body.planning_only, false);
      await mode.selectOption('discuss');
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).chatMode === 'discuss', `${prefix}_first`);
      await switchChat('second remix');
      assert.equal(await mode.inputValue(), 'preview');
      await switchChat('first remix');
      assert.equal(await mode.inputValue(), 'discuss');
      await page.reload(); await goToChat();
      assert.equal(await mode.inputValue(), 'discuss');
      await page.locator('#chat-input').fill('What effect would a delay have?');
      await page.locator('#chat-input').press('Enter');
      await page.getByText('Fixture response; no real Ableton actions.', { exact: true }).waitFor();
      assert.equal(writes.at(-1).body.planning_only, true);
      assert.equal(writes.at(-1).body.remix_edit_target, 'ableton');
      await mode.selectOption('ableton');
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).chatMode === 'action', `${prefix}_first`);
      connected = false;
      await page.reload(); await goToChat();
      assert.equal(await mode.inputValue(), 'ableton', 'Disconnection must not change the chosen target');
      assert.equal(await mode.isDisabled(), false, 'Offline users can explicitly switch to Discuss');
      await page.locator('#chat-input').fill('Make that hat quieter.');
      await page.locator('#chat-input').press('Enter');
      await page.getByLabel('Saved instructions').waitFor();
      assert.equal(writes.length, 2, 'An offline Ableton command must queue, not become a preview discussion');
      await switchChat('ordinary song');
      assert.equal(await mode.inputValue(), 'action');
      await mode.selectOption('discuss');
      await page.locator('#chat-input').fill('Which rhythm should we use?');
      await page.locator('#chat-input').press('Enter');
      await page.getByText('Fixture response; no real Ableton actions.', { exact: true }).waitFor();
      assert.equal(writes.length, 3, 'Regular-song discussion must work without a Bridge');
      assert.equal(writes.at(-1).body.planning_only, true);
      assert.deepEqual(errors, []);
      await checkLayout();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `/tmp/beatmind-remix-target-${width}.png` });
      console.log(`PASS chat modes ${width}px: Action default, explicit Discuss, regular/remix payloads, per-song isolation, chat restore, refresh, offline action queue without fallback`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
