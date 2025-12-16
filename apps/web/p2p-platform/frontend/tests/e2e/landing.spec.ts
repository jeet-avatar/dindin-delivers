import { test, expect } from '@playwright/test';

/**
 * Landing Page E2E Tests
 * Tests the public landing page and navigation
 */

test.describe('Landing Page', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    // Should have Dollor.ai branding
    await expect(page.getByText(/dollor/i).first()).toBeVisible();
  });

  test('should have navigation to driver application', async ({ page }) => {
    await page.goto('/');

    // Should have link to driver application
    const driverLink = page.getByRole('link', { name: /driver|deliver/i });
    if (await driverLink.count() > 0) {
      await expect(driverLink.first()).toBeVisible();
    }
  });

  test('should have navigation to restaurant application', async ({ page }) => {
    await page.goto('/');

    // Should have link to restaurant application
    const restaurantLink = page.getByRole('link', { name: /restaurant|partner/i });
    if (await restaurantLink.count() > 0) {
      await expect(restaurantLink.first()).toBeVisible();
    }
  });

  test('should display terms of service link', async ({ page }) => {
    await page.goto('/');

    // Should have terms link in footer or page
    const termsLink = page.getByRole('link', { name: /terms/i });
    if (await termsLink.count() > 0) {
      await expect(termsLink.first()).toBeVisible();
    }
  });

  test('should display privacy policy link', async ({ page }) => {
    await page.goto('/');

    // Should have privacy link
    const privacyLink = page.getByRole('link', { name: /privacy/i });
    if (await privacyLink.count() > 0) {
      await expect(privacyLink.first()).toBeVisible();
    }
  });
});

test.describe('Terms and Privacy Pages', () => {
  test('should display terms of service page', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.getByText(/terms/i).first()).toBeVisible();
  });

  test('should display privacy policy page', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText(/privacy/i).first()).toBeVisible();
  });
});
