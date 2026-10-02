const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let resetRequests = 0;
      await context.route('**/api/auth/forgot-password', route => route.fulfill({ status: 422,
        contentType: 'application/json', body: JSON.stringify({ detail: [
          { loc: ['body', 'email'], msg: 'Invalid address', input: 'private-input' },
        ] }) }));
      await context.route('**/api/auth/reset-password', route => {
        resetRequests++;
        assert.deepEqual(route.request().postDataJSON(), {
          token: 'fixture-link', new_password: 'FixturePassword123',
        });
        return route.fulfill({ status: resetRequests === 1 ? 400 : 200,
          contentType: 'application/json', body: JSON.stringify(resetRequests === 1
            ? { detail: 'Reset link is invalid or has expired. Request a new link.' }
            : { message: 'Password updated. You can now sign in.' }) });
      });
      const base = process.env.BEATMIND_UI_URL || 'http://localhost:3024';
      await page.goto(base + '/forgot-password');
      await page.getByLabel('Email', { exact: true }).fill('not-an-email');
      await page.locator('button[type="submit"]').click();
      await page.locator('form').getByRole('alert').waitFor();
      assert.equal(await page.locator('form').getByRole('alert').innerText(), 'Please enter a valid email address.');
      await page.goto(base + '/reset-password?token=fixture-link');
      await page.getByLabel('New password', { exact: true }).fill('FixturePassword123');
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      assert.equal(await page.locator('#password').getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Hide password', exact: true }).click();
      await page.locator('button[type="submit"]').click();
      await page.locator('form').getByRole('alert').waitFor();
      assert.equal(await page.getByRole('link', { name: 'Request a new link' }).getAttribute('href'), '/forgot-password');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/beatmind-reset-${width}.png` });
      await page.locator('button[type="submit"]').click();
      await page.getByRole('heading', { name: 'Password updated' }).waitFor();
      await page.waitForURL('**/login');
      assert.equal(resetRequests, 2);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: editable password, reveal/hide, expired-link recovery, reset and sign-in redirect`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
