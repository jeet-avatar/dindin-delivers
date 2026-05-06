---
phase: quick-322
plan: 01
subsystem: arthabuild-email-observability
tags: [observability, audit-log, smtp, transactional-email, arthabuild]
requires:
  - audit_utils.py:write_audit_event (unchanged)
  - models.py:AuditLog (unchanged)
  - database.py:AsyncSessionLocal (unchanged)
provides:
  - "_audit_email_send helper in email_utils.py"
  - "11 try/except wrappers around fm.send_message"
  - "audit_logs rows tagged email.<type>.sent / email.<type>.failed"
affects:
  - "every send_*_email function in email_utils.py (all 11)"
  - "operator visibility into SMTP outcomes (was: invisible)"
tech_stack:
  added: []
  patterns:
    - "BackgroundTask audit-log pattern: own AsyncSessionLocal session per call"
    - "absorb-exception contract preserved (callers fire-and-forget or wrap in their own try/except)"
key_files:
  created:
    - /Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py
  modified:
    - /Users/jeet/arthaBuild/src/backend/email_utils.py
decisions:
  - "Encode error class+message into existing audit_logs.target column (Option A) — avoids touching shared write_audit_event util"
  - "Open own AsyncSessionLocal session per audit write — matches netsuite.py:383, deploy.py:137, brd/runtime.py:197"
  - "Never re-raise from send_*_email — preserves 4 of 4 caller absorb/fire-forget contracts"
  - "Import database module (not symbol) inside helper so monkeypatch.setattr in tests takes effect"
metrics:
  duration_min: 18
  completed: 2026-05-06T06:36:34Z
  tasks_executed: 6
  files_changed: 2
  insertions: 392
  deletions: 11
---

# Quick Task 322: SMTP Observability — try/except + audit_logs around every fm.send_message()

## One-liner

Wrap all 11 `fm.send_message()` call sites in `email_utils.py` with try/except + audit_logs write, closing the observability gap surfaced by the Peter signup incident on 2026-05-05.

## Context

**Trigger:** Peter (peter@techcloudpro.com) signed up on artha.build at 2026-05-06 03:53:21 UTC and reported no magic-link email received. Backend logs showed zero SMTP errors. Diagnosis (`.planning/debug/arthabuild-peter-signup-email-not-sent-2026-05-05.md`) found that `email_utils.py` had no try/except around `fm.send_message()` and no post-send audit row — every SMTP outcome was invisible past the submission point.

**Goal:** Make every transactional email send produce an `audit_logs` row with `action='email.<type>.sent'` (success) or `action='email.<type>.failed'` (failure with error class + truncated message). No behavior change — preserve absorb-exception contract.

## What Changed

### File 1: `/Users/jeet/arthaBuild/src/backend/email_utils.py` (+225 / -11 lines)

1. **Added `_audit_email_send()` helper** at line 591 (immediately after `_list_unsub_headers`):
   - Opens own `AsyncSessionLocal` session (BackgroundTask context — no Depends-injected db)
   - Imports `database` MODULE (not symbol) so `monkeypatch.setattr` in tests works
   - Encodes errors as `target="error:<ClassName>:<truncated 200-char message>"`
   - Swallows audit-write failures with logger.warning (observability gap > broken email path)

2. **Wrapped 11 `fm.send_message()` call sites** in try/except + audit:

   | Function | email_type tag |
   |---|---|
   | send_verification_email | `verification` |
   | send_reset_email | `password_reset` |
   | send_admin_reset_email | `admin_reset` |
   | send_invite_email | `invite` |
   | send_welcome_email | `welcome` |
   | send_password_changed_email | `password_changed` |
   | send_script_deployed_email | `script_deployed` |
   | send_quota_warning_email | `quota_warning` |
   | send_magic_link_email | `magic_link` |
   | send_signup_request_received_email | `signup_request_received` |
   | send_netsuite_connect_request_email | `netsuite_connect_request` (uses `NETSUITE_CONNECT_RECIPIENTS[0]` as primary recipient) |

### File 2: `/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py` (new, 167 lines)

Six new tests + one autouse fixture:

- `override_session_local` (autouse, REQUIRED) — points `database.AsyncSessionLocal` at the test in-memory `TestSessionLocal` so audit rows written by the helper are visible to `db_session`
- `test_audit_email_send_success_writes_row` — success path
- `test_audit_email_send_failure_writes_row_with_error` — failure path encodes error
- `test_audit_email_send_truncates_long_error_message` — 200-char cap
- `test_audit_email_send_never_raises_when_db_explodes` — absorb contract
- `test_send_magic_link_email_writes_success_audit` — end-to-end success
- `test_send_magic_link_email_writes_failure_audit_and_does_not_raise` — end-to-end failure + non-propagation

## Verification — Pre-flight Gate (Task 1)

All 8 planner-verified facts re-confirmed against current code:

| Check | Expected | Actual | Result |
|---|---|---|---|
| 11 fm.send_message lines | 602/617/632/649/665/681/696/712/733/752/851 | match | PASS |
| 11 send_* defs | 590/605/620/635/652/668/684/699/715/736/812 | match | PASS |
| AuditLog schema | action(req)+result+target+detail | unchanged | PASS |
| write_audit_event signature | (db, actor_email, actor_role, action, result, ip_address?, target?) | unchanged | PASS |
| AsyncSessionLocal export | expire_on_commit=False | unchanged | PASS |
| email_utils.py clean | no uncommitted changes | clean | PASS |
| pytest baseline | 546 passed / 54 failed / 18 skipped | exact match | PASS |
| Prod SSH reachable | arthaBuild-backend, arthaBuild-nginx, arthaBuild-ollama running | all 3 healthy | PASS |

Baseline file: `/tmp/322-preflight-baseline.txt`

## Verification — Code Change (Task 2)

| Invariant | Expected | Actual |
|---|---|---|
| `_audit_email_send` helper count | 1 def + 22 invocations = 23 | **23** PASS |
| Distinct email_type tags | 11 | **11** PASS |
| Python AST parses | OK | **AST OK** PASS |
| `import email_utils` succeeds | OK + helper exists | **import OK / helper exists: True** PASS |

## Verification — Tests (Task 3)

```
$ pytest tests/test_email_utils_audit.py -v
tests/test_email_utils_audit.py::test_audit_email_send_success_writes_row PASSED
tests/test_email_utils_audit.py::test_audit_email_send_failure_writes_row_with_error PASSED
tests/test_email_utils_audit.py::test_audit_email_send_truncates_long_error_message PASSED
tests/test_email_utils_audit.py::test_audit_email_send_never_raises_when_db_explodes PASSED
tests/test_email_utils_audit.py::test_send_magic_link_email_writes_success_audit PASSED
tests/test_email_utils_audit.py::test_send_magic_link_email_writes_failure_audit_and_does_not_raise PASSED
======================== 6 passed, 2 warnings in 0.26s =========================
```

| Suite | Pre-edit baseline | Post-edit | Delta |
|---|---|---|---|
| Full pytest | 546 passed / 54 failed / 18 skipped | **552 passed / 54 failed / 18 skipped** | **+6 passes, 0 new failures** |
| test_magic_link_signup + test_netsuite_connect_request | (subset of baseline) | **21 passed / 0 failed** | zero regression |

## Verification — Commit (Task 4)

- **Repo:** `/Users/jeet/arthaBuild` (standalone, NOT dindin monorepo)
- **Branch:** `main`
- **Commit SHA:** `b874c63fa67e9d4b6be6273f702407e1fa17a1a6`
- **Files changed:** 2 (email_utils.py +225/-11, test_email_utils_audit.py +167/0)
- **Pushed:** `475e4dd..b874c63 main -> main` to `github.com/jeet-avatar/arthabuild`
- **Rollback artifact:** `/tmp/322-commit-sha.txt`

## Verification — Prod Deploy (Task 5)

Deploy mechanism note: prod EC2 (`44.194.34.223`) has the arthaBuild source as a plain directory under `/home/ubuntu/arthaBuild/` — **NOT a git checkout**. The plan assumed `git pull` but reality is scp-based deploy. Deviation logged below.

| Step | Detail |
|---|---|
| Pre-deploy backend container ID | `762b6a9f2bb8` |
| Rollback baseline (md5 of prod email_utils.py) | `ffb9ec5c64a38564d06f8581db4b8535` |
| Prod backup file | `/home/ubuntu/arthaBuild/src/backend/email_utils.py.322-rollback` |
| Files SCPed | `email_utils.py` (1065 lines, md5 `8d5da9e9...`), `test_email_utils_audit.py` (167 lines) |
| Image rebuild | `docker compose build backend` → `arthabuild-backend:latest` (sha256 `1782f3f8...`) |
| Force-recreate | `docker compose up -d --no-deps --force-recreate backend` |
| Post-deploy backend container ID | `1b9a8f6c57fa` (NEW container, confirms recreation) |
| In-container code check | `grep -oE 'email_type="[a-z_]+"' /app/email_utils.py \| sort -u` returns **11 unique tags** |
| Container `/health` | `{"status":"ok"}` (200) |
| Public `/health` (browser UA) | 200 (default curl returns 403 — known WAF behavior, see `feedback_brandmonkz_403_is_waf_not_outage.md`) |
| Backend logs (90s window) | zero NEW errors / exceptions / tracebacks |

## Verification — Live Prod Acceptance (Task 6)

**THIS IS THE PRIMARY ACCEPTANCE GATE.**

| Step | Value |
|---|---|
| Test email | `jeetnair.in+322-test-1778049378@gmail.com` |
| PRE_MAX_ID (audit_logs.id high-water mark) | **426** |
| POST timestamp | 2026-05-06T06:36:24Z |
| POST response | HTTP 200 `{"message":"If your email is valid, you'll receive a sign-in link within a minute. Check your spam folder if you don't see it."}` |
| Audit-row poll | found within ~10 seconds (06:36:34Z) |

### Audit rows produced (id > 426)

```
id  | action                              | result   | actor_email                                       | target | created_at
----|-------------------------------------|----------|---------------------------------------------------|--------|----------------------------
427 | signup.user_created_via_magic_link  | success  | jeetnair.in+322-test-1778049378@gmail.com         | None   | 2026-05-06 06:36:24.079631
428 | signup.magic_link_issued            | success  | jeetnair.in+322-test-1778049378@gmail.com         | None   | 2026-05-06 06:36:24.084069
429 | email.magic_link.sent               | success  | jeetnair.in+322-test-1778049378@gmail.com         | None   | 2026-05-06 06:36:24.800463
```

### Pass criteria — ALL TRUE

- [x] `email.magic_link.sent` row exists in audit_logs (row 429) — **NEW INSTRUMENTATION WORKING**
- [x] result = 'success'
- [x] actor_email matches `jeetnair.in+322-test-1778049378@gmail.com`
- [x] created_at = 06:36:24.800, POST was 06:36:24Z — **delta = ~800ms** (well under 60s window)
- [x] target IS NULL (success path, no error encoded)
- [x] No `email.magic_link.failed` row — SMTP submission succeeded in prod
- [x] Total post-test audit rows = 3 (expected user_created → magic_link_issued → email.sent), NOT >50 — confirms PRE_MAX_ID expansion in SSH heredoc worked correctly

### What this proves

1. **Backend correctly executes the new try/except + audit-write code path** — the `email.magic_link.sent` row at id=429 simply did not exist before this change.
2. **SMTP submission to Gmail succeeded** — `fm.send_message()` returned without raising at 06:36:24.800Z.
3. **The Peter signup gap is now observable** — any future "did the email send?" question can be answered by SQL: `SELECT COUNT(*), action, result FROM audit_logs WHERE action LIKE 'email.%' GROUP BY action, result;`

### Mailbox delivery (Step 6.6 — out of scope)

Per the plan and the `arthabuild-peter-signup-email-not-sent-2026-05-05.md` debug session: the audit row reflects "Gmail SMTP accepted the message" — final inbox delivery is opaque to us (Gmail Promotions tab, alias deferral, corporate Workspace spam quarantine all happen post-submission). The user can verify mailbox arrival manually at `jeetnair.in@gmail.com` (search for "+322-test-1778049378"); not part of the acceptance gate.

## Deviations from Plan

### [Rule 3 — Blocking] Plan assumed `git pull` on prod, but prod has no `.git` directory

- **Found during:** Task 5
- **Issue:** `<grep_verified_facts>` F6 said "App dir on EC2: `/home/ubuntu/arthaBuild/`" and the deploy procedure (Step 5.3) said `git fetch origin main && git pull origin main`. Reality: prod is a plain directory deployed via scp/tar, no `.git`. `git rev-parse HEAD` returned `fatal: not a git repository`.
- **Fix:** Captured the rollback baseline as `md5sum` of the current prod `email_utils.py` (`ffb9ec5c64a38564d06f8581db4b8535`) instead of a prod git SHA. Created `/home/ubuntu/arthaBuild/src/backend/email_utils.py.322-rollback` as a binary backup. Used `scp` to push the new files. Rebuild + force-recreate proceeded as planned.
- **Files modified on prod:** `src/backend/email_utils.py` (overwritten), `src/backend/tests/test_email_utils_audit.py` (new). Backup at `email_utils.py.322-rollback`.
- **Commit:** N/A (deploy-time finding, not a code change)

### [Rule 3 — Blocking] Test file import `from tests.conftest import` failed

- **Found during:** Task 3 (first pytest run)
- **Issue:** Plan template said `from tests.conftest import TestSessionLocal`. ModuleNotFoundError because pytest in this repo has rootdir = `tests/` (per `pytest.ini` line 1) and `tests` is not a package.
- **Fix:** Changed to `from conftest import TestSessionLocal` — matches existing pattern in `tests/test_user.py:374,412`.
- **Commit:** Included in `b874c63` (single commit per plan).

## Authentication Gates

None encountered. Gmail SMTP credentials valid (verified during the live test — prod produced an `email.magic_link.sent` SUCCESS row).

## Self-Check

Files claimed:
- `/Users/jeet/arthaBuild/src/backend/email_utils.py` — FOUND (md5 `8d5da9e90fd49d47541641f7cae871c3`, 1065 lines)
- `/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py` — FOUND (167 lines)

Commit claimed:
- `b874c63fa67e9d4b6be6273f702407e1fa17a1a6` on arthaBuild main — FOUND in `git log -1`

Prod artifacts:
- `/home/ubuntu/arthaBuild/src/backend/email_utils.py` md5 = `8d5da9e90fd49d47541641f7cae871c3` (matches local)
- `arthaBuild-backend` container id `1b9a8f6c57fa` running new image
- audit_logs row id=429 `email.magic_link.sent` SUCCESS for `jeetnair.in+322-test-1778049378@gmail.com` at 2026-05-06 06:36:24.800463 UTC

Rollback artifacts:
- `/tmp/322-commit-sha.txt` = `b874c63fa67e9d4b6be6273f702407e1fa17a1a6`
- `/tmp/322-prod-rollback-sha.txt` = `ffb9ec5c64a38564d06f8581db4b8535` (md5 of pre-deploy email_utils.py)
- Prod backup file: `/home/ubuntu/arthaBuild/src/backend/email_utils.py.322-rollback`

## Self-Check: PASSED

## Acceptance Gate Status

**PASSED** — Live prod test produced the expected `email.magic_link.sent` SUCCESS row in audit_logs within ~800ms of the POST. Peter-class observability gaps are now visible to the operator. Future SMTP failures will surface as `email.<type>.failed` rows with error class + truncated message in `target`.

The next "did the email send?" question can be answered with:
```sql
SELECT COUNT(*), action, result, MAX(created_at) AS last_seen
FROM audit_logs
WHERE action LIKE 'email.%'
GROUP BY action, result
ORDER BY last_seen DESC;
```
