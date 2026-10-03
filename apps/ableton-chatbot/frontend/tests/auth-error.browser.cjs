const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/api/auth/*', route => route.fulfill({ status: 422,
        contentType: 'application/json', body: JSON.stringify({ detail: [
          { loc: ['body', 'email'], msg: 'Invalid address', input: 'private-input' },
        ] }) }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['login', 'signup']) {
        await page.goto((process.env.BEATMIND_UI_URL || 'http://localhost:3024') + '/' + route);
        await page.getByLabel('Email', { exact: true }).fill('not-an-email');
        await page.getByLabel('Password', { exact: true }).fill('test-password-only');
        await page.locator('button[type="submit"]').click();
        const alert = page.locator('form').getByRole('alert');
        await alert.waitFor();
        assert.equal(await alert.innerText(), 'Please enter a valid email address.');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: sign-in and sign-up validation are readable`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
