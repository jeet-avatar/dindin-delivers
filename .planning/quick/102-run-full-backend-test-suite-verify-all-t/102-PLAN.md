---
phase: quick-102
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/tests/ (potential fixes)
autonomous: true
requirements: [Q102-RUN-TESTS]

must_haves:
  truths:
    - "Full backend test suite runs to completion with zero failures"
    - "All 24 new Phase 10 tests (order_chat, support_chat, voice_agent) pass"
    - "No regressions introduced in existing 1062+ tests"
  artifacts:
    - path: "apps/web/p2p-platform/backend/tests/unit/test_order_chat.py"
      provides: "7 order chat tests"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_support_chat.py"
      provides: "14 support chat tests"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_voice_agent.py"
      provides: "3 voice agent tests"
  key_links: []
---

<objective>
Run the full backend test suite (unit + e2e + integration), verify all tests pass including the 24 new Phase 10 tests, and fix any failures.

Purpose: Confirm zero regressions after Phase 10 test additions (Quick-101). Last known: 1086 tests passing.
Output: Clean test run with full pass count reported. Any fixes committed if needed.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/tests/conftest.py
@apps/web/p2p-platform/backend/tests/unit/test_order_chat.py
@apps/web/p2p-platform/backend/tests/unit/test_support_chat.py
@apps/web/p2p-platform/backend/tests/unit/test_voice_agent.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run full backend test suite and report results</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
Run the complete backend test suite:

```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -m pytest tests/ -v --tb=short 2>&1 | tail -100
```

Capture: total test count, pass count, fail count, error count, skip count.

Specifically verify these 24 new Phase 10 tests appear and pass:
- `tests/unit/test_order_chat.py` — 7 tests
- `tests/unit/test_support_chat.py` — 14 tests
- `tests/unit/test_voice_agent.py` — 3 tests

Known flaky: `test_send_email_smtp_connection_error` (test ordering issue) — if it fails alone, note it but do not count as a regression.

If ALL tests pass: report the total count and confirm zero failures.
If any tests FAIL (excluding known flaky): proceed to Task 2.
  </action>
  <verify>pytest exit code is 0 (or only known flaky failure). All 24 Phase 10 tests listed as PASSED in output.</verify>
  <done>Full test suite runs with results captured. Total count and pass/fail breakdown reported.</done>
</task>

<task type="auto">
  <name>Task 2: Fix any test failures (conditional — skip if Task 1 all green)</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
ONLY execute this task if Task 1 had failures.

For each failing test:
1. Read the full traceback (`python -m pytest tests/path/to/failing_test.py -v --tb=long`)
2. Diagnose root cause — is it a test bug, a missing mock, a code regression, or an import error?
3. Fix the test or the source code as appropriate
4. Re-run the specific failing test to confirm the fix
5. Re-run the FULL suite once all individual fixes confirmed

Follow existing test patterns from conftest.py:
- Use `client` fixture from conftest (never define local client)
- Use `vendor_auth_headers` / `admin_auth_headers` fixtures for auth
- Mock external services (Stripe, SMTP, Firebase) — never call real services

Commit fixes with: `fix(quick-102): fix failing tests — [description]`
  </action>
  <verify>Full test suite passes: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -v` returns exit code 0.</verify>
  <done>All tests pass. If fixes were needed, they are committed with clear descriptions.</done>
</task>

</tasks>

<verification>
- `python -m pytest tests/ -v` exits with code 0
- Total test count >= 1086 (prior baseline)
- All 24 Phase 10 tests (test_order_chat, test_support_chat, test_voice_agent) appear as PASSED
- No new skip/xfail markers added to hide failures
</verification>

<success_criteria>
Full backend test suite passes with zero failures. Test count >= 1086. All 24 new Phase 10 tests confirmed passing. Any regressions fixed and committed.
</success_criteria>

<output>
After completion, create `.planning/quick/102-run-full-backend-test-suite-verify-all-t/102-SUMMARY.md`
</output>
