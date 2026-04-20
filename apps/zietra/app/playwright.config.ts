import { defineConfig, devices } from '@playwright/test';

/**
 * BrandMonkz CRM — Playwright E2E Configuration
 *
 * Usage:
 *   Local (with backend running):  npx playwright test
 *   Against production:            npm run test:e2e:prod
 *   With UI:                       npm run test:e2e:ui
 *   Headed (visible browser):      npm run test:e2e:headed
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['line']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start local dev server only when no E2E_BASE_URL is provided */
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 30_000,
        },
      }),
});
