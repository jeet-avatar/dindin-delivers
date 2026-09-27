const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// No API routes are mocked: verify the deployed build and real browser CORS path.
(async () => {
  const target = process.env.BEATMIND_UI_URL;
  const expected = process.env.NEXT_PUBLIC_API_URL;
  assert.ok(target && expected, 'BEATMIND_UI_URL and NEXT_PUBLIC_API_URL are required');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage(), requests = [], failures = [];
    page.on('request', req => { if (new URL(req.url()).pathname.startsWith('/api/')) requests.push(req.url()); });
    page.on('requestfailed', req => { if (new URL(req.url()).pathname.startsWith('/api/') && req.failure()?.errorText !== 'net::ERR_ABORTED') failures.push({ url: req.url(), error: req.failure()?.errorText }); });
    await page.addInitScript(() => {
      localStorage.setItem('beatmind_token', 'invalid-release-connectivity-check');
      localStorage.setItem('beatmind_user', JSON.stringify({ id: -1, subscribed: false }));
    });
    const auth = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/me', { timeout: 30000 });
    await page.goto(new URL('/dashboard', target).href);
    const response = await auth;
    assert.equal(new URL(response.url()).origin, expected, 'Built frontend must use the expected API');
    assert.equal(response.status(), 401, 'Invalid test token must be rejected, not produce a fetch failure');
    await page.waitForURL(url => url.pathname === '/login');
    const health = await page.evaluate(async expected => {
      const r = await fetch(`${expected}/api/health`, { headers: { 'Content-Type': 'application/json' } });
      const body = await r.json();
      return { http: r.status, status: body.status, bridges: body.bridges_connected };
    }, expected);
    assert.equal(health.http, 200); assert.equal(health.status, 'ok');
    assert.ok(requests.length > 0);
    assert.ok(requests.every(url => new URL(url).origin === expected), 'No browser API request may use localhost or another origin');
    assert.deepEqual(failures, []);
    console.log(JSON.stringify({ apiOrigin: expected, authenticatedEndpoint: response.status(), health, requestFailures: failures, realNetwork: true }));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
