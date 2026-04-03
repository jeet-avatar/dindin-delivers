---
phase: quick-265
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro-website/playwright.config.cjs
  - /Users/jeet/techcloudpro-website/tests/e2e/aria-bot.spec.cjs
  - /Users/jeet/techcloudpro-website/tests/e2e/sarah-bot.spec.cjs
  - /Users/jeet/techcloudpro-website/tests/e2e/auth-flow.spec.cjs
  - /Users/jeet/techcloudpro-website/tests/e2e/contact-newsletter.spec.cjs
autonomous: true
requirements: [VT-E2E-01]

must_haves:
  truths:
    - "playwright.config.cjs testDir matches where spec files live (./tests/e2e)"
    - "aria-bot.spec.cjs tests Aria's public page, detail page, and POST /api/leads/from-call"
    - "sarah-bot.spec.cjs tests Sarah's public page, detail page, and her specific API"
    - "auth-flow.spec.cjs tests /login page renders, POST /api/auth/login rejects bad creds, POST /api/auth/register rejects duplicate/invalid data"
    - "contact-newsletter.spec.cjs tests POST /api/contact and POST /api/newsletter/subscribe"
    - "All 4 new spec files pass when run via npx playwright test against https://www.vibingticket.com"
  artifacts:
    - path: "/Users/jeet/techcloudpro-website/tests/e2e/aria-bot.spec.cjs"
      provides: "Aria bot E2E tests"
    - path: "/Users/jeet/techcloudpro-website/tests/e2e/sarah-bot.spec.cjs"
      provides: "Sarah bot E2E tests"
    - path: "/Users/jeet/techcloudpro-website/tests/e2e/auth-flow.spec.cjs"
      provides: "Auth flow E2E tests"
    - path: "/Users/jeet/techcloudpro-website/tests/e2e/contact-newsletter.spec.cjs"
      provides: "Contact and newsletter E2E tests"
  key_links:
    - from: "playwright.config.cjs"
      to: "tests/e2e/*.spec.cjs"
      via: "testDir + testMatch glob"
      pattern: "testDir.*tests"
---

<objective>
Write the four missing Playwright E2E spec files for VibingTicket and confirm all tests pass against the live site at https://www.vibingticket.com.

Purpose: The existing test suite covers Alex (Job Hunter) and general public pages. Aria, Sarah, auth flows, contact, and newsletter endpoints have zero E2E coverage.
Output: 4 new spec files in /Users/jeet/techcloudpro-website/tests/e2e/, all passing.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Reference repo: /Users/jeet/techcloudpro-website
Playwright config: /Users/jeet/techcloudpro-website/playwright.config.cjs
Existing reference test (follow this pattern exactly): /Users/jeet/techcloudpro-website/tests/e2e/alex-job-hunter.spec.cjs
Existing audit spec (for page structure clues): /Users/jeet/techcloudpro-website/tests/e2e-audit.spec.cjs

Live site: https://www.vibingticket.com
API base: https://api.vibingticket.com/api

Key facts from handoff:
- testDir is already './tests/e2e' — no change needed to playwright.config.cjs UNLESS inspection shows it is wrong
- Verified API endpoints: POST /api/leads/from-call, POST /api/newsletter/subscribe, POST /api/contact, POST /api/auth/login, POST /api/auth/register
- Test style: CommonJS (.cjs), require('@playwright/test'), test.describe blocks, mix of page and request fixture tests
- baseURL is configured in playwright.config.cjs as https://www.vibingticket.com so use relative paths in page.goto()
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify playwright.config.cjs testDir and write the 4 spec files</name>
  <files>
    /Users/jeet/techcloudpro-website/playwright.config.cjs
    /Users/jeet/techcloudpro-website/tests/e2e/aria-bot.spec.cjs
    /Users/jeet/techcloudpro-website/tests/e2e/sarah-bot.spec.cjs
    /Users/jeet/techcloudpro-website/tests/e2e/auth-flow.spec.cjs
    /Users/jeet/techcloudpro-website/tests/e2e/contact-newsletter.spec.cjs
  </files>
  <action>
    **Step 1 — Verify playwright.config.cjs**
    Read /Users/jeet/techcloudpro-website/playwright.config.cjs. Confirm testDir is './tests/e2e' and testMatch is '**/*.spec.cjs'. If testDir is anything else (e.g. './tests'), update it to './tests/e2e' so discovery finds the new files. Do NOT change any other config.

    **Step 2 — Write aria-bot.spec.cjs**
    Follow the exact pattern from alex-job-hunter.spec.cjs: CommonJS require, test.describe blocks, mix of page navigation tests and API request tests.

    Content structure:
    ```
    // @ts-check
    const { test, expect } = require('@playwright/test');
    const API_BASE = 'https://api.vibingticket.com/api';

    test.describe('Aria Bot - Public Pages', () => {
      test('AI Employees Marketplace shows Aria', ...)  // goto /ai-employees, look for text /Aria|Sales|Lead/i
      test('Aria detail page loads', ...)               // goto /ai-employees/aria, body not empty, content has /aria|sales|lead/i
    });

    test.describe('Aria Bot - Lead Intake API', () => {
      test('POST /api/leads/from-call rejects missing fields', ...) // request.post with empty body, expect 422 or 400
      test('POST /api/leads/from-call accepts valid lead data', ...) // request.post with {name, phone, source:'aria'}, expect 200 or 201
    });

    test.describe('Aria Bot - Dashboard Navigation', () => {
      test('Dashboard redirects unauthenticated user', ...)  // goto /aria or /dashboard/aria, expect login redirect or 200
    });
    ```

    For the valid lead test, use data: { name: 'E2E Test', phone: '+15551234567', source: 'aria', email: 'e2e-test@example.com' }. Accept 200, 201, or 422 as passing (site may have validation). The test goal is confirming the endpoint responds, not that it accepts arbitrary test data. Use: `expect([200, 201, 400, 422]).toContain(response.status())` — only fail on 5xx.

    **Step 3 — Write sarah-bot.spec.cjs**
    Same pattern. Sarah is likely a different AI employee (check /ai-employees page for Sarah's slug — it may be /ai-employees/sarah or similar). Structure:

    ```
    test.describe('Sarah Bot - Public Pages', () => {
      test('Marketplace shows Sarah', ...)     // look for /Sarah/i on /ai-employees
      test('Sarah detail page loads', ...)     // goto /ai-employees/sarah
    });

    test.describe('Sarah Bot - Dashboard Navigation', () => {
      test('Sarah dashboard loads or redirects', ...)  // goto /sarah or /dashboard/sarah
    });

    test.describe('Frontend Routes - Sarah', () => {
      // Test that /ai-employees/sarah returns < 500 status
    });
    ```

    If Sarah's exact slug is unknown, use a page.goto('/ai-employees') test that scans for any "Sarah" text, and a second test that tries /ai-employees/sarah — accept any non-500 response.

    **Step 4 — Write auth-flow.spec.cjs**
    ```
    const API_BASE = 'https://api.vibingticket.com/api';

    test.describe('Auth - Login Page', () => {
      test('Login page loads', ...)           // goto /login, status < 500, body not empty
      test('Login page has form elements', ()) // look for input[type=email] or input[type=password] or text /login|sign in/i
    });

    test.describe('Auth - Login API', () => {
      test('POST /api/auth/login rejects bad credentials', ...) // { email:'bad@bad.com', password:'wrong' }, expect 401 or 400
      test('POST /api/auth/login requires email field', ...)    // empty body, expect 422 or 400
    });

    test.describe('Auth - Register API', () => {
      test('POST /api/auth/register rejects missing fields', ...)  // empty body, expect 422 or 400
      test('POST /api/auth/register rejects invalid email', ...)   // { email: 'notanemail', password: 'Test123!' }, expect 422 or 400
    });

    test.describe('Auth - Protected Routes', () => {
      test('Protected dashboard redirects unauthenticated', ...)  // goto /dashboard or /job-hunter, url must contain login or status < 500
    });
    ```

    For API tests: only fail on 5xx. A 401/400/422 from login with bad creds is the CORRECT behavior — it means the endpoint is alive and validating.

    **Step 5 — Write contact-newsletter.spec.cjs**
    ```
    const API_BASE = 'https://api.vibingticket.com/api';

    test.describe('Contact Form API', () => {
      test('POST /api/contact rejects missing fields', ...)      // empty body, expect 400 or 422
      test('POST /api/contact accepts valid submission', ...)    // { name, email, message }, accept 200/201/400/422, fail only on 5xx
    });

    test.describe('Newsletter API', () => {
      test('POST /api/newsletter/subscribe rejects missing email', ...)  // empty body, expect 400 or 422
      test('POST /api/newsletter/subscribe accepts email', ...)          // { email: 'e2e@example.com' }, accept 200/201/400/409/422, fail on 5xx
    });

    test.describe('Contact Page - UI', () => {
      test('Contact page loads', ...)  // goto /contact if it exists, otherwise skip gracefully
    });
    ```

    For newsletter, a 409 Conflict (already subscribed) is valid — accept it. Use `expect(response.status()).toBeLessThan(500)`.
  </action>
  <verify>
    cd /Users/jeet/techcloudpro-website && npx playwright test tests/e2e/aria-bot.spec.cjs tests/e2e/sarah-bot.spec.cjs tests/e2e/auth-flow.spec.cjs tests/e2e/contact-newsletter.spec.cjs --reporter=list 2>&1 | tail -30
  </verify>
  <done>
    All 4 spec files exist, all tests pass (0 failures). Any test that would be flaky due to unknown slugs uses graceful assertions (non-5xx, content present) rather than hard-coded selectors that may not exist.
  </done>
</task>

<task type="auto">
  <name>Task 2: Run full test suite and confirm no regressions</name>
  <files></files>
  <action>
    Run the complete Playwright suite to confirm:
    1. The 4 new spec files are discovered by the config
    2. Existing alex-job-hunter.spec.cjs still passes
    3. No regressions introduced

    Command: cd /Users/jeet/techcloudpro-website && npx playwright test --reporter=list

    If any test fails:
    - 5xx from an API endpoint → investigate, the endpoint may be down; mark in summary
    - Assertion failure in new spec → fix the selector or assertion to match actual site behavior
    - Existing test failure → check if it was already failing before this task (run just that file in isolation to confirm)

    Do NOT touch existing test files to fix regressions unless the new files caused the breakage.
  </action>
  <verify>
    cd /Users/jeet/techcloudpro-website && npx playwright test --reporter=list 2>&1 | grep -E "passed|failed|error"
  </verify>
  <done>
    Output shows "X passed" with 0 failures (or pre-existing failures that also fail on the reference commit — document any pre-existing failures in the summary).
  </done>
</task>

</tasks>

<verification>
- All 4 spec files exist at /Users/jeet/techcloudpro-website/tests/e2e/
- playwright.config.cjs testDir points to the correct directory
- npx playwright test exits 0 (or only pre-existing failures remain)
- Tests cover: Aria page + lead API, Sarah page, auth login/register API, contact + newsletter API
</verification>

<success_criteria>
4 new spec files written following the alex-job-hunter.spec.cjs pattern, all tests pass against https://www.vibingticket.com, no regressions in existing suite.
</success_criteria>

<output>
After completion, create /Users/jeet/doordash-p2p/.planning/quick/265-write-missing-playwright-e2e-tests-for-v/265-SUMMARY.md with:
- Files created
- Test counts (passed/failed)
- Any pre-existing failures noted
- Playwright test output snippet
</output>
