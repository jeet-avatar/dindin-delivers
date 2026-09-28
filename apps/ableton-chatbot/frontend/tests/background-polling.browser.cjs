const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const counts = { '/api/bridge/status': 0, '/api/recordings': 0, '/api/references': 0 }, errors = [];
    let limited = false;
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('beatmind_token', 'fixture');
      localStorage.setItem('beatmind_user', JSON.stringify({ id: 987660, subscribed: true }));
      window.testVisibility = 'hidden';
      Object.defineProperty(document, 'visibilityState', { get: () => window.testVisibility });
    });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/stripe/usage') return route.fulfill({ status: 404, body: '' });
      const reply = (body, status = 200, headers = {}) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
      if (path in counts) counts[path]++;
      if (path === '/api/auth/me') return reply({ id: 987660, subscribed: true });
      if (path === '/api/chats') return reply({ chats: [] });
      if (path === '/api/bridge/status') return reply({ bridge_connected: true });
      if (path === '/api/recordings') return reply({ recordings: [] });
      if (path === '/api/references') {
        if (limited) return reply({ detail: 'Too many requests' }, 429, { 'Retry-After': '12', 'Access-Control-Expose-Headers': 'Retry-After' });
        return reply({ references: [], available: true, processing: { busy: false }, max_bytes: 262144000, min_seconds: 5, max_seconds: 600 });
      }
      throw Error('Unexpected API request ' + path);
    });
    await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3014') + '/dashboard');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'References', exact: true }).click();
    await page.waitForTimeout(5500);
    assert.deepEqual(Object.values(counts), [0, 0, 0], 'Hidden tabs must not poll');
    const visibility = state => page.evaluate(state => {
      window.testVisibility = state; document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    await visibility('visible');
    await page.waitForFunction(() => document.querySelector('[aria-label="Reference audio file"]')?.disabled === false);
    assert.ok(Object.values(counts).every(n => n > 0));
    const idleReferences = counts['/api/references'];
    await page.waitForTimeout(6500);
    assert.equal(counts['/api/references'], idleReferences, 'Idle references must not keep polling every four seconds');
    limited = true;
    await page.getByText(/Status updates are paused briefly/).waitFor();
    await page.waitForTimeout(300);
    const paused = { ...counts };
    await page.waitForTimeout(5500);
    assert.deepEqual(counts, paused, 'A 429 pauses every background poller');
    limited = false;
    await page.waitForFunction(() => !document.body.innerText.includes('Status updates are paused briefly'), null, { timeout: 20000 });
    assert.ok(counts['/api/references'] > paused['/api/references']);
    await visibility('hidden');
    await page.waitForTimeout(300);
    const hidden = { ...counts };
    await page.waitForTimeout(5500);
    assert.deepEqual(counts, hidden);
    assert.deepEqual(errors, []);
    console.log('PASS: hidden tabs stop polling; visibility resumes; idle references poll less often; 429 pauses all pollers and clears after recovery.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
