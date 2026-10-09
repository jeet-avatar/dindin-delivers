/* Explicit opt-in: upload owned test audio through production UI, then delete only that upload. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  assert.equal(process.env.BEATMIND_LIVE_UPLOAD_CONSENT, '1', 'Explicit consent for owned test audio is required');
  const file = process.env.BEATMIND_LIVE_TEST_AUDIO;
  assert.ok(file && fs.statSync(file).size > 50 * 1024 * 1024, 'Provide a >50 MB owned test audio file');
  const browser = await chromium.connectOverCDP(process.env.BEATMIND_CDP_URL || 'http://localhost:9222');
  let context, page, id, finished = false;
  try {
    const signedIn = browser.contexts().flatMap(context => context.pages()).find(p => p.url().startsWith('https://www.beatmind.io/dashboard'));
    assert.ok(signedIn, 'A signed-in production dashboard is required');
    const auth = await signedIn.evaluate(() => ({ token: localStorage.getItem('beatmind_token'), user: localStorage.getItem('beatmind_user') }));
    assert.ok(auth.token && auth.user);
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(auth => {
      localStorage.setItem('beatmind_token', auth.token); localStorage.setItem('beatmind_user', auth.user);
    }, auth);
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    const writes = [];
    page.on('request', r => { if (r.method() === 'POST') writes.push(new URL(r.url()).pathname); });
    async function api(path, method = 'GET') {
      return page.evaluate(async ({ path, method }) => {
        const r = await fetch('https://api.beatmind.io' + path, { method, headers: { Authorization: 'Bearer ' + localStorage.getItem('beatmind_token') } });
        if (!r.ok) throw Error('API ' + r.status + ' for ' + path);
        return r.json();
      }, { path, method });
    }
    await page.goto('https://www.beatmind.io/dashboard');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Reference audio file"]')?.disabled === false);
    const limits = await api('/api/references');
    assert.ok(limits.max_bytes >= fs.statSync(file).size);
    let result;
    if (process.env.BEATMIND_LIVE_RESUME_ID) {
      result = limits.references.find(item => item.id === process.env.BEATMIND_LIVE_RESUME_ID);
      assert.ok(result && result.name === path.basename(file) && result.bytes === fs.statSync(file).size, 'Resume only the exact owned test fixture');
      id = result.id;
      await page.locator('[aria-label="Saved references"] button').filter({ hasText: result.name }).click();
    } else {
    // Chrome and this runner share the local filesystem. Avoid Playwright's
    // remote-file transfer cap; select the real file through Chrome directly.
    const cdp = await context.newCDPSession(page);
    try {
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[aria-label="Reference audio file"]' });
      await cdp.send('DOM.setFileInputFiles', { nodeId, files: [fs.realpathSync(file)] });
    } finally { await cdp.detach(); }
    await page.getByLabel('I have permission to upload and analyze this audio.').check();
    const uploaded = page.waitForResponse(r => r.url().endsWith('/api/references') && r.request().method() === 'POST', { timeout: 300000 });
    await page.getByRole('button', { name: 'Upload and analyze', exact: true }).click();
    const response = await uploaded;
    assert.equal(response.status(), 202);
    // Large requests can evict Chrome's inspector response cache. Read the
    // durable upload metadata instead of relying on Network.getResponseBody.
    const fresh = (await api('/api/references')).references.filter(item =>
      !limits.references.some(previous => previous.id === item.id) && item.name === path.basename(file));
    assert.equal(fresh.length, 1, 'Exactly one new test upload must be persisted');
    result = fresh[0]; id = result.id;
    }
    assert.equal(result.bytes, fs.statSync(file).size);
    console.log(JSON.stringify({ stage: process.env.BEATMIND_LIVE_RESUME_ID ? 'resumed_upload' : 'uploaded', id, bytes: result.bytes, status: result.status }));
    let item;
    for (let attempt = 0; attempt < 90; attempt++) {
      item = (await api('/api/references')).references.find(r => r.id === id);
      assert.ok(item);
      if (!['processing', 'uploading'].includes(item.status)) { finished = true; break; }
      if (attempt % 6 === 0) console.log(JSON.stringify({ stage: item.stage, status: item.status }));
      await page.waitForTimeout(10000);
    }
    assert.equal(item.status, 'ready', item.error || 'Analysis did not complete within test timeout');
    await page.getByRole('heading', { name: item.name, exact: true }).waitFor();
    assert.equal(item.report.stems.length, 4);
    const audio = page.locator('audio').first();
    await audio.waitFor();
    const decoded = await audio.evaluate(async element => {
      if (element.readyState < 2) await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Audio loading timeout')), 15000);
        element.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
        element.addEventListener('error', () => { clearTimeout(timer); reject(Error('Audio failed')); }, { once: true });
      });
      const ctx = new AudioContext();
      try {
        const data = await ctx.decodeAudioData(await (await fetch(element.currentSrc)).arrayBuffer());
        const channel = data.getChannelData(0);
        return { duration: data.duration, rms: Math.sqrt(channel.reduce((sum, x) => sum + x * x, 0) / channel.length) };
      } finally { await ctx.close(); }
    });
    assert.ok(decoded.duration >= 5 && decoded.rms > 0.001);
    assert.deepEqual(writes.filter(path => path !== '/api/references'), [], 'No chat, music writes or paid AI listening during upload test');
    await page.screenshot({ path: '/tmp/beatmind-large-upload-live.png' });
    console.log(JSON.stringify({ stage: 'analysis_ready', id, stems: item.report.stems.map(s => s.name), ...decoded }));
  } finally {
    try {
      if (id && page) {
        const cleanup = await page.evaluate(async ({ id, finished }) => {
          const h = { Authorization: 'Bearer ' + localStorage.getItem('beatmind_token') };
          const response = await fetch('https://api.beatmind.io/api/references', { headers: h });
          if (!response.ok) return { id, deleted: false, reason: 'Cleanup inspection failed: ' + response.status };
          const list = await response.json();
          const item = list.references.find(r => r.id === id);
          if (item && ['processing', 'uploading'].includes(item.status)) return { id, deleted: false, reason: 'Still processing; cleanup required after completion' };
          const r = await fetch('https://api.beatmind.io/api/references/' + id, { method: 'DELETE', headers: h });
          return { id, deleted: r.ok, analysisFinished: finished };
        }, { id, finished });
        console.log(JSON.stringify(cleanup));
        assert.equal(cleanup.deleted, true, 'Temporary test reference still requires cleanup');
      }
    } finally { if (context) await context.close(); await browser.close(); }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
