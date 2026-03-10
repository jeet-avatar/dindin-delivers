---
phase: quick-139
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/tests/**
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [QUICK-139]

must_haves:
  truths:
    - "Full backend test suite runs with 0 failures"
    - "All test files execute (unit, integration, api, e2e, smoke, top-level)"
    - "Any failures introduced by Quick-138 notification changes are fixed"
  artifacts:
    - path: "apps/web/p2p-platform/backend/tests/"
      provides: "All test files pass"
  key_links:
    - from: "order_flow.py"
      to: "tests/unit/test_order_flow.py"
      via: "notification integration"
      pattern: "notification|confirm_payment"
---

<objective>
Run the full backend test suite, capture detailed results, fix any failures, and retest until 100% pass rate is confirmed.

Purpose: Quick-138 added notification code to order_flow.py and main_new.py. Need to verify no regressions and confirm test_confirm_payment_success fix holds in the full suite context.
Output: 100% passing test suite (skips acceptable, failures not).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/order_flow.py
@apps/web/p2p-platform/backend/tests/conftest.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run full test suite and capture results</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
    Run the complete backend test suite from the backend directory with verbose output and env vars:

    ```bash
    cd apps/web/p2p-platform/backend
    JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test python -m pytest tests/ -v --tb=long 2>&1 | tee /tmp/pytest-139-run1.txt
    ```

    Capture the full output. Parse results for:
    - Total tests run, passed, failed, skipped, errors
    - List every FAILED or ERROR test with its full traceback
    - Note any tests that skip (E2E staging tests skipping is expected/OK)

    If ALL tests pass (0 failures, 0 errors): proceed directly to Task 2 verification step, skip fixes.
    If ANY failures exist: analyze each failure traceback, identify root cause, and proceed to fix.
  </action>
  <verify>Test output captured in /tmp/pytest-139-run1.txt with full verbose results</verify>
  <done>Complete test results captured with per-test pass/fail/skip status</done>
</task>

<task type="auto">
  <name>Task 2: Fix failures and retest until 100% pass</name>
  <files>
    apps/web/p2p-platform/backend/tests/
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
    For each failing test from Task 1:

    1. Read the failing test file and the source code it tests
    2. Determine if the failure is:
       a) A regression from Quick-138 notification changes (fix the source or test mock)
       b) A pre-existing issue (fix the test or source as appropriate)
       c) A test environment issue (fix conftest.py or test setup)
    3. Apply minimal, targeted fixes — do NOT refactor unrelated code
    4. After fixing all failures, rerun the FULL suite:
       ```bash
       cd apps/web/p2p-platform/backend
       JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test python -m pytest tests/ -v --tb=long 2>&1 | tee /tmp/pytest-139-run2.txt
       ```
    5. If still failing, repeat fix-and-retest cycle (max 3 iterations)
    6. Final run must show 0 failures, 0 errors

    Key areas to watch:
    - test_confirm_payment_success (was recently fixed, verify it holds)
    - Any test touching order_flow.py notification paths (Quick-138 changes)
    - test_email_service.py test_send_email_smtp_connection_error (known flaky — if it fails alone due to test ordering, that is acceptable)

    If Task 1 had 0 failures: Simply confirm the pass and record final counts. No fixes needed.
  </action>
  <verify>
    ```bash
    cd apps/web/p2p-platform/backend
    JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test python -m pytest tests/ -v --tb=short 2>&1 | tail -5
    ```
    Output shows "X passed, Y skipped" with 0 failures and 0 errors.
  </verify>
  <done>Full test suite passes with 0 failures and 0 errors. All fixes committed if any were needed.</done>
</task>

</tasks>

<verification>
- `JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test pytest tests/ -v` shows 0 failures, 0 errors
- All test directories executed: unit/, integration/, api/, e2e/, smoke/, top-level test files
- No regressions from Quick-138 notification changes
</verification>

<success_criteria>
- 100% pass rate across all backend tests (skips OK, failures NOT OK)
- Any fixes are minimal and targeted (no unnecessary refactoring)
- Final test run output captured as evidence
</success_criteria>

<output>
After completion, create `.planning/quick/139-run-full-backend-test-suite-fix-failures/139-SUMMARY.md`
</output>
