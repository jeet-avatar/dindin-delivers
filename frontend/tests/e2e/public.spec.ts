import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'support@dollor.ai';
const ADMIN_PASSWORD = 'DollorAdmin2026!';

test.describe('Public & Session Tests', () => {

  // Test Case 13: Restaurant Application - Complete Flow
  test('TC13: Complete restaurant application flow', async ({ page }) => {
    await page.goto('/restaurant/apply');
    await page.waitForLoadState('networkidle');

    // Step 1: Basic Info
    await page.fill('input[name="restaurant_name"], input[name="restaurantName"], #restaurant_name', 'Test Restaurant');
    await page.fill('input[name="contact_name"], input[name="contactName"], #contact_name', 'John Doe');
    await page.fill('input[name="email"], input[type="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="phone"], input[type="tel"]', '555-123-4567');

    // Select cuisine type if dropdown exists
    const cuisineSelect = page.locator('select[name="cuisine"], .ant-select:has-text("Cuisine")').first();
    if (await cuisineSelect.isVisible({ timeout: 2000 })) {
      await cuisineSelect.click();
      await page.click('.ant-select-item-option:first-child');
    }

    // Click Next
    await page.click('button:has-text("Next"), button:has-text("Continue")');
    await page.waitForTimeout(1000);

    // Step 2: Location
    const addressField = page.locator('input[name="address"], input[name="street_address"], #address');
    if (await addressField.isVisible({ timeout: 3000 })) {
      await addressField.fill('123 Test Street');
      await page.fill('input[name="city"], #city', 'San Francisco');
      await page.fill('input[name="state"], #state', 'CA');
      await page.fill('input[name="zip"], input[name="zipCode"], #zip', '94102');

      await page.click('button:has-text("Next"), button:has-text("Continue")');
      await page.waitForTimeout(1000);
    }

    // Step 3: Operations
    const hoursField = page.locator('input[name="opening_hours"], input[name="hours"], .ant-time-picker').first();
    if (await hoursField.isVisible({ timeout: 3000 })) {
      // Fill operating hours if input field
      if (await page.locator('input[name="opening_hours"]').isVisible()) {
        await page.fill('input[name="opening_hours"]', '9:00 AM - 10:00 PM');
      }

      await page.click('button:has-text("Next"), button:has-text("Continue")');
      await page.waitForTimeout(1000);
    }

    // Step 4: Documents (final step)
    const documentCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await documentCheckboxes.count();
    for (let i = 0; i < checkboxCount && i < 4; i++) {
      await documentCheckboxes.nth(i).check();
    }

    // Submit application
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Apply"), button[type="submit"]');
    if (await submitButton.isVisible({ timeout: 3000 })) {
      await submitButton.click();

      // Wait for submission
      await page.waitForTimeout(3000);

      // Verify success
      const successMessage = await page.locator('.ant-message-success, .ant-notification-notice-success, text=/success/i, text=/submitted/i, text=/thank you/i').isVisible();
      expect(successMessage).toBeTruthy();
    }
  });

  // Test Case 14: Restaurant Application - Validation
  test('TC14: Restaurant application validates required fields', async ({ page }) => {
    await page.goto('/restaurant/apply');
    await page.waitForLoadState('networkidle');

    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
    await nextButton.click();

    // Wait for validation
    await page.waitForTimeout(1000);

    // Check for validation errors
    const validationErrors = page.locator('.ant-form-item-explain-error, .error-message, [role="alert"], .ant-form-item-has-error, .field-error');
    const hasErrors = await validationErrors.count() > 0;

    // Also check if we're still on the same step (didn't proceed)
    const stillOnFirstStep = await page.locator('text=/basic info/i, text=/step 1/i, text=/restaurant name/i').isVisible();

    expect(hasErrors || stillOnFirstStep).toBeTruthy();
  });

  // Test Case 15: Session Persistence
  test('TC15: Session persists after page reload', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Verify logged in
    const token = await page.evaluate(() => localStorage.getItem('id_token'));
    expect(token).toBeTruthy();

    // Store the token for verification
    const originalToken = token;

    // Reload the page (simulates closing and reopening)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify token is still present
    const tokenAfterReload = await page.evaluate(() => localStorage.getItem('id_token'));
    expect(tokenAfterReload).toBeTruthy();
    expect(tokenAfterReload).toBe(originalToken);

    // Verify still authenticated - should be on dashboard, not login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');

    // Should see dashboard content
    const dashboardContent = page.locator('.ant-layout, .dashboard, .ant-menu, main');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 5000 });
  });
});
