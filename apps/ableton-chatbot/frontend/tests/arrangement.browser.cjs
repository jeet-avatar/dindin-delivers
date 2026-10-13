const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../out');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
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
      const user = { id: 987991, email: 'arrangement@example.invalid', subscribed: true, subscription_status: 'active', plan_tier: 'pro' };
      const project = { title: 'Six-minute arrangement', starting_point: 'idea', live_set: { title: 'Disposable QA', choice: 'current' } };
      let start = 1;
      const plan = { title: 'Deep minimal house', revision: 'a'.repeat(16), approved: false, bpm: 128,
        numerator: 4, denominator: 4, total_bars: 192, duration_seconds: 360,
        remaining_checks: ['effects_and_transitions', 'full_arrangement_audio', 'saved_live_set'],
        sections: [['DJ Intro', 32], ['Main Groove', 64], ['Breakdown', 32], ['Final Drop', 32], ['DJ Outro', 32]].map(([name, bars], i) => {
          const item = { id: `section-${i}`, name, purpose: 'Preserve the approved groove with gradual development.',
            start_bar: start, end_bar_exclusive: start + bars, start_seconds: (start - 1) * 1.875,
            end_seconds: (start + bars - 1) * 1.875, state: 'planned', energy: 0.5,
            assignments: [{ track: 0, role: 'Kick' }, { track: 1, role: 'Bass' }],
            transition: { type: 'layer_change', bars: 4, instructions: 'Remove percussion before the boundary.' }, effects: [] };
          start += bars;
          return item;
        }) };
      const messages = [{ role: 'assistant', content: 'Review the proposed arrangement.', requestStatus: 'complete',
        toolCalls: [{ tool: 'plan_song_arrangement', input: {}, result: { status: 'observed', arrangement_plan: plan,
          summary: 'Arrangement proposed. No music changed.' } }] }];
      await context.addInitScript(({ user, project, messages }) => {
        localStorage.setItem('beatmind_token', 'fixture-not-real');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
        localStorage.setItem('beatmind_chats_v2_987991', JSON.stringify({ activeId: 'qa-arrangement', chats: [{ id: 'qa-arrangement', title: project.title, sessionId: 'qa-arrangement' }] }));
        localStorage.setItem('beatmind_chats_v2_987991_qa-arrangement', JSON.stringify({ messages, sessionId: 'qa-arrangement', input: '', project }));
      }, { user, project, messages });
      const calls = [];
      const revision = { revision: 'b'.repeat(16), section_name: 'Final Drop', track: 1,
        reason: 'Softer bass pattern in the final drop only', state: 'proposed', approved: false };
      await context.route('**/release.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()).pathname;
        const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
        if (url === '/api/auth/me') return reply(user);
        if (url === '/api/stripe/usage') return reply({ plan: { tier: 'pro', source: 'subscription', status: 'active' }, songs_this_month: 1, songs_limit: 25, model_access: ['fast', 'pro'], features: { references: true } });
        if (url === '/api/bridge/status') return reply({ bridge_connected: true, bridge_version: '1.3.20', live_set: 'Disposable QA' });
        if (url === '/api/recordings') return reply({ recordings: [] });
        if (url === '/api/chats') return reply({ chats: [] });
        if (url === '/api/chats/qa-arrangement') return reply({ sessionId: 'qa-arrangement', messages, project, referenceId: null });
        if (url === '/api/chat/stream') {
          calls.push(req.postDataJSON());
          const partApproval = req.postDataJSON().message === `Approve part revision ${revision.revision}`;
          return route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'complete',
            response: partApproval ? 'Part revision approved. Audio review is separate.' : 'Approval recorded. Placement remains pending.', tool_calls: [{ tool: 'get_song_arrangement_plan', input: {},
              result: { status: 'observed', arrangement_plan: { ...plan, approved: true,
                pending_revision: { ...revision, approved: partApproval } } } }] }) + '\n' });
        }
        return reply({});
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/dashboard`);
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'BeatMind', exact: true }).click();
      const timeline = page.getByLabel('Song arrangement');
      await timeline.waitFor();
      assert.match(await timeline.innerText(), /192 bars/);
      assert.match(await timeline.innerText(), /6:00.0/);
      assert.match(await timeline.innerText(), /Audio and project save not yet verified/);
      assert.equal(await timeline.getByRole('listitem').count(), 5);
      const button = page.getByRole('button', { name: 'Approve arrangement', exact: true });
      await button.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/beatmind-arrangement-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await button.click();
      await page.getByText('Approval recorded. Placement remains pending.', { exact: true }).waitFor();
      assert.equal(calls.length, 1);
      assert.equal(calls[0].message, `Approve arrangement ${plan.revision}`);
      assert.equal(await page.getByRole('button', { name: 'Approve arrangement', exact: true }).count(), 0);
      const revise = page.getByRole('button', { name: 'Approve part revision', exact: true });
      await revise.scrollIntoViewIfNeeded();
      assert.equal(await revise.count(), 1, 'Historical plans must not expose stale approval controls');
      await page.screenshot({ path: `/tmp/beatmind-part-revision-${width}.png`, fullPage: true });
      await revise.click();
      await page.getByText('Part revision approved. Audio review is separate.', { exact: true }).waitFor();
      assert.equal(calls.length, 2);
      assert.equal(calls[1].message, `Approve part revision ${revision.revision}`);
      assert.equal(await page.getByRole('button', { name: 'Approve part revision', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, sections: 5, arrangementApproval: 'passed', partRevisionApproval: 'passed', completionClaim: 'absent', overflow: false }));
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
