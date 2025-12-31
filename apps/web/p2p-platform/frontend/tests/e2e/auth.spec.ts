import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests login, registration, and password reset flows
 */

test.describe('Authentication', () => {
  test.describe('Driver Login', () => {
    test('should display driver login page', async ({ page }) => {
      await page.goto('/driver/login');

      // Should have email and password inputs
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();

      // Should have login button
      await expect(page.getByRole('button', { name: /sign in|login|log in/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/driver/login');

      await page.getByPlaceholder(/email/i).fill('invalid@test.com');
      await page.getByPlaceholder(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/driver/login');

      await expect(page.getByText(/forgot password|reset password/i)).toBeVisible();
    });
  });

  test.describe('Vendor Login', () => {
    test('should display vendor login page', async ({ page }) => {
      await page.goto('/vendor/login');

      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    });
  });

  test.describe('Driver Registration', () => {
    test('should display driver application page', async ({ page }) => {
      await page.goto('/driver/apply');

      // Should have registration form
      await expect(page.getByPlaceholder(/name/i).first()).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/phone/i)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/driver/apply');

      // Try to submit empty form
      await page.getByRole('button', { name: /submit|apply|register/i }).click();

      // Should show validation errors
      await expect(page.getByText(/required|invalid|please enter/i).first()).toBeVisible();
    });
  });

  test.describe('Restaurant Registration', () => {
    test('should display restaurant application page', async ({ page }) => {
      await page.goto('/restaurant/apply');

      // Should have business registration form
      await expect(page.getByText(/restaurant|business/i).first()).toBeVisible();
    });
  });
});
