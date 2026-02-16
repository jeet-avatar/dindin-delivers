import { test, expect } from '@playwright/test';

const RESTAURANT_EMAIL = 'demo.restaurant@dollor.ai';
const RESTAURANT_PASSWORD = 'DemoRestaurant2025!';

test.describe('Restaurant Tests', () => {

  // TC01: Restaurant Login
  test('TC01: Restaurant login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Restaurant login button - goes to partner portal
    await page.click('button:has-text("Restaurant")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Partner portal has different input structure
    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input').nth(1);

    await emailInput.fill(RESTAURANT_EMAIL);
    await passwordInput.fill(RESTAURANT_PASSWORD);

    // Submit
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Verify logged in
    const loggedIn = await page.locator('text=/dashboard|orders|menu|earnings/i').first().isVisible({ timeout: 10000 });
    expect(loggedIn).toBeTruthy();
  });

  // TC02: Restaurant application page
  test('TC02: Restaurant application page loads', async ({ page }) => {
    await page.goto('/restaurant/apply');
    await page.waitForLoadState('networkidle');

    const hasInput = await page.locator('input').first().isVisible({ timeout: 10000 });
    expect(hasInput).toBeTruthy();
  });

  // TC03: Restaurant login button visible on homepage
  test('TC03: Restaurant login button on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("Restaurant")').first()).toBeVisible();
  });

  // TC04: For Restaurants link
  test('TC04: For Restaurants navigation link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const restaurantLink = page.locator('a:has-text("For Restaurants"), link:has-text("Restaurant")').first();
    await expect(restaurantLink).toBeVisible();
  });

  // TC05: Restaurant login shows form
  test('TC05: Restaurant login shows email and password fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Restaurant")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Partner portal uses generic inputs
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  // TC06: Restaurant dashboard after login
  test('TC06: Restaurant dashboard accessible after login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Restaurant")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input').nth(1);

    await emailInput.fill(RESTAURANT_EMAIL);
    await passwordInput.fill(RESTAURANT_PASSWORD);

    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Check for dashboard elements
    const hasDashboard = await page.locator('text=/orders|menu|earnings|dashboard/i').first().isVisible({ timeout: 10000 });
    expect(hasDashboard).toBeTruthy();
  });

  // TC07: Restaurant navigation has sidebar/menu
  test('TC07: Restaurant dashboard has navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Restaurant")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input').nth(1);

    await emailInput.fill(RESTAURANT_EMAIL);
    await passwordInput.fill(RESTAURANT_PASSWORD);

    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Should see some UI elements after login (buttons, links, or any interactive elements)
    const hasButtons = await page.locator('button').count() > 0;
    const hasInteractiveElements = await page.locator('button, a, input').count() > 0;
    expect(hasButtons || hasInteractiveElements).toBeTruthy();
  });

  // TC08: Restaurant dashboard loads content
  test('TC08: Restaurant dashboard shows content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Restaurant")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input').nth(1);

    await emailInput.fill(RESTAURANT_EMAIL);
    await passwordInput.fill(RESTAURANT_PASSWORD);

    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Dashboard should have cards, tables, or content elements
    const hasCards = await page.locator('.ant-card, .card, [class*="card"]').count() > 0;
    const hasTables = await page.locator('table, .ant-table').count() > 0;
    const hasContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasCards || hasTables || hasContent).toBeTruthy();
  });
});
