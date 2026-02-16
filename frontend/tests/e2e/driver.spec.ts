import { test, expect } from '@playwright/test';

const DRIVER_EMAIL = 'demo.driver@dollor.ai';
const DRIVER_PASSWORD = 'DemoDriver2025!';

test.describe('Driver Tests', () => {

  // TC01: Driver Login
  test('TC01: Driver login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Driver login button
    await page.click('button:has-text("Driver")');
    await page.waitForSelector('input', { timeout: 10000 });

    // Fill credentials
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(DRIVER_EMAIL);
    await passwordInput.fill(DRIVER_PASSWORD);

    // Submit
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Verify logged in
    const loggedIn = await page.locator('text=/dashboard|deliveries|earnings|available|online/i').first().isVisible({ timeout: 10000 });
    expect(loggedIn).toBeTruthy();
  });

  // TC02: Driver application page
  test('TC02: Driver application page loads', async ({ page }) => {
    await page.goto('/driver/apply');
    await page.waitForLoadState('networkidle');

    const hasInput = await page.locator('input').first().isVisible({ timeout: 10000 });
    expect(hasInput).toBeTruthy();
  });

  // TC03: Driver login button visible on homepage
  test('TC03: Driver login button on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("Driver")').first()).toBeVisible();
  });

  // TC04: Driver For Drivers link
  test('TC04: For Drivers navigation link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const driverLink = page.locator('a:has-text("For Drivers"), link:has-text("Driver")').first();
    await expect(driverLink).toBeVisible();
  });

  // TC05: Driver login shows form
  test('TC05: Driver login shows email and password fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Driver")');
    await page.waitForTimeout(2000);

    const emailField = await page.locator('input[type="email"], input[placeholder*="email" i]').first().isVisible({ timeout: 5000 });
    const passwordField = await page.locator('input[type="password"]').first().isVisible({ timeout: 5000 });

    expect(emailField && passwordField).toBeTruthy();
  });

  // TC06: API driver endpoints accessible
  test('TC06: Driver API health', async ({ page }) => {
    const response = await page.request.get('https://api.dollor.ai/health');
    expect(response.ok()).toBeTruthy();
  });

  // TC07: Driver can toggle online status (after login)
  test('TC07: Driver dashboard accessible after login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Driver")');
    await page.waitForSelector('input', { timeout: 10000 });

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(DRIVER_EMAIL);
    await passwordInput.fill(DRIVER_PASSWORD);

    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Check for dashboard elements
    const hasDashboard = await page.locator('text=/online|offline|available|earnings|delivery/i').first().isVisible({ timeout: 10000 });
    expect(hasDashboard).toBeTruthy();
  });
});
