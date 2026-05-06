---
phase: quick-322
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/arthaBuild/src/backend/email_utils.py
autonomous: false  # Wave 3 deploy task is checkpoint:human-verify (live prod)
requirements:
  - "OBS-322-01: Every fm.send_message() call in email_utils.py is wrapped in try/except"
  - "OBS-322-02: Successful send writes audit_logs row action='email.<type>.sent' result='success'"
  - "OBS-322-03: Failed send writes audit_logs row action='email.<type>.failed' result='failure' with error class+message in target/detail"
  - "OBS-322-04: send_*_email functions never raise to caller (preserves caller contracts — auth.py:725-726 outer try/except absorb; netsuite.py:399 inner _send_and_mark try/except; rawapi.py:1010 outer try/except absorb; routers/deploy.py:210 _aio.create_task fire-and-forget; admin.py:147 + admin.py:527 + auth.py:235 + auth.py:454 + user.py:176 + user.py:207 + user.py:244 + user.py:332 all background_tasks.add_task fire-and-forget — Starlette swallows)"
  - "OBS-322-05: BackgroundTask context (no Depends-injected db) acquires its own session via async with AsyncSessionLocal(): — same pattern used by netsuite.py:383, deploy.py:137, rawapi.py:193, brd/runtime.py:197"
  - "OBS-322-06: Live prod verification — POST to /api/auth/request-access with jeetnair.in+322-test-<ts>@gmail.com, then SELECT from audit_logs on prod confirms email.magic_link.sent row exists with result='success'"

user_setup: []  # No external service config — uses existing Gmail SMTP + existing audit_logs table

must_haves:
  truths:
    - "Every of the 11 fm.send_message() call sites in email_utils.py is wrapped in try/except (verified count via grep -c 'fm\\.send_message' = 11; line numbers 602, 617, 632, 649, 665, 681, 696, 712, 733, 752, 851)"
    - "Each successful send produces an audit_logs row with action='email.<type>.sent' and result='success'"
    - "Each failed send produces an audit_logs row with action='email.<type>.failed' and result='failure' with error class + truncated message in target field"
    - "send_*_email functions never raise an exception to their caller (matches existing absorb behavior in auth.py:724-726 and netsuite.py:369-371 inner _send_and_mark try/except)"
    - "Local pytest run after edit shows ≤54 failures (baseline = 546 passed / 54 failed / 18 skipped on 2026-05-06 measured by planner) AND zero new failures in tests/test_magic_link_signup.py or any test that imports email_utils"
    - "Production rebuild + restart of arthaBuild-backend container loads new code (verified via `docker exec arthaBuild-backend grep -c 'email\\..*\\.sent' /app/email_utils.py` returning EXACTLY 11 matches — one `.sent` per email type, matching the 11 fm.send_message call sites)"
    - "Live prod test: POST /api/auth/request-access from local curl with email jeetnair.in+322-test-<ts>@gmail.com produces a NEW row in audit_logs with action='email.magic_link.sent' result='success' within 30 seconds of the POST"
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/backend/email_utils.py"
      provides: "11 try/except + audit_log wrappers around fm.send_message + 1 helper _audit_email_send()"
      min_lines: 850  # Currently 852 lines; added wrapper helper + try/except blocks should keep it ≤950
      contains: "_audit_email_send"
    - path: "/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py"
      provides: "Unit tests for _audit_email_send helper — success path writes audit row, failure path writes audit row with error, exception is absorbed"
      min_lines: 60
  key_links:
    - from: "/Users/jeet/arthaBuild/src/backend/email_utils.py (each send_*_email function)"
      to: "/Users/jeet/arthaBuild/src/backend/audit_utils.py write_audit_event"
      via: "_audit_email_send helper -> async with AsyncSessionLocal() as db -> write_audit_event(db, ...) -> await db.commit()"
      pattern: "_audit_email_send\\(.*email_type=.*\\)"
    - from: "/Users/jeet/arthaBuild/src/backend/email_utils.py _audit_email_send"
      to: "audit_logs table"
      via: "AsyncSessionLocal() new session — same pattern as netsuite.py:383, brd/runtime.py:197"
      pattern: "async with AsyncSessionLocal\\(\\) as"
    - from: "Production POST /api/auth/request-access"
      to: "audit_logs row action='email.magic_link.sent' result='success'"
      via: "background_tasks.add_task -> send_magic_link_email -> try fm.send_message -> _audit_email_send"
      pattern: "email\\.magic_link\\.(sent|failed)"
---

<objective>
Close the SMTP observability gap on the ArthaBuild transactional email pipeline. Today, every `send_*_email` function in `email_utils.py` calls `await fm.send_message(message)` with NO try/except and NO post-send audit row. When SMTP fails (Gmail 421, network blip, App Password rotated, Workspace quarantine, anything) the failure is invisible — Starlette's BackgroundTask handler swallows it at WARNING level and no DB row records the outcome. This is exactly the gap surfaced by the Peter signup incident on 2026-05-05 (debug session at `.planning/debug/arthabuild-peter-signup-email-not-sent-2026-05-05.md`).

Purpose: Restore observability without changing behavior. Every email send produces a `audit_logs` row tagged `email.<type>.sent` (success) or `email.<type>.failed` (failure with error class + message). Existing absorb-exception contract preserved — no caller behavior regression.

Output:
- Modified `/Users/jeet/arthaBuild/src/backend/email_utils.py` — adds `_audit_email_send()` helper + try/except + audit_log call around all 11 `fm.send_message` sites.
- New `/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py` — proves the helper writes correct rows on success/failure and never raises.
- Live verification on production that a real signup produces an `email.magic_link.sent` row.

Scope: ONLY `src/backend/email_utils.py` + new test file. No edits to callers, no edits to `audit_utils.py`, no edits to `models.py`, no schema migration.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
# Verified facts (anti-hallucination — every claim grep-verified by planner 2026-05-05)
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/arthaBuild/src/backend/email_utils.py    # Full file, 852 lines
@/Users/jeet/arthaBuild/src/backend/audit_utils.py    # write_audit_event signature: (db, actor_email, actor_role, action, result, ip_address?, target?) → caller commits
@/Users/jeet/arthaBuild/src/backend/database.py        # AsyncSessionLocal at line 15 — canonical session factory
@/Users/jeet/arthaBuild/src/backend/models.py          # AuditLog at line 166 — columns: actor_email, actor_role, action, result, ip_address, target, admin_id, target_user_id, detail, created_at, prev_hash, row_hash

# Caller pattern context (so executor verifies "absorb-exception" decision matches reality)
@/Users/jeet/arthaBuild/src/backend/routers/auth.py    # auth.py:724 — try/except absorb pattern
@/Users/jeet/arthaBuild/src/backend/routers/netsuite.py # netsuite.py:369-401 — inner async helper with try/except + marker write

# The debug session that found this gap
@/Users/jeet/doordash-p2p/.planning/debug/arthabuild-peter-signup-email-not-sent-2026-05-05.md

# Locked policy — Gmail SMTP only for transactional, never Resend
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/reference_arthabuild_resend_key.md
</context>

<grep_verified_facts>

## Planner-verified facts (each commands re-runnable by executor for confirmation)

### F1. Email function inventory (11 fm.send_message call sites across 11 functions)

Command: `grep -nE "^(async )?def send_" /Users/jeet/arthaBuild/src/backend/email_utils.py`

Result (verified 2026-05-05 22:00 PT):
```
590:async def send_verification_email(to_email: str, verify_link: str = "")
605:async def send_reset_email(to_email: str, reset_link: str)
620:async def send_admin_reset_email(to_email: str, reset_link: str, admin_name: str)
635:async def send_invite_email(to_email: str, raw_token: str)
652:async def send_welcome_email(to_email: str, first_name: str)
668:async def send_password_changed_email(to_email: str, first_name: str)
684:async def send_script_deployed_email(to_email: str, first_name: str, script_name: str, target_env: str)
699:async def send_quota_warning_email(to_email: str, first_name: str, used: int, limit: int)
715:async def send_magic_link_email(to_email: str, name: str, magic_link: str, expiry_hours: int = 24)
736:async def send_signup_request_received_email(to_email: str, name: str)
812:async def send_netsuite_connect_request_email(...)
```

Command: `grep -n "fm\.send_message" /Users/jeet/arthaBuild/src/backend/email_utils.py`

Result (11 call sites, lines):
```
602, 617, 632, 649, 665, 681, 696, 712, 733, 752, 851
```

Mapping (function name → line of fm.send_message → audit action tag):
| Function | fm.send_message line | action tag (success/failure) |
|---|---|---|
| send_verification_email | 602 | email.verification.sent / email.verification.failed |
| send_reset_email | 617 | email.password_reset.sent / email.password_reset.failed |
| send_admin_reset_email | 632 | email.admin_reset.sent / email.admin_reset.failed |
| send_invite_email | 649 | email.invite.sent / email.invite.failed |
| send_welcome_email | 665 | email.welcome.sent / email.welcome.failed |
| send_password_changed_email | 681 | email.password_changed.sent / email.password_changed.failed |
| send_script_deployed_email | 696 | email.script_deployed.sent / email.script_deployed.failed |
| send_quota_warning_email | 712 | email.quota_warning.sent / email.quota_warning.failed |
| send_magic_link_email | 733 | email.magic_link.sent / email.magic_link.failed |
| send_signup_request_received_email | 752 | email.signup_request_received.sent / email.signup_request_received.failed |
| send_netsuite_connect_request_email | 851 | email.netsuite_connect_request.sent / email.netsuite_connect_request.failed |

### F2. audit_logs schema (models.py:166-183)

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    actor_email     = Column(String, nullable=True)
    actor_role      = Column(String, nullable=True)
    action          = Column(String, nullable=False)   # ← required
    result          = Column(String, nullable=True)    # "success" | "failure"
    ip_address      = Column(String, nullable=True)
    target          = Column(String, nullable=True)
    # Phase 10 legacy
    admin_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_user_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    detail          = Column(String, nullable=True)    # ← we use this for error message on failure
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    prev_hash       = Column(String, nullable=True)
    row_hash        = Column(String, nullable=True)
```

NOTE: NO `details` JSON column. NO `metadata` column. We have `detail` (string) only — error class + truncated message goes there.

### F3. write_audit_event signature (audit_utils.py:20-63)

```python
async def write_audit_event(
    db: AsyncSession,
    actor_email: str,
    actor_role: str,
    action: str,
    result: str,                    # "success" | "failure"
    ip_address: str | None = None,
    target: str | None = None,
) -> None:
    # Caller MUST commit. Computes prev_hash/row_hash chain.
```

⚠️ The function does NOT accept a `detail` kwarg. Two options:
- **Option A (chosen):** Encode error class + message into `target` field (already a freeform string). Format: `"error:<ExceptionClass>:<truncated 200-char message>"`. Pre-existing rows use `target` for `user_id|email|config_key`, our format prefixed with `error:` is unambiguous and queryable (`WHERE target LIKE 'error:%'`).
- Option B: Modify `write_audit_event` to accept `detail`. REJECTED — touches shared util, expands blast radius.

Decision: Option A.

### F4. Caller patterns — verified absorb behavior in 4 of 4 awaited callers

Command: `grep -rn "send_..*_email\|send_netsuite_connect_request_email" /Users/jeet/arthaBuild/src/backend/ --include="*.py" | grep -v email_utils.py | grep -v __pycache__`

Result (production callers — non-test):
```
admin.py:147       background_tasks.add_task(send_invite_email, ...)        # fire-and-forget, NO wrap
admin.py:527       background_tasks.add_task(send_admin_reset_email, ...)   # fire-and-forget, NO wrap
auth.py:235        background_tasks.add_task(send_reset_email, ...)         # fire-and-forget, NO wrap
auth.py:454        background_tasks.add_task(send_magic_link_email, ...)    # fire-and-forget, NO wrap
auth.py:724        await send_welcome_email(...) inside try/except: pass    # ALREADY ABSORBS
routers/deploy.py:210      _aio.create_task(send_script_deployed_email(...))        # fire-and-forget, NO wrap
netsuite.py:371    await send_netsuite_connect_request_email INSIDE inner async with try/except  # ALREADY ABSORBS
rawapi.py:1010     _warn_aio.create_task(send_quota_warning_email(...)) inside try/except  # ALREADY ABSORBS
user.py:176        background_tasks.add_task(send_verification_email, ...)  # fire-and-forget, NO wrap
user.py:207        background_tasks.add_task(send_welcome_email, ...)       # fire-and-forget, NO wrap
user.py:244        background_tasks.add_task(send_verification_email, ...)  # fire-and-forget, NO wrap
user.py:332        send_password_changed_email (background_tasks.add_task)  # fire-and-forget, NO wrap
```

**Decision: send_*_email MUST NOT raise to caller.** All current callers either fire-and-forget (Starlette swallows) or wrap in try/except absorb. Re-raising would be a NEW behavior. Per `auth.py:725-726` comment: "Never block login due to email failure". Plan absorbs exceptions inside `send_*_email` after writing the failed audit row.

### F5. AsyncSessionLocal usage outside Depends (canonical pattern)

Command: `grep -rn "async with AsyncSessionLocal()" /Users/jeet/arthaBuild/src/backend/ --include="*.py"`

Established sites (used by code outside FastAPI request-scope):
- `rawapi.py:193`, `rawapi.py:421`, `rawapi.py:842`, `rawapi.py:981`, `rawapi.py:1000`
- `routers/deploy.py:137`, `routers/deploy.py:176`
- `routers/netsuite.py:383` (inside inner `_send_and_mark` background helper — direct precedent for our case)
- `middleware/api_key_auth.py:52`
- `brd/runtime.py:197`, `brd/runtime.py:269`, `brd/runtime.py:336`

Pattern: `from database import AsyncSessionLocal; async with AsyncSessionLocal() as db: ... await db.commit()`

This is the canonical pattern. We use it.

### F6. Production deploy facts

- EC2 host: `ubuntu@44.194.34.223` (verified `infra/terraform/outputs.tf:12`, `scripts/activate-staging.sh:6`, `scripts/cloudflare-setup.sh:25`, `data/brd_corpus_sources/artha-technical.md:105`)
- SSH key: `~/.ssh/techcloudpro-key-1764031372.pem` (verified `scripts/activate-staging.sh:7`, exists at `/Users/jeet/.ssh/techcloudpro-key-1764031372.pem`)
- App dir on EC2: `/home/ubuntu/arthaBuild/` (verified `docs/STAGING_LOG.md:25`)
- Container name: `arthaBuild-backend` (verified `docker-compose.yml:52` + previous live verification in MEMORY.md)
- Backend code is **baked into Docker image** at build time (Dockerfile:78 `COPY --from=builder /app/email_utils.py /app/email_utils.py`). Therefore `scp + docker compose restart backend` will NOT pick up changes. We MUST `docker compose up -d --build backend` (verified via `docs/superpowers/plans/2026-04-14-deploy-q284-q288.md:288-308`).
- Prod DB path inside container: `/app/data/arthaBuild.db` (verified `docker-compose.yml:60`). The `/app/data` directory is backed by a **Docker named volume `app_data`** (verified `docker-compose.yml:69, 110`), NOT a host bind mount. Therefore: (a) we cannot just `cp` the DB out of the host filesystem to read it; we must `docker exec` into the container; (b) reading the live DB while uvicorn is actively writing risks `database is locked` — use the read-only SQLite URI `file:/app/data/arthaBuild.db?mode=ro` for verification queries to avoid acquiring write locks.

### F7. Local pytest baseline

Command: `cd /Users/jeet/arthaBuild/src/backend && pytest -q`

Result (planner ran 2026-05-05 22:14 PT, 40.14s):
```
546 passed, 54 failed, 18 skipped, 2 warnings
618 tests collected
```

The 54 failures are PRE-EXISTING (not caused by this plan). Acceptance gate: post-edit run shows **≤54 failures** AND zero new failures in any file matching `test_email_utils*` or `test_magic_link_signup*` or `test_netsuite_connect_request*`.

### F8. Repo cleanliness

Command: `cd /Users/jeet/arthaBuild && git status --short`

Result:
```
 M .gitignore
?? data/customer_knowledge/
?? infra/terraform/bootstrap/
?? infra/terraform/customer-zero.tfvars
?? infra/terraform/per-customer-vpc/
?? scripts/e2e-browser-audit.mjs
?? src/frontend/scripts/e2e-browser-audit.mjs
```

`email_utils.py` is clean. No conflict. Commit ONLY `src/backend/email_utils.py` + `src/backend/tests/test_email_utils_audit.py`. Do NOT touch the unrelated dirty files.

### F9. Resend / Gmail policy (locked)

Per `MEMORY.md` entry `reference_arthabuild_resend_key.md` (LOCKED 2026-05-05): ArthaBuild transactional emails go via Gmail SMTP (`fastapi_mail` / `aiosmtplib`). Resend is marketing-only. This plan does NOT change the email backend — it only adds observability around `fm.send_message()` (the Gmail path). No env var changes. No new dependency.

</grep_verified_facts>

<tasks>

<task type="auto">
  <name>Task 1 (Wave 1): PRE-FLIGHT GATE — re-verify planner facts and baseline test count</name>
  <files>(read-only — no writes in this task)</files>
  <action>
Before ANY edit to email_utils.py, the executor MUST re-run the planner's grep verifications and pytest baseline. If any output differs from the values in <grep_verified_facts>, STOP and ask the user — the codebase changed under the planner.

Required commands (run in order, all from /Users/jeet/arthaBuild):

1) Confirm 11 fm.send_message call sites at expected lines:
   `grep -n "fm\.send_message" src/backend/email_utils.py`
   Expected: lines 602, 617, 632, 649, 665, 681, 696, 712, 733, 752, 851 (11 lines).

2) Confirm 11 send_* function definitions at expected lines:
   `grep -nE "^(async )?def send_" src/backend/email_utils.py`
   Expected: 590, 605, 620, 635, 652, 668, 684, 699, 715, 736, 812 (11 lines).

3) Confirm AuditLog schema unchanged:
   `sed -n '166,184p' src/backend/models.py`
   Expected: contains `action`, `result`, `target`, `detail` columns. No new required NOT NULL fields beyond `action`.

4) Confirm write_audit_event signature unchanged:
   `sed -n '20,30p' src/backend/audit_utils.py`
   Expected: signature `async def write_audit_event(db, actor_email, actor_role, action, result, ip_address=None, target=None)`.

5) Confirm AsyncSessionLocal export unchanged:
   `sed -n '15,20p' src/backend/database.py`
   Expected: `AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)`.

6) Confirm git working tree on email_utils.py is clean:
   `git diff --stat src/backend/email_utils.py`
   Expected: empty output (no uncommitted changes).

7) Capture pytest baseline:
   `cd src/backend && pytest -q 2>&1 | tail -3`
   Expected: matches "X passed, Y failed, Z skipped" with X=546±20, Y=54±10. Record exact numbers in BASELINE_TESTS.txt for the verify task to compare against.

8) Confirm prod is reachable:
   `ssh -i ~/.ssh/techcloudpro-key-1764031372.pem -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@44.194.34.223 "docker ps --format '{{.Names}}'" 2>&1`
   Expected: list contains `arthaBuild-backend`, `arthaBuild-nginx`, `arthaBuild-ollama`. If SSH fails, STOP — Wave 3 deploy needs this.

If ANY check fails or returns unexpected output, STOP and ask user. Do not edit email_utils.py until all 8 checks pass.

After all checks pass, write `/tmp/322-preflight-baseline.txt` with:
- pytest baseline: "PASSED=<n> FAILED=<n> SKIPPED=<n>"
- timestamp of preflight
  </action>
  <verify>
All 8 commands above succeed and produce expected output. `/tmp/322-preflight-baseline.txt` exists with baseline numbers.
  </verify>
  <done>
Planner facts re-verified against current codebase. pytest baseline captured. Prod SSH reachable. Safe to edit.
  </done>
</task>

<task type="auto">
  <name>Task 2 (Wave 1): Add _audit_email_send helper + try/except + audit row to all 11 send_*_email functions</name>
  <files>/Users/jeet/arthaBuild/src/backend/email_utils.py</files>
  <action>
Edit `/Users/jeet/arthaBuild/src/backend/email_utils.py`.

### Step 2.1 — Add the helper function (one place, used by all 11 sites)

Insert immediately AFTER the existing `_list_unsub_headers` function (around line 588, just before `async def send_verification_email` at line 590) the following helper. This keeps the helper above all consumers, no forward references:

```python
# ---------------------------------------------------------------------------
# Phase 322 — SMTP observability: audit every fm.send_message() outcome.
# Writes one row to audit_logs per send (success or failure). NEVER raises —
# preserves the existing absorb-exception contract used by all callers
# (admin.py, auth.py, user.py, deploy.py, netsuite.py, rawapi.py).
# ---------------------------------------------------------------------------
async def _audit_email_send(
    email_type: str,
    to_email: str,
    success: bool,
    error: Exception | None = None,
) -> None:
    """Write an audit_logs row for an SMTP send outcome.

    email_type: short tag, e.g. "magic_link", "verification", "welcome".
                Becomes audit action: f"email.{email_type}.sent" or "...failed".
    to_email:   recipient address — recorded as actor_email so audit trail
                links the row to the user even if they have no account row yet
                (e.g. magic-link signup).
    success:    True if fm.send_message returned without raising.
    error:      Exception instance on failure. Class name + first 200 chars
                of the message are encoded into the audit `target` field as
                "error:<ClassName>:<message>" (audit_utils.write_audit_event
                does not accept a detail kwarg today; target is the only
                freeform string column we have).

    Contract: this function MUST NOT raise. If audit write itself fails
    (DB locked, sqlite full, alembic migration mid-flight, etc.) we log
    at WARNING and swallow — observability gap is preferable to taking
    down the email path.
    """
    action = f"email.{email_type}.sent" if success else f"email.{email_type}.failed"
    result = "success" if success else "failure"
    target: str | None = None
    if not success and error is not None:
        msg = str(error)
        if len(msg) > 200:
            msg = msg[:200]
        target = f"error:{type(error).__name__}:{msg}"

    # Open a fresh session — same pattern as routers/netsuite.py:383,
    # routers/deploy.py:137, brd/runtime.py:197. We are running inside a
    # FastAPI BackgroundTask (or asyncio.create_task) where there is no
    # request-scoped Depends-injected db.
    try:
        # Imports are local to keep email_utils.py importable even if
        # database/audit_utils ever change shape (defensive).
        from database import AsyncSessionLocal
        from audit_utils import write_audit_event

        async with AsyncSessionLocal() as db:
            await write_audit_event(
                db,
                actor_email=to_email,
                actor_role="user",          # All transactional email recipients are user-role
                action=action,
                result=result,
                ip_address=None,            # Not available in BackgroundTask context
                target=target,
            )
            await db.commit()
    except Exception as audit_err:
        # Audit write itself blew up. Do NOT propagate — log only.
        logger.warning(
            f"_audit_email_send failed for {email_type} to {to_email}: "
            f"{type(audit_err).__name__}: {audit_err}"
        )
```

### Step 2.2 — Wrap each of the 11 fm.send_message() call sites

For EACH of the 11 functions, replace the single line `await fm.send_message(message)` with the try/except + audit pattern below. The exact `email_type` tag for each function is in F1's table.

**Pattern (copy-paste, adjust only `email_type=`):**

Before (example for send_magic_link_email at line 733):
```python
    await fm.send_message(message)
```

After:
```python
    try:
        await fm.send_message(message)
        await _audit_email_send(email_type="magic_link", to_email=to_email, success=True)
    except Exception as send_err:
        logger.exception(
            f"send_magic_link_email failed for {to_email}: "
            f"{type(send_err).__name__}: {send_err}"
        )
        await _audit_email_send(
            email_type="magic_link", to_email=to_email,
            success=False, error=send_err,
        )
        # NOTE: We do NOT re-raise. Matches existing absorb contract:
        #   - auth.py:724-726 wraps await send_welcome_email in try/except: pass
        #   - netsuite.py:369-401 wraps in inner try/except + marker
        #   - all background_tasks.add_task callers fire-and-forget anyway
        # Re-raising would be a NEW behavior — explicitly out of scope.
```

⚠️ **For `send_netsuite_connect_request_email` (line 851)**: the recipient is `NETSUITE_CONNECT_RECIPIENTS` (a list — hello@artha.build + artha.build@artha.build), not a single `to_email` parameter. Use the FIRST recipient as `to_email` for the audit row (matches "primary recipient" semantic):
```python
    try:
        await fm.send_message(message)
        await _audit_email_send(
            email_type="netsuite_connect_request",
            to_email=NETSUITE_CONNECT_RECIPIENTS[0] if NETSUITE_CONNECT_RECIPIENTS else "unknown",
            success=True,
        )
    except Exception as send_err:
        logger.exception(
            f"send_netsuite_connect_request_email failed for {user_email}: "
            f"{type(send_err).__name__}: {send_err}"
        )
        await _audit_email_send(
            email_type="netsuite_connect_request",
            to_email=NETSUITE_CONNECT_RECIPIENTS[0] if NETSUITE_CONNECT_RECIPIENTS else "unknown",
            success=False, error=send_err,
        )
```

### Full mapping for the 11 sites — apply ALL 11

| send_* function | line of fm.send_message | email_type |
|---|---|---|
| send_verification_email | 602 | `"verification"` |
| send_reset_email | 617 | `"password_reset"` |
| send_admin_reset_email | 632 | `"admin_reset"` |
| send_invite_email | 649 | `"invite"` |
| send_welcome_email | 665 | `"welcome"` |
| send_password_changed_email | 681 | `"password_changed"` |
| send_script_deployed_email | 696 | `"script_deployed"` |
| send_quota_warning_email | 712 | `"quota_warning"` |
| send_magic_link_email | 733 | `"magic_link"` |
| send_signup_request_received_email | 752 | `"signup_request_received"` |
| send_netsuite_connect_request_email | 851 | `"netsuite_connect_request"` (use NETSUITE_CONNECT_RECIPIENTS[0]) |

### What NOT to do

- Do NOT modify the SMTP_CONFIGURED early-return blocks at the top of each function. The `if not SMTP_CONFIGURED: ... return` path stays unchanged — no audit row is written when SMTP is not configured (test/local dev). Production has SMTP_CONFIGURED=True so this only affects local dev/CI behavior.
- Do NOT modify any function signature.
- Do NOT modify imports at the top of the file (database/audit_utils imports are inside the helper to avoid import-cycle risk and to keep the existing top-of-file import block clean).
- Do NOT touch any caller. `routers/auth.py`, `routers/user.py`, `routers/admin.py`, `routers/deploy.py`, `routers/netsuite.py`, `rawapi.py` — UNCHANGED.
- Do NOT touch `audit_utils.py`. Use it as-is.
- Do NOT add a new `details` column to AuditLog. We use the existing `target` column.

### After-edit invariants

After all 11 edits, the following greps must hold:

```bash
# 11 try blocks (one per send_* function) — must equal 11
grep -c "try:\$" src/backend/email_utils.py | head    # baseline existing count + 11

# All 11 fm.send_message lines must now be inside a try block — verify by checking
# that "await fm.send_message(message)" is followed by "await _audit_email_send"
# within the next 5 lines.
grep -A 5 "await fm.send_message(message)" src/backend/email_utils.py | grep -c "_audit_email_send(email_type="
# Expected: 22 (11 success calls + 11 failure calls)

# 11 distinct email_type values must appear
grep -oE 'email_type="[a-z_]+"' src/backend/email_utils.py | sort -u | wc -l
# Expected: 11

# _audit_email_send helper exists exactly once
grep -c "^async def _audit_email_send" src/backend/email_utils.py
# Expected: 1
```

If any of these greps fails, fix before proceeding.
  </action>
  <verify>
Run the four invariant greps above — all must produce expected counts. Then:

`cd /Users/jeet/arthaBuild/src/backend && python -c "import email_utils; print('import OK'); print('helper exists:', hasattr(email_utils, '_audit_email_send'))"`
Expected output: `import OK` then `helper exists: True`.

`cd /Users/jeet/arthaBuild/src/backend && python -c "import ast; ast.parse(open('email_utils.py').read()); print('AST OK')"`
Expected: `AST OK`.
  </verify>
  <done>
- email_utils.py contains exactly one `_audit_email_send` helper function
- All 11 fm.send_message() call sites wrapped in try/except with success+failure audit calls (22 _audit_email_send invocations total)
- 11 distinct email_type tags used
- File still imports cleanly (no syntax error)
- No caller files modified
  </done>
</task>

<task type="auto">
  <name>Task 3 (Wave 2): Write unit tests for _audit_email_send + run full pytest, compare to baseline</name>
  <files>/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py</files>
  <action>
Create new test file `/Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py`. Use existing conftest.py fixtures (in-memory SQLite already wired). Follow test patterns from `tests/test_magic_link_signup.py` (existing email-adjacent test).

### Required test coverage

```python
"""
Phase quick-322 — observability tests for _audit_email_send helper and
the new try/except wrappers around fm.send_message in email_utils.py.

Architecture layer: cross-cutting (instrumentation).
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_audit_email_send_success_writes_row(db_session):
    """Success path: writes audit_logs row with action='email.<type>.sent' result='success'."""
    from email_utils import _audit_email_send
    from models import AuditLog

    await _audit_email_send(email_type="magic_link", to_email="alice@example.com", success=True)

    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "email.magic_link.sent")
    )).scalars().all()
    assert len(rows) == 1
    row = rows[0]
    assert row.result == "success"
    assert row.actor_email == "alice@example.com"
    assert row.target is None  # success has no error encoded


@pytest.mark.asyncio
async def test_audit_email_send_failure_writes_row_with_error(db_session):
    """Failure path: writes audit_logs row with action='email.<type>.failed' and target encodes error."""
    from email_utils import _audit_email_send
    from models import AuditLog

    err = ConnectionError("Gmail SMTP timeout after 30s")
    await _audit_email_send(
        email_type="magic_link", to_email="bob@example.com",
        success=False, error=err,
    )

    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "email.magic_link.failed")
    )).scalars().all()
    assert len(rows) == 1
    row = rows[0]
    assert row.result == "failure"
    assert row.actor_email == "bob@example.com"
    assert row.target is not None
    assert "error:ConnectionError:" in row.target
    assert "Gmail SMTP timeout" in row.target


@pytest.mark.asyncio
async def test_audit_email_send_truncates_long_error_message(db_session):
    """Error messages >200 chars are truncated to keep audit_logs.target reasonable."""
    from email_utils import _audit_email_send
    from models import AuditLog

    huge_msg = "x" * 500
    err = RuntimeError(huge_msg)
    await _audit_email_send(
        email_type="welcome", to_email="carol@example.com",
        success=False, error=err,
    )

    row = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "email.welcome.failed")
    )).scalars().one()
    # "error:RuntimeError:" prefix (~20 chars) + 200 chars of msg = ~220 chars total
    assert len(row.target) < 240
    assert row.target.startswith("error:RuntimeError:")


@pytest.mark.asyncio
async def test_audit_email_send_never_raises_when_db_explodes(monkeypatch):
    """If audit write itself fails, _audit_email_send swallows — observability
    gap is preferred to taking down the email path."""
    from email_utils import _audit_email_send

    # Force AsyncSessionLocal to raise on use
    class _BoomSession:
        async def __aenter__(self):
            raise OSError("disk full")
        async def __aexit__(self, *a):
            return False

    def _boom_factory():
        return _BoomSession()

    import database as db_mod
    monkeypatch.setattr(db_mod, "AsyncSessionLocal", _boom_factory)

    # Must NOT raise
    await _audit_email_send(email_type="welcome", to_email="dave@example.com", success=True)


@pytest.mark.asyncio
async def test_send_magic_link_email_writes_success_audit(db_session, monkeypatch):
    """End-to-end: when fm.send_message succeeds, send_magic_link_email writes
    a 'email.magic_link.sent' audit row."""
    import email_utils
    from models import AuditLog

    # Force SMTP_CONFIGURED=True so the function actually exercises the send path
    monkeypatch.setattr(email_utils, "SMTP_CONFIGURED", True)
    # Stub fm.send_message to a no-op success
    monkeypatch.setattr(email_utils.fm, "send_message", AsyncMock(return_value=None))

    await email_utils.send_magic_link_email(
        to_email="erin@example.com", name="Erin",
        magic_link="https://artha.build/auth/magic?token=test",
        expiry_hours=24,
    )

    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "email.magic_link.sent")
    )).scalars().all()
    assert any(r.actor_email == "erin@example.com" for r in rows)


@pytest.mark.asyncio
async def test_send_magic_link_email_writes_failure_audit_and_does_not_raise(db_session, monkeypatch):
    """End-to-end: when fm.send_message raises, send_magic_link_email writes
    a 'email.magic_link.failed' audit row AND does NOT propagate the exception
    (preserves auth.py:454 background_tasks.add_task fire-and-forget contract)."""
    import email_utils
    from models import AuditLog

    monkeypatch.setattr(email_utils, "SMTP_CONFIGURED", True)
    monkeypatch.setattr(
        email_utils.fm, "send_message",
        AsyncMock(side_effect=ConnectionError("simulated SMTP outage")),
    )

    # Must NOT raise
    await email_utils.send_magic_link_email(
        to_email="frank@example.com", name="Frank",
        magic_link="https://artha.build/auth/magic?token=test",
        expiry_hours=24,
    )

    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "email.magic_link.failed")
    )).scalars().all()
    matched = [r for r in rows if r.actor_email == "frank@example.com"]
    assert len(matched) == 1
    assert "ConnectionError" in matched[0].target
    assert "simulated SMTP outage" in matched[0].target
```

### Wiring notes — REQUIRED override fixture

- `db_session` fixture comes from `conftest.py:143` — wired to in-memory SQLite via `TestSessionLocal` on `test_engine` (conftest.py:86-93).
- **CRITICAL: The conftest's `TestSessionLocal` and production's `AsyncSessionLocal` are bound to DIFFERENT engines.** SQLite `:memory:` engines are per-connection. `_audit_email_send` opens its own session via the PRODUCTION `AsyncSessionLocal` (imported inside the helper), while tests use `TestSessionLocal`. Without an override, the helper writes rows to a separate in-memory DB that the test's `db_session` cannot see → tests 1, 2, 3, 5, 6 (which call `_audit_email_send` directly or via `send_magic_link_email`) WILL fail.
- **REQUIRED:** add the autouse fixture below at the TOP of `tests/test_email_utils_audit.py` (immediately after imports, before the first test). This is NOT optional — it MUST be in the file from the first commit.

```python
@pytest_asyncio.fixture(autouse=True)
async def override_session_local(monkeypatch):
    """REQUIRED — Make _audit_email_send's AsyncSessionLocal use the test
    in-memory engine. Without this override, the helper writes rows to a
    separate in-memory DB that db_session cannot see (TestSessionLocal and
    production AsyncSessionLocal are bound to different engines)."""
    from tests.conftest import TestSessionLocal
    import database as db_mod
    monkeypatch.setattr(db_mod, "AsyncSessionLocal", TestSessionLocal)
    yield
```

Pre-flight assertion (run BEFORE pytest in Task 3 verify): `grep -q 'override_session_local' /Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py` — must return exit code 0. If missing, fail the task and add the fixture before running pytest.

### Run tests

After writing the file:

```bash
cd /Users/jeet/arthaBuild/src/backend
pytest tests/test_email_utils_audit.py -v 2>&1 | tail -20
```

All 6 new tests must PASS.

Then run the FULL suite to confirm no regression:

```bash
cd /Users/jeet/arthaBuild/src/backend
pytest -q 2>&1 | tail -5
```

Compare to baseline in `/tmp/322-preflight-baseline.txt`:
- New PASSED count: must be ≥ baseline_passed + 6 (the 6 new tests pass)
- New FAILED count: must be ≤ baseline_failed (≤54). Zero new failures.
- New SKIPPED count: must be ≤ baseline_skipped + 1 (allow one new test_email_utils* to skip if SMTP precondition unavailable)
- Specifically: `pytest tests/test_magic_link_signup.py -q` and `pytest tests/test_user.py -q` and `pytest tests/test_netsuite_connect_request.py -q` show no NEW failures vs baseline (running individually for clean diff).

If any of these conditions fail, STOP — do not proceed to deploy.
  </action>
  <verify>
0. **PRE-FLIGHT (must run BEFORE pytest):** `grep -q 'override_session_local' /Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py` — exit code MUST be 0. If non-zero, the autouse fixture override is missing and tests will fail with cross-engine invisibility (TestSessionLocal vs AsyncSessionLocal). Fix before running pytest.
1. `cd /Users/jeet/arthaBuild/src/backend && pytest tests/test_email_utils_audit.py -v 2>&1 | tail -15` shows 6 passed, 0 failed.
2. `cd /Users/jeet/arthaBuild/src/backend && pytest -q 2>&1 | tail -3` shows total passed ≥ baseline_passed + 6, failed ≤ baseline_failed.
3. `cd /Users/jeet/arthaBuild/src/backend && pytest tests/test_magic_link_signup.py tests/test_netsuite_connect_request.py -q 2>&1 | tail -3` shows no new failures.
  </verify>
  <done>
- 6 new tests pass
- Full suite: zero NEW failures vs baseline
- email_utils.py changes verified to not regress existing email-adjacent tests
- File `tests/test_email_utils_audit.py` exists and is committed-ready
  </done>
</task>

<task type="auto">
  <name>Task 4 (Wave 2): Local commit on arthaBuild repo (NOT dindin) — email_utils.py + new test file</name>
  <files>
    /Users/jeet/arthaBuild/src/backend/email_utils.py
    /Users/jeet/arthaBuild/src/backend/tests/test_email_utils_audit.py
  </files>
  <action>
Repository: `/Users/jeet/arthaBuild` (standalone — NOT dindin monorepo).

### Step 4.1 — Confirm only the two intended files are staged

```bash
cd /Users/jeet/arthaBuild
git status --short
```

Expected new dirty files (in addition to the 7 pre-existing untracked items in F8):
```
 M src/backend/email_utils.py
?? src/backend/tests/test_email_utils_audit.py
```

If anything else under `src/backend/` is dirty, STOP — investigate before committing.

### Step 4.2 — Stage ONLY the two intended files

```bash
cd /Users/jeet/arthaBuild
git add src/backend/email_utils.py src/backend/tests/test_email_utils_audit.py
git diff --cached --stat
```

Expected: 2 files changed. `email_utils.py` ~+80 lines (helper + 11 wrappers). `test_email_utils_audit.py` ~+150 lines (new file).

### Step 4.3 — Commit (HEREDOC, no -i flag, no co-author since this is jeet's solo project per CLAUDE.md)

⚠️ Before composing the message, load the actual baseline + post-edit pytest counts from `/tmp/322-preflight-baseline.txt` (Task 1) and the Task 3 verify output. Substitute them into the message body where indicated. Do NOT hardcode "546 → 552" — those numbers were the planner's snapshot and may have shifted.

```bash
cd /Users/jeet/arthaBuild
# Load baseline (captured in Task 1)
BASELINE=$(cat /tmp/322-preflight-baseline.txt 2>/dev/null | head -1)
# (executor inserts BASELINE + post-edit counts into the message body below)
git commit -m "$(cat <<'EOF'
fix(email): add try/except + audit_logs row around every fm.send_message()

Closes the SMTP observability gap surfaced by the Peter signup incident on
2026-05-05 (.planning/debug/arthabuild-peter-signup-email-not-sent-2026-05-05.md).

Today every send_*_email() function in email_utils.py calls fm.send_message()
with no try/except and no post-send audit row. SMTP failures (Gmail 421,
network blip, App Password rotation, Workspace quarantine) are invisible —
Starlette's BackgroundTask handler swallows them at WARNING level and no DB
row records the outcome.

This change wraps all 11 fm.send_message() call sites in try/except and writes
exactly one audit_logs row per send:
  - success: action="email.<type>.sent"   result="success"
  - failure: action="email.<type>.failed" result="failure"
             target="error:<ExceptionClass>:<truncated 200-char message>"

Behavior unchanged: send_*_email functions still never raise to callers
(matches existing absorb contract in auth.py:725-726, netsuite.py:369-401,
rawapi.py:1004-1018, and all background_tasks.add_task fire-and-forget sites).

Audit row uses existing audit_logs.target column for error encoding —
no schema migration, no models.py change, no audit_utils.py change.

Acquires its own AsyncSessionLocal session per call — matches the canonical
BackgroundTask-context pattern in netsuite.py:383, deploy.py:137, brd/runtime.py:197.

Tests: 6 new unit tests in tests/test_email_utils_audit.py cover success path,
failure path, error truncation, audit-write failure swallowing, and end-to-end
send_magic_link_email success/failure scenarios. Full suite shows zero new
failures vs baseline (see /tmp/322-preflight-baseline.txt for the actual
captured numbers — pre-existing failures unchanged, +6 new passes from this plan).

Verified facts:
  - 11 fm.send_message call sites at lines 602/617/632/649/665/681/696/712/733/752/851
  - audit_logs schema: action(req) + result + target + detail columns (models.py:166)
  - write_audit_event signature: (db, actor_email, actor_role, action, result, ip_address?, target?) - audit_utils.py:20
  - All callers absorb or fire-and-forget — never re-raise
EOF
)"
```

### Step 4.4 — Verify commit

```bash
cd /Users/jeet/arthaBuild
git log -1 --stat
```

Expected: 1 new commit, 2 files changed. SHA captured for rollback.

Save the SHA to `/tmp/322-commit-sha.txt`:
```bash
cd /Users/jeet/arthaBuild && git rev-parse HEAD > /tmp/322-commit-sha.txt
```

### Step 4.5 — Push to origin (so prod can pull)

```bash
cd /Users/jeet/arthaBuild
git push origin main
```

If push fails (rejected, conflict, branch issue), STOP and ask user.
  </action>
  <verify>
1. `cd /Users/jeet/arthaBuild && git log -1 --pretty='%H %s'` shows the new commit on HEAD with the expected subject line.
2. `cd /Users/jeet/arthaBuild && git status --short | grep -E 'src/backend/(email_utils|tests/test_email_utils_audit)'` returns empty (both files are now clean / committed).
3. `cd /Users/jeet/arthaBuild && git log origin/main..HEAD` returns empty (push succeeded).
4. `cat /tmp/322-commit-sha.txt` shows a valid 40-char SHA.
  </verify>
  <done>
- Single commit on /Users/jeet/arthaBuild main with email_utils.py + test_email_utils_audit.py
- Pushed to origin
- Commit SHA recorded for rollback in /tmp/322-commit-sha.txt
  </done>
</task>

<task type="auto">
  <name>Task 5 (Wave 3): Deploy to production EC2 — rebuild backend image (code is baked in, NOT bind-mounted)</name>
  <files>(prod EC2 — no local files modified)</files>
  <action>
Production deploy. Backend code is **baked into the Docker image** at build time (Dockerfile:78 `COPY --from=builder /app/email_utils.py /app/email_utils.py`). A bare `docker compose restart backend` will NOT pick up new code — we MUST rebuild the image.

### Step 5.1 — SSH preflight

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem -o StrictHostKeyChecking=no ubuntu@44.194.34.223 "docker ps --format '{{.Names}}\t{{.Status}}'"
```

Expected: `arthaBuild-backend\tUp ...`, `arthaBuild-nginx\tUp ...`, `arthaBuild-ollama\tUp ...`. Capture pre-deploy state.

### Step 5.2 — Capture rollback SHA from prod (current running code)

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild && git rev-parse HEAD" > /tmp/322-prod-rollback-sha.txt
cat /tmp/322-prod-rollback-sha.txt
```

This is the SHA we revert to if anything goes wrong.

### Step 5.3 — Pull the new commit on prod

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 << 'EOF'
set -e
cd /home/ubuntu/arthaBuild
git fetch origin main
git log --oneline HEAD..origin/main
git pull origin main
git log -1 --pretty='%H %s'
EOF
```

Expected: pulls 1 new commit. HEAD now matches the SHA from `/tmp/322-commit-sha.txt`.

### Step 5.4 — Rebuild + force-recreate backend container

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 << 'EOF'
set -e
cd /home/ubuntu/arthaBuild
echo "=== Pre-deploy backend container ID ==="
docker ps --filter name=arthaBuild-backend --format '{{.ID}} {{.Image}} {{.CreatedAt}}'

echo "=== Rebuilding backend image ==="
docker compose build backend

echo "=== Force-recreating backend container ==="
docker compose up -d --no-deps --force-recreate backend

echo "=== Waiting 15s for container to start ==="
sleep 15

echo "=== Post-deploy backend container ID ==="
docker ps --filter name=arthaBuild-backend --format '{{.ID}} {{.Image}} {{.CreatedAt}}'

echo "=== Backend health check ==="
docker exec arthaBuild-backend curl -fsS http://localhost:8000/health
EOF
```

Expected: backend container ID changes (recreated), `/health` returns 200 with healthy JSON.

### Step 5.5 — Verify the new code IS in the running container

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker exec arthaBuild-backend grep -c '_audit_email_send' /app/email_utils.py"
```

Expected output: number ≥ 23 (1 def line + 22 invocations across 11 try/except blocks). If it returns 0 or the file is unchanged, the build/recreate did NOT pick up the new code → STOP, run rollback.

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker exec arthaBuild-backend grep -oE 'email\\.[a-z_]+\\.(sent|failed)' /app/email_utils.py | sort -u | wc -l"
```

Expected output: 22 (11 .sent tags + 11 .failed tags).

### Step 5.6 — Tail backend logs for any startup error

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker logs arthaBuild-backend --since 60s 2>&1 | grep -iE 'error|exception|traceback' | head -20"
```

Expected: empty output OR pre-existing harmless warnings only. Any new ERROR/Traceback → STOP, rollback.

### Rollback procedure (if any check above fails)

```bash
PROD_ROLLBACK_SHA=$(cat /tmp/322-prod-rollback-sha.txt)
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 << EOF
set -e
cd /home/ubuntu/arthaBuild
git reset --hard $PROD_ROLLBACK_SHA
docker compose build backend
docker compose up -d --no-deps --force-recreate backend
sleep 10
docker exec arthaBuild-backend curl -fsS http://localhost:8000/health
EOF
```

ETA for rollback: <5 minutes.
  </action>
  <verify>
1. `ssh ... "docker exec arthaBuild-backend grep -c '_audit_email_send' /app/email_utils.py"` returns ≥ 23
2. `ssh ... "docker exec arthaBuild-backend curl -fsS http://localhost:8000/health"` returns 200 with healthy payload
3. `ssh ... "docker logs arthaBuild-backend --since 2m 2>&1 | grep -iE 'error|exception|traceback'"` returns no NEW errors (compare to pre-deploy log baseline)
4. `curl -fsS https://artha.build/health` returns 200 (CF + nginx + backend chain healthy)
  </verify>
  <done>
- arthaBuild-backend container running new image
- /app/email_utils.py inside container contains _audit_email_send + 11 try/except wrappers
- /health returns 200 from inside container AND from public CF URL
- No new errors in last 2 minutes of backend logs
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6 (Wave 3): LIVE PROD VERIFICATION — POST a real signup and confirm audit_logs row appears</name>
  <what-built>
After Task 5, prod is running new code with try/except + audit_logs writes around every fm.send_message().

This checkpoint verifies the change actually works END-TO-END in production by triggering a real magic-link signup and confirming a NEW audit_logs row appears with action='email.magic_link.sent' result='success'.
  </what-built>
  <how-to-verify>
**This is THE critical verification.** Without this, deploy is NOT verified.

### Step 6.1 — Generate a unique test email (use Gmail +alias per "smoke test real mailbox" memory rule)

```bash
TS=$(date +%s)
TEST_EMAIL="jeetnair.in+322-test-${TS}@gmail.com"
echo "Test email: $TEST_EMAIL"
```

DO NOT use example.com or fabricated domains — they bounce, hurt sender rep, and leave orphan users (per `feedback_smoke_test_real_mailbox.md` MEMORY entry from 2026-04-20 incident).

### Step 6.2 — Capture the audit_logs id high-water-mark BEFORE the test

⚠️ **CRITICAL: variable scoping across SSH boundary.** The PRE_MAX_ID value MUST be captured into a LOCAL shell variable on the workstation, NOT left as a remote shell variable. The earlier draft of this plan had `$PRE_MAX_ID` inside a quoted SSH heredoc in Step 6.5 which would mis-substitute to empty string locally → query becomes `id > 0` → matches all rows → false positive that masks a broken deploy.

Run the capture command, tee its output to a local file, then extract the integer locally:

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker exec arthaBuild-backend python3 -c \"
import sqlite3
c = sqlite3.connect('file:/app/data/arthaBuild.db?mode=ro', uri=True)
print('PRE_MAX_ID=' + str(c.execute('SELECT MAX(id) FROM audit_logs').fetchone()[0]))
c.close()\"" | tee /tmp/322-pre-max-id.txt

# Extract the integer locally (handles 'PRE_MAX_ID=12345' format; also handles None → fall back to 0)
PRE_MAX_ID=$(grep -oE 'PRE_MAX_ID=[0-9]+' /tmp/322-pre-max-id.txt | grep -oE '[0-9]+$')
if [ -z "$PRE_MAX_ID" ]; then
  echo "FAIL: could not extract PRE_MAX_ID from /tmp/322-pre-max-id.txt"
  cat /tmp/322-pre-max-id.txt
  exit 1
fi
echo "Captured PRE_MAX_ID=$PRE_MAX_ID (in local shell)"
```

Note the read-only URI (`file:...?mode=ro`) — read-only avoids any chance of locking the SQLite DB while uvicorn is actively writing (see also Step 6.5).

### Step 6.3 — POST a real request-access against prod

```bash
TS=$(date +%s)
TEST_EMAIL="jeetnair.in+322-test-${TS}@gmail.com"
curl -fsS -X POST https://artha.build/api/auth/request-access \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Quick322 Test\",\"email\":\"$TEST_EMAIL\",\"company\":\"TCP-322-Test\"}"
echo ""
echo "Posted at $(date -u +%FT%TZ) for $TEST_EMAIL"
```

Expected: HTTP 200 with the generic "we got your request" message. If this returns 4xx/5xx → STOP, rollback (prod is broken in a NEW way, even before our code path is exercised).

### Step 6.4 — Wait 30 seconds for BackgroundTask to fire

```bash
sleep 30
```

### Step 6.5 — Query audit_logs on prod for our new test rows

⚠️ **CRITICAL: PRE_MAX_ID must be expanded by the LOCAL shell, NOT inside the remote shell.** The remote shell has no `PRE_MAX_ID` variable (it was captured locally in Step 6.2). We expand `$PRE_MAX_ID` on the local side BEFORE the SSH call sends the command string. We use a read-only SQLite URI (`file:...?mode=ro`) to avoid `database is locked` errors while uvicorn is actively writing — the prod SQLite DB is on a Docker named volume `app_data` (verified `docker-compose.yml:69, 110`), not a host bind mount, so we cannot just copy the file out.

First, re-load PRE_MAX_ID into the local shell (in case this step runs in a fresh shell after Step 6.2):

```bash
PRE_MAX_ID=$(grep -oE 'PRE_MAX_ID=[0-9]+' /tmp/322-pre-max-id.txt | grep -oE '[0-9]+$')
if [ -z "$PRE_MAX_ID" ]; then
  echo "FAIL: PRE_MAX_ID not in /tmp/322-pre-max-id.txt — re-run Step 6.2"
  exit 1
fi
echo "Querying audit_logs WHERE id > $PRE_MAX_ID"
```

Now run the query — note the LOCAL shell expands `$PRE_MAX_ID` into the command string BEFORE ssh ships it remotely. The remote python3 sees a literal integer (e.g. `id > 12345`):

```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker exec arthaBuild-backend python3 -c \"
import sqlite3
c = sqlite3.connect('file:/app/data/arthaBuild.db?mode=ro', uri=True)
print('Audit rows produced AFTER test (id > $PRE_MAX_ID):')
for row in c.execute('SELECT id, action, result, actor_email, target, created_at FROM audit_logs WHERE id > $PRE_MAX_ID ORDER BY id DESC LIMIT 10').fetchall():
    print(row)
c.close()\""
```

Verify the substitution worked (sanity check before believing the output): `echo` the assembled command first if in doubt. A query of `id > 0` (PRE_MAX_ID lost / empty) would match ALL audit rows in the table — a strong false-positive signal that masks a broken deploy. If you see >50 rows in the output, suspect PRE_MAX_ID was empty and STOP.

### Pass criteria (ALL must be true)

The output must contain at least one row matching:
- action = `'email.magic_link.sent'`
- result = `'success'`
- actor_email contains the test email substring (`jeetnair.in+322-test-`)
- created_at within ~60 seconds of the POST in Step 6.3
- target IS NULL (success path)

You should ALSO see:
- A `signup.magic_link_issued` SUCCESS row (pre-existing instrumentation, confirms the upstream signup flow ran)
- Possibly a `signup.user_created_via_magic_link` SUCCESS row (if the test email is new — it should be, given the timestamp in the alias)

### Fail criteria (ANY one triggers rollback)

- No `email.magic_link.sent` row appears within 60s → Backend deployed but audit-write path is broken → run rollback (Step 5.7) and investigate locally
- `email.magic_link.failed` row appears with target='error:...' → SMTP IS broken in prod (Peter scenario reproduced!) → leave the failed row in place (it's diagnostic gold), then BOTH tasks: (a) rollback to clear the audit gap from confounding diagnosis, (b) open a new debug session for the SMTP failure itself
- /api/auth/request-access returns 5xx → unrelated breakage → rollback

### Step 6.6 — Confirm test email arrived (mailbox check)

Open `jeetnair.in@gmail.com` (the inbox the +alias delivers to). Search inbox + spam for `+322-test-` from the past 5 minutes. The magic-link email should be present. This is the secondary verification that BOTH the audit row AND the actual SMTP delivery path work.

If the audit row says SUCCESS but no email arrives in the mailbox: The audit row reflects "Gmail SMTP accepted the message" — Gmail delivery beyond submission is opaque to us (per debug session diagnosis). Acceptable: note this as a residual delivery gap (out of scope for this task), not a regression.

### Step 6.7 — Resume signal

After verification passes, type:
- `approved` — Wave 3 complete, write SUMMARY.md
- `rollback` — execute rollback (Step 5.7), record what failed
- `partial: <description>` — audit row appeared but something else off; describe issue

  </how-to-verify>
  <resume-signal>Type "approved" to confirm prod verification passed, "rollback" to revert, or "partial: ..." to describe a partial pass.</resume-signal>
</task>

</tasks>

<verification>

## Phase-level verification — Goal-backward proof

The objective ("close SMTP observability gap on transactional email pipeline") is achieved when ALL of the following observable truths are true:

1. **Code change is correct (Task 2 verify)**
   - `_audit_email_send` helper exists in email_utils.py
   - All 11 fm.send_message() call sites are inside try/except
   - 22 _audit_email_send invocations (11 success + 11 failure)
   - File parses cleanly (Python AST OK)

2. **Tests prove the change works (Task 3 verify)**
   - 6 new tests pass
   - Full suite: zero new failures vs baseline (546 passed / 54 failed)
   - Existing email-adjacent tests (test_magic_link_signup, test_netsuite_connect_request, test_user) unchanged

3. **Code is committed and pushed (Task 4 verify)**
   - Single commit on /Users/jeet/arthaBuild main
   - Pushed to origin
   - SHA recorded for rollback

4. **Prod deploy succeeded (Task 5 verify)**
   - arthaBuild-backend container rebuilt + restarted
   - /app/email_utils.py inside container has the new code (grep _audit_email_send returns ≥23)
   - /health returns 200 inside AND via CF URL
   - No new errors in 2-minute log window

5. **Live prod verification (Task 6 — checkpoint)**
   - Real POST to /api/auth/request-access produces a NEW audit_logs row with action='email.magic_link.sent' result='success' within 30s
   - Test email sent to jeetnair.in+alias arrives in mailbox (or is in spam, indicating SMTP-side delivery is fine, opaque-to-us delivery is the residual gap — out of scope)

If ALL 5 are TRUE → goal achieved. The next "did the email send?" question can be answered by SQL:
```sql
SELECT COUNT(*), action, result FROM audit_logs WHERE action LIKE 'email.%' GROUP BY action, result;
```
That query did not return useful data before this change. After this change, it tells the operator exactly which email types are succeeding and which are failing.

</verification>

<success_criteria>

- [ ] **Pre-flight gate passed:** all 8 planner-verified facts re-confirmed against current code (Task 1)
- [ ] **Code change shipped:** _audit_email_send helper + 11 try/except wrappers in email_utils.py (Task 2)
- [ ] **6 new unit tests pass + full suite has zero new failures** (Task 3)
- [ ] **Single commit on /Users/jeet/arthaBuild main, pushed to origin** (Task 4)
- [ ] **Prod backend container rebuilt, /app/email_utils.py contains new code, /health = 200** (Task 5)
- [ ] **Live prod test: POST /api/auth/request-access with `jeetnair.in+322-test-<ts>@gmail.com` produces a new audit_logs row `email.magic_link.sent / success` within 30s** (Task 6)
- [ ] No regression in any email-adjacent test (test_magic_link_signup, test_user, test_netsuite_connect_request)
- [ ] Rollback SHAs captured in /tmp/322-commit-sha.txt and /tmp/322-prod-rollback-sha.txt — full revert is a single ssh command, ETA <5 minutes
- [ ] No changes outside email_utils.py + test_email_utils_audit.py (audit_utils.py, models.py, callers all UNTOUCHED)

</success_criteria>

<rollback_runbook>

If anything breaks at ANY point, the full revert is:

### Local (if not yet pushed)
```bash
cd /Users/jeet/arthaBuild
git reset --hard HEAD^
```

### Local (after push, before deploy)
```bash
cd /Users/jeet/arthaBuild
git revert HEAD
git push origin main
```

### Prod (after deploy)
```bash
PROD_ROLLBACK_SHA=$(cat /tmp/322-prod-rollback-sha.txt)
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 << EOF
set -e
cd /home/ubuntu/arthaBuild
git reset --hard $PROD_ROLLBACK_SHA
docker compose build backend
docker compose up -d --no-deps --force-recreate backend
sleep 10
docker exec arthaBuild-backend curl -fsS http://localhost:8000/health
EOF
```

ETA: <5 minutes from decision-to-rollback to /health=200 on previous code.

</rollback_runbook>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/322-add-try-except-audit-logs-row-around-eve/322-SUMMARY.md` with:
- Commit SHA on arthaBuild
- Pre/post pytest counts
- Audit row IDs from the live prod verification (PRE_MAX_ID + actual rows produced by the test signup)
- Test email used + whether mailbox delivery succeeded
- Any new failed-email rows discovered during verification (if SMTP is actually broken right now, this plan will surface it for the first time — that's a feature, document the finding)
</output>
