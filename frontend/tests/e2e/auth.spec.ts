import { test, expect } from '@playwright/test';

// Demo account credentials
const ADMIN_EMAIL = 'support@dollor.ai';
const ADMIN_PASSWORD = 'DollorAdmin2026!';
const VENDOR_EMAIL = 'demo.restaurant@dollor.ai';
const VENDOR_PASSWORD = 'DemoRestaurant2025!';

test.describe('Authentication Tests', () => {

  // Test Case 1: Admin Login - Valid Credentials
  test('TC01: Admin login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('id_token'));
    expect(token).toBeTruthy();

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');
  });

  // Test Case 2: Vendor Login - Valid Credentials
  test('TC02: Vendor login with valid credentials', async ({ page }) => {
    await page.goto('/vendor/login');

    // Fill login form
    await page.fill('input[type="email"], input[name="email"], #email', VENDOR_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', VENDOR_PASSWORD);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to vendor dashboard
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });

    // Verify we're on the vendor dashboard
    await expect(page).toHaveURL(/\/vendor\/dashboard/);

    // Verify dashboard content is visible
    await expect(page.locator('text=/dashboard|orders|today/i').first()).toBeVisible({ timeout: 5000 });
  });

  // Test Case 3: Login - Invalid Credentials
  test('TC03: Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with invalid password
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', 'WrongPassword123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should still be on login page
    await expect(page).toHaveURL('/login');

    // Verify no token is stored
    const token = await page.evaluate(() => localStorage.getItem('id_token'));
    expect(token).toBeFalsy();

    // Error message should be visible (Ant Design notification or form error)
    const errorVisible = await page.locator('.ant-message-error, .ant-notification-notice-error, .ant-form-item-explain-error, [role="alert"]').isVisible();
    expect(errorVisible).toBeTruthy();
  });
});
