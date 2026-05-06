---
phase: quick-323
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/arthaBuild/src/backend/models.py
  - /Users/jeet/arthaBuild/src/backend/routers/auth.py
  - /Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py
  - /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py
autonomous: true
requirements:
  - QUICK-323-01  # Same JWT returned within grace window (no JTI doubling)
  - QUICK-323-02  # Grace window starts at first redeem, expires deterministically
  - QUICK-323-03  # Live prod verification with two real UAs (CriOS + Safari) returns identical JWT
  - QUICK-323-04  # Local pytest baseline ≥ 552 + new test cases all green
  - QUICK-323-05  # Rollback artifacts captured before deploy

must_haves:
  truths:
    - "First redeem of a magic-link token returns 200 + JWT pair (unchanged from today)"
    - "Second redeem of the SAME token within 60s returns the SAME access_token + SAME refresh_token (byte-for-byte) — not a new JWT pair"
    - "Third redeem within 60s returns the SAME cached JWT (UA-agnostic — no User-Agent sniffing)"
    - "Redeem after 60s window expiry returns 401 already_consumed (boundary unchanged)"
    - "Two different magic tokens never share a cached JWT (no cross-token leakage)"
    - "Existing pytest suite passes (≥ 552 baseline) plus new test cases for cached-JWT semantics"
    - "Live prod test: CriOS UA + Safari UA hitting /api/auth/magic/redeem within 5s observe IDENTICAL JWT body"
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/backend/models.py"
      provides: "MagicLinkToken model with new cached_access_token + cached_refresh_token columns"
      contains: "cached_access_token"
    - path: "/Users/jeet/arthaBuild/src/backend/routers/auth.py"
      provides: "magic_redeem endpoint serving cached JWT in grace window instead of minting new"
      contains: "cached_access_token"
    - path: "/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py"
      provides: "Idempotent batch_alter_table migration adding 2 nullable TEXT columns"
      contains: "op.add_column"
    - path: "/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py"
      provides: "Updated test_magic_redeem_second_attempt_within_grace_succeeds + new cached-JWT assertions"
      contains: "cached_access_token"
  key_links:
    - from: "magic_redeem endpoint (auth.py:492 grace branch)"
      to: "token_record.cached_access_token / cached_refresh_token columns"
      via: "if branch returns cached JWT instead of calling create_access_token()"
      pattern: "token_record\\.cached_access_token"
    - from: "magic_redeem endpoint first-redeem branch (auth.py:553)"
      to: "token_record.cached_access_token / cached_refresh_token writes"
      via: "after create_access_token+create_refresh_token, persist to row before commit"
      pattern: "token_record\\.cached_access_token\\s*="
    - from: "alembic migration l7m8n9o0p1q2"
      to: "magic_link_tokens table"
      via: "op.batch_alter_table('magic_link_tokens') with op.add_column for cached_access_token + cached_refresh_token (both nullable=True, default=None)"
      pattern: "op\\.add_column.*cached_access_token"
---

<objective>
Fix the iOS Gmail/Outlook in-app browser magic-link race so Bhavya-pattern users (Chrome iOS preview racing Safari iOS) BOTH succeed with the SAME working JWT instead of one tab silently winning and the user-visible tab seeing 401.

**Current behaviour (verified live, 2026-05-05 02:42:06Z, prod audit_logs id=429 era):**
- `auth.py:460` `POST /api/auth/magic/redeem` first call → 200, sets `consumed_at`, sets `redeem_count=1`, returns JWT pair A (jti = uuid4-A).
- `auth.py:492-525` Phase 40 grace branch on second call within 60s + redeem_count<2 → 200, BUT calls `create_access_token()` again (`auth_utils.py:68-78`) which generates a NEW jti via `uuid.uuid4()` → returns JWT pair B (jti = uuid4-B, different `iat` timestamp).
- Result: two valid sessions exist for the same token. Effectively doubles token lifetime. Violates security_constraints rule #2 ("Same JWT, NOT a new one").

**Target behaviour:**
- First redeem: mint JWT pair, **persist `cached_access_token` + `cached_refresh_token` columns on the token row** before commit, return them.
- Grace-window redeem (≤60s, redeem_count<2): **return the persisted columns verbatim** — no `create_access_token()` call. Bump `redeem_count`. Audit `signup.magic_link_grace_redeem`.
- After window OR redeem_count cap: existing 401 path unchanged.
- After token expiry / token revoke: existing 401 path unchanged.

Purpose: Close the security gap (doubled JWT lifetime) AND keep the UX win (Gmail iOS race-survival) Phase 40 was designed to fix.
Output: 1 model edit + 1 router edit + 1 alembic migration + 1 test file extension. Commit, deploy via `docker compose build backend && docker compose up -d --force-recreate backend`. Live-verify with real `jeetnair.in+323-test-<unix>@gmail.com` mailbox.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/debug/arthabuild-bhavya-magic-link-signup-2026-05-01.md
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/arthaBuild/src/backend/routers/auth.py
@/Users/jeet/arthaBuild/src/backend/models.py
@/Users/jeet/arthaBuild/src/backend/auth_utils.py
@/Users/jeet/arthaBuild/src/backend/alembic/versions/h3i4j5k6l7m8_magic_link_signups.py
@/Users/jeet/arthaBuild/src/backend/alembic/versions/j5k6l7m8n9o0_redeem_count.py
@/Users/jeet/arthaBuild/src/backend/alembic/versions/k6l7m8n9o0p1_netsuite_connect_requests.py
@/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py
@/Users/jeet/arthaBuild/src/backend/tests/conftest.py
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_smoke_test_real_mailbox.md
</context>

<grep_verified_facts>
Every claim below was verified at planning time. Executor MUST re-grep at PRE-FLIGHT (Task 1).

| Claim | Verification command | Expected output |
|-------|---------------------|-----------------|
| `magic_link_tokens` schema baseline (h3i4j5k6l7m8) | `grep -n "create_table\|add_column\|create_index" /Users/jeet/arthaBuild/src/backend/alembic/versions/h3i4j5k6l7m8_magic_link_signups.py` | Columns: id (PK), user_id (FK users.id, indexed), token_hash (unique, NOT NULL), expires_at (NOT NULL), consumed_at (nullable), issued_ip (nullable), created_at (server_default=now). Index: ix_magic_link_user_id |
| `redeem_count` column added by Phase 40 (j5k6l7m8n9o0) | `grep -n "redeem_count" /Users/jeet/arthaBuild/src/backend/alembic/versions/j5k6l7m8n9o0_redeem_count.py` | `redeem_count` Integer NOT NULL server_default='0' |
| MagicLinkToken model | `grep -n "MagicLinkToken\|consumed_at\|redeem_count" /Users/jeet/arthaBuild/src/backend/models.py` | Class at line 87, columns mirror migrations exactly. Line 105 redeem_count |
| Redeem endpoint method + path | `grep -n "@router.post.*magic/redeem\|magic_redeem" /Users/jeet/arthaBuild/src/backend/routers/auth.py` | `auth.py:460 @router.post("/magic/redeem", response_model=TokenResponse)` |
| Grace-window branch generates new JWT every call | `sed -n '492,525p' /Users/jeet/arthaBuild/src/backend/routers/auth.py` | Lines 509-510: `access_token = create_access_token(user.id, ...); refresh_token = create_refresh_token(user.id)` — fresh tokens every grace call |
| `create_access_token` mints fresh jti per call | `grep -n "jti\|uuid.uuid4" /Users/jeet/arthaBuild/src/backend/auth_utils.py` | Line 73: `"jti": str(uuid.uuid4())` — new uuid each call. Line 75: `"iat": int(now.timestamp())` — fresh timestamp |
| `create_refresh_token` does NOT mint jti (refresh has no jti) | `sed -n '86,92p' /Users/jeet/arthaBuild/src/backend/auth_utils.py` | Refresh payload: sub, token_type, exp only. No jti, no iat. Different `exp` per call → different signature |
| Logout uses JTI blacklist (does NOT touch magic_link_tokens) | `sed -n '162,194p' /Users/jeet/arthaBuild/src/backend/routers/auth.py` | `blacklist_token(jti)` only. magic_link_tokens row is untouched at logout. Conclusion: caching JWT in row is safe — logout invalidates JWT via JTI set |
| Existing test file location | `ls /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` | File exists |
| Existing test names | `grep -n "^async def test\|^def test" /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` | test_magic_redeem_happy_path (147), test_magic_redeem_second_attempt_within_grace_succeeds (205), test_magic_redeem_after_grace_window_rejected (249), test_magic_redeem_third_attempt_within_grace_rejected (287) |
| Test conftest pattern (in-memory DB) | `grep -n "TestSessionLocal\|StaticPool\|override_get_db" /Users/jeet/arthaBuild/src/backend/tests/conftest.py` | Lines 86-98: aiosqlite + StaticPool + dependency_overrides[get_db]. **NOTE:** `client` fixture overrides `get_db` so endpoint hits TestSessionLocal directly — `override_session_local` autouse fixture from quick-322 NOT needed here (this code path doesn't call helpers using prod `AsyncSessionLocal`) |
| Latest alembic version filename pattern | `ls /Users/jeet/arthaBuild/src/backend/alembic/versions/ \| sort \| tail -5` | Sequence: `g2h3i4j5k6l7_blog_engagement.py` → `h3i4j5k6l7m8` → `i4j5k6l7m8n9` → `j5k6l7m8n9o0` → `k6l7m8n9o0p1`. Next slot: `l7m8n9o0p1q2_<topic>.py` |
| Current head migration | `grep -n "^revision\|^down_revision" /Users/jeet/arthaBuild/src/backend/alembic/versions/k6l7m8n9o0p1_netsuite_connect_requests.py` | revision='k6l7m8n9o0p1', down_revision='j5k6l7m8n9o0' → new migration's down_revision MUST be `k6l7m8n9o0p1` |
| Alembic SQLite ALTER rule (CLAUDE.md project law) | Read `/Users/jeet/arthaBuild/CLAUDE.md` "Database" section + `grep -n "render_as_batch" /Users/jeet/arthaBuild/src/backend/alembic/env.py` | CLAUDE.md:72 "Alembic migrations: always `render_as_batch=True` (SQLite ALTER TABLE)". env.py:50 (offline) AND env.py:74 (online) BOTH set `render_as_batch=True` GLOBALLY in `context.configure()`. That's WHY j5k6l7m8n9o0_redeem_count.py shipped successfully with bare `op.add_column` — env.py wraps every migration in batch mode automatically. Same wrapping applies here. **DO NOT** remove `render_as_batch=True` from env.py. |
| pytest baseline | quick-322 SUMMARY: 552 passed, 54 pre-existing failures, 18 skipped | New tests must keep this baseline (552 + N new) |
</grep_verified_facts>

<implementation_decision>
**Option A CHOSEN — Cache the literal JWT strings on the token row.**

| Aspect | Decision | Justification |
|--------|----------|---------------|
| Storage | 2 new nullable TEXT columns on `magic_link_tokens`: `cached_access_token`, `cached_refresh_token` | Existing `redeem_count` column already proves Phase 40 model accepts schema additions. Two TEXT NULL columns are the minimum addition that satisfies "same JWT" semantics. |
| Why not Option B (re-derive deterministic JWT)? | Rejected | `create_access_token()` includes `iat` (current epoch second) AND `jti` (uuid4) in payload. Making either deterministic per-token leaks information (`iat` becomes token-issue-time, predictable; `jti=token_hash` collides JTI namespace with magic-link-tokens). Caching the literal string is auditable and side-effect-free. |
| Why not Option C (UA sniffing)? | Rejected per planning_context constraint | CriOS detection misses Apple Mail / Outlook iOS / LinkedIn iOS / Gmail Android preview / desktop iframe previews. UA-agnostic cache always works. |
| Window value | 60 seconds (env-tunable, unchanged from Phase 40 default `MAGIC_LINK_GRACE_WINDOW_SECONDS=60`) | Bhavya's prod evidence: Safari succeeded at 02:42:06, CriOS retried at 02:42:09 (3s gap), 02:42:14 (8s), 02:42:38 (32s). 60s comfortably covers all observed real races. Phase 40 default already production-tested. No change to env var name. |
| Redemption cap | Unchanged at 2 (env `MAGIC_LINK_GRACE_MAX_REDEMPTIONS=2`) | Already in place. No reason to widen. |
| Field naming | `cached_access_token`, `cached_refresh_token` (TEXT, nullable) | "cached" makes intent clear in audit logs / DB inspection. Distinguishes from "the" token (which is `token_hash`). |
| Logout / revoke compatibility | Logout uses JTI blacklist (auth.py:178 `blacklist_token(jti)`). Caching JWT in row is SAFE — when user logs out, the cached JWT's JTI is blacklisted regardless of whether it lives on disk. No additional revoke wiring needed. | Verified by reading auth.py:162-194. magic_link_tokens row is never touched by logout. |
| Leakage prevention | Audit /me, /admin/users, etc. for any code that reads `MagicLinkToken` columns and returns them. **VERIFIED:** `grep -rn "MagicLinkToken\|magic_link_tokens" /Users/jeet/arthaBuild/src/backend/routers/` only shows auth.py — no other router reads these. Cached JWT cannot leak through other endpoints. | Confirmed during planning. Executor must re-grep at PRE-FLIGHT. |
</implementation_decision>

<tasks>

<task type="auto">
  <name>Task 1: PRE-FLIGHT — re-verify all grep facts before any edit</name>
  <files>(read-only verification)</files>
  <action>
Run EVERY verification command in `<grep_verified_facts>` table above. Compare actual output to "Expected output" column.

**STOP CONDITIONS — if any of these mismatch the planner's facts, halt and ask user before proceeding:**

1. `grep -n "@router.post.*magic/redeem" /Users/jeet/arthaBuild/src/backend/routers/auth.py` — must show line 460 (±2 lines OK; if line >480 or <440, code shape changed since planning, STOP).
2. `grep -n "redeem_count" /Users/jeet/arthaBuild/src/backend/models.py` — must show line 105 with `Column(Integer, nullable=False, default=0, server_default="0")`.
3. **Function-scoped grep** (file-wide grep returns 5 hits — login:152, grace:509, first-redeem:572, google OAuth:728, refresh:775 — that's expected; we ONLY care about the magic_redeem function body):
   ```bash
   awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -c "create_access_token(user.id"
   ```
   PRE-EDIT expected: **2** (one grace, one first-redeem inside `magic_redeem`). POST-EDIT (after Task 3) expected: **1** (only first-redeem). If pre-edit count != 2, code restructured since planning — STOP.
4. `ls /Users/jeet/arthaBuild/src/backend/alembic/versions/k6l7m8n9o0p1_netsuite_connect_requests.py` — must exist (head migration).
5. `cd /Users/jeet/arthaBuild && pytest src/backend/tests/test_magic_link_signup.py -v 2>&1 | tail -20` — capture current pass count BEFORE edit. Record expected baseline: 4 magic_redeem tests pass (happy_path + second_within_grace + after_grace + third_within_grace_rejected).
6. `cd /Users/jeet/arthaBuild && pytest src/backend/tests/ 2>&1 | tail -5` — capture full backend pytest summary. Record exact "X passed, Y failed, Z skipped" line. **This becomes the rollback gate**: post-edit count MUST be ≥ baseline_passed + 2 (we add at least 2 new test cases).

Also verify no other router reads MagicLinkToken (data-leakage check):
- `grep -rn "MagicLinkToken\|cached_access_token\|cached_refresh_token" /Users/jeet/arthaBuild/src/backend/routers/ /Users/jeet/arthaBuild/src/backend/middleware/ 2>/dev/null` — must return ONLY auth.py occurrences. If any other router reads MagicLinkToken, STOP and ask user (cached JWT could leak).

If all 6 STOP CONDITIONS pass, write a one-line confirmation to `.planning/quick/323-fix-ios-magic-link-single-use-token-race/PREFLIGHT.txt` with the captured baseline pytest counts. Proceed to Task 2.
  </action>
  <verify>
File `/Users/jeet/doordash-p2p/.planning/quick/323-fix-ios-magic-link-single-use-token-race/PREFLIGHT.txt` exists and contains:
- baseline_total_passed=N (≥552 per quick-322 record)
- baseline_magic_redeem_passed=4
- preflight_facts_match=true
  </verify>
  <done>All 6 stop conditions pass; baseline captured; no unexpected MagicLinkToken readers found.</done>
</task>

<task type="auto">
  <name>Task 2: Add cached_access_token + cached_refresh_token columns to MagicLinkToken model + alembic migration</name>
  <files>
/Users/jeet/arthaBuild/src/backend/models.py
/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py
  </files>
  <action>
**Edit 1: `/Users/jeet/arthaBuild/src/backend/models.py`**

Locate the `MagicLinkToken` class (line 87). After the `redeem_count` column (line 105) and BEFORE `created_at` (line 106), insert:

```python
    # quick-323 — Cached JWT pair for the iOS Gmail/Outlook/LinkedIn dual-browser
    # race. First redeem persists the JWT pair here; grace-window redeems within
    # MAGIC_LINK_GRACE_WINDOW_SECONDS return THESE strings verbatim instead of
    # minting a new pair. Avoids doubling token lifetime via fresh JTIs.
    # Both nullable: rows pre-quick-323 have NULL → grace branch falls back to
    # 401 if the cache is missing (which matches Phase-40 pre-cache behaviour).
    cached_access_token = Column(String, nullable=True)
    cached_refresh_token = Column(String, nullable=True)
```

Verify with: `grep -n "cached_access_token\|cached_refresh_token\|redeem_count\|created_at" /Users/jeet/arthaBuild/src/backend/models.py` — both new columns appear between `redeem_count` (line ~105) and `created_at` (now ~108).

**Edit 2: Create new migration file**

File path: `/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py`

Content (exact):

```python
"""quick-323 cache magic-link JWT pair on token row

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2026-05-06

quick-323 — Fix iOS Gmail in-app browser race that returned a NEW JWT pair
to the second tab (different jti, different iat) effectively doubling token
lifetime. Now: first redeem persists JWT strings on the row; grace-window
redeem returns them verbatim — same jti, same iat, same exp.

Two new TEXT columns, both nullable=True (no default), no index:
  * cached_access_token  — JWT access token from FIRST successful redeem
  * cached_refresh_token — JWT refresh token from FIRST successful redeem

Backwards-compat:
  * Pre-migration rows have NULL → grace branch sees NULL → falls back to
    401 (the original Phase-40-without-cache behaviour, safer than minting
    a new JWT). For brand-new tokens minted post-migration, both columns
    populate on first redeem.
  * Logout (auth.py:178) uses JTI blacklist — cached strings on the row do
    NOT need to be cleared on logout (the JTI is already invalidated).
  * Tokens are SHA-256 hashed at rest already; the cached JWT is itself a
    sensitive secret, but it expires with the access token (24h) and is
    only readable to whoever already has the raw magic-link token.

No index added (no query filters on these columns).

env.py sets render_as_batch=True globally (env.py:50, env.py:74), so
op.add_column is safe on SQLite (matches j5k6l7m8n9o0 precedent — DO NOT
remove render_as_batch from env.py).
"""
from alembic import op
import sqlalchemy as sa


revision = 'l7m8n9o0p1q2'
down_revision = 'k6l7m8n9o0p1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "magic_link_tokens",
        sa.Column("cached_access_token", sa.String(), nullable=True),
    )
    op.add_column(
        "magic_link_tokens",
        sa.Column("cached_refresh_token", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_column("magic_link_tokens", "cached_refresh_token")
    op.drop_column("magic_link_tokens", "cached_access_token")
```

Verify migration file:
- `grep -n "^revision\|^down_revision\|cached_access_token\|cached_refresh_token" /Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py` shows revision/down_revision lines + 4 column references (2 in upgrade, 2 in downgrade).
- `cd /Users/jeet/arthaBuild && python -c "from alembic.config import Config; from alembic.script import ScriptDirectory; sd = ScriptDirectory.from_config(Config('src/backend/alembic.ini')); print(sd.get_current_head())"` returns `l7m8n9o0p1q2`. (If `alembic.ini` is at a different path, adjust — but per project structure it's `src/backend/alembic.ini` or `src/backend/alembic/env.py`-driven; the script dir lookup is what matters.)
  </action>
  <verify>
1. `grep -c "cached_access_token" /Users/jeet/arthaBuild/src/backend/models.py` returns 1.
2. `grep -c "cached_refresh_token" /Users/jeet/arthaBuild/src/backend/models.py` returns 1.
3. `test -f /Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py && echo OK`.
4. `cd /Users/jeet/arthaBuild && python -c "from src.backend.models import MagicLinkToken; print([c.name for c in MagicLinkToken.__table__.columns])"` (or equivalent import path) lists both new column names.
  </verify>
  <done>Model has 2 new String/nullable columns; migration file exists with correct down_revision chain; alembic head resolves to l7m8n9o0p1q2.</done>
</task>

<task type="auto">
  <name>Task 3: Update magic_redeem to persist + serve cached JWT (auth.py grace + first-redeem branches)</name>
  <files>/Users/jeet/arthaBuild/src/backend/routers/auth.py</files>
  <action>
Surgical edit to `magic_redeem` function (starts auth.py:460). TWO branches change.

**Branch A (grace window — auth.py:492-525):**

Current code at lines 503-510:
```python
        if elapsed < grace_seconds and token_record.redeem_count < grace_max:
            user_result = await db.execute(select(User).where(User.id == token_record.user_id))
            user = user_result.scalar_one_or_none()
            if user is None or not user.is_active:
                raise HTTPException(status_code=401, detail="Invalid or expired sign-in link")
            token_record.redeem_count = (token_record.redeem_count or 0) + 1
            access_token = create_access_token(user.id, role=user.role)
            refresh_token = create_refresh_token(user.id)
```

REPLACE the `access_token = create_access_token...` / `refresh_token = create_refresh_token...` two lines with:

```python
            # quick-323 — return the SAME JWT minted at first redeem, not a
            # fresh one. Falls back to 401 if cache is missing (pre-quick-323
            # row): minting a new pair would double the token lifetime.
            if not token_record.cached_access_token or not token_record.cached_refresh_token:
                await write_audit_event(
                    db, actor_email=None, actor_role="anonymous",
                    action="signup.magic_link_redeem_failed", result="cache_missing",
                    ip_address=ip, target=str(token_record.user_id),
                )
                await db.commit()
                raise HTTPException(status_code=401, detail="Invalid or expired sign-in link")
            access_token = token_record.cached_access_token
            refresh_token = token_record.cached_refresh_token
```

(Keep `token_record.redeem_count = (token_record.redeem_count or 0) + 1` line BEFORE this block — unchanged.)

**Branch B (first-redeem — auth.py:552-579):**

Current code at lines 552-554:
```python
    # Mark consumed (Phase 40: redeem_count starts at 1; grace-window path bumps it)
    token_record.consumed_at = datetime.now(timezone.utc)
    token_record.redeem_count = 1
```

…and at lines 572-573:
```python
    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)
```

The mint-then-persist order matters. Replace lines 572-573 with:

```python
    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)

    # quick-323 — persist JWT pair on the token row so a grace-window
    # re-redeem (iOS Gmail/Outlook dual-browser race) returns the SAME JWT
    # instead of minting a fresh pair (which would double token lifetime
    # via new jti + iat).
    token_record.cached_access_token = access_token
    token_record.cached_refresh_token = refresh_token
```

(Lines 552-554 unchanged. The audit + commit + return TokenResponse block at lines 575-590 unchanged.)

**Verification commands after edit:**

**Function-scoped grep** (file-wide grep returns 5 hits for `create_access_token(user.id` — login:152, grace:509, first-redeem:572, google:728, refresh:775. We only want to verify the count INSIDE `magic_redeem`):

```bash
# create_access_token calls inside magic_redeem ONLY: pre-edit=2 (grace+first-redeem), post-edit=1 (first-redeem only)
awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -c "create_access_token(user.id"
# Expected: 1
```

```bash
# Cached-column references inside magic_redeem: 2 reads in grace branch (existence check + assignments) + 2 writes in first-redeem branch.
# Combined access+refresh: 6 total references
awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -cE "cached_(access|refresh)_token"
# Expected: 6 (3 cached_access_token + 3 cached_refresh_token)
```

```bash
# Per-column count: each column referenced 3 times (1 existence check + 1 read-assign + 1 write)
awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -c "cached_access_token"
# Expected: 3
awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -c "cached_refresh_token"
# Expected: 3
```

```bash
# Syntax check
python -c "import ast; ast.parse(open('/Users/jeet/arthaBuild/src/backend/routers/auth.py').read())"
```

**Do NOT touch:**
- The 401 paths after redeem_count cap or window expiry (lines ~526-532).
- The expired-token path (lines 534-544).
- The `target=` audit_logs field on the existing `already_consumed` failure (preserve target=user_id for forensics).
- The TokenResponse shape — same fields returned both branches.
- Any imports — `create_access_token` is still used in the first-redeem branch, leave the import alone.

**Edit 3 — Add MAGIC_LINK_DEBUG_RETURN_RAW debug hook to /api/auth/request-access (for Task 6 prod verification ONLY):**

Locate the `request_access` endpoint that returns `RequestAccessResponse(message=_REQUEST_ACCESS_GENERIC_RESPONSE)` (auth.py:457). The response is currently a generic message with no token leakage. Add an OPT-IN, env-gated debug field that ONLY activates when `MAGIC_LINK_DEBUG_RETURN_RAW=true` is in the environment.

**Step 3.E1 — Update the `RequestAccessResponse` Pydantic model.** Find the model definition (`grep -n "class RequestAccessResponse" /Users/jeet/arthaBuild/src/backend/routers/auth.py`):

```python
class RequestAccessResponse(BaseModel):
    message: str
    # quick-323 — DEBUG-ONLY field. Populated ONLY when MAGIC_LINK_DEBUG_RETURN_RAW=true.
    # Used by quick-323 prod verification to capture the raw token without opening Gmail.
    # MUST be removed from the env IMMEDIATELY after use (Task 6 Step 6.7.a is mandatory).
    _debug_raw_token: str | None = None

    class Config:
        # Pydantic v2 — allow underscore-prefixed fields to be serialized
        fields = {"_debug_raw_token": "_debug_raw_token"}
```

**Pydantic v1/v2 caveat:** If the project uses Pydantic v1, `_debug_raw_token` will be stripped (private field convention). If v2, the leading underscore needs explicit serialization. Check with `grep -n "^from pydantic\|^import pydantic" /Users/jeet/arthaBuild/src/backend/routers/auth.py` and `cat /Users/jeet/arthaBuild/src/backend/requirements.txt | grep pydantic`. **If the underscore form is awkward, use a non-underscore field name `debug_raw_token` instead** (less convention but safer to serialize). Pick whichever Pydantic version supports cleanly — both work for our purposes since the field is purely internal/temporary.

**Step 3.E2 — Populate the field in the endpoint.** At auth.py:457, replace:
```python
    return RequestAccessResponse(message=_REQUEST_ACCESS_GENERIC_RESPONSE)
```
with:
```python
    # quick-323 — debug-only raw-token echo, for Task 6 prod verification.
    # Gated by MAGIC_LINK_DEBUG_RETURN_RAW env var. MUST be removed after Task 6.
    debug_token = raw_token if os.getenv("MAGIC_LINK_DEBUG_RETURN_RAW", "").lower() == "true" else None
    return RequestAccessResponse(
        message=_REQUEST_ACCESS_GENERIC_RESPONSE,
        _debug_raw_token=debug_token,  # rename to debug_raw_token if Pydantic v2 strips underscore
    )
```

(`raw_token` is already in scope at this line — verify with `sed -n '440,460p' /Users/jeet/arthaBuild/src/backend/routers/auth.py`. If the variable is named differently — e.g., `token` or `plaintext` — match the actual local name.)

**Step 3.E3 — Verify the hook is OFF by default in tests:**
```bash
cd /Users/jeet/arthaBuild
# tests do not set MAGIC_LINK_DEBUG_RETURN_RAW, so the field must be None/absent
pytest src/backend/tests/test_magic_link_signup.py::test_magic_redeem_happy_path -v 2>&1 | tail -10
```
The existing happy-path test does not assert on the field — it should still pass unchanged.
  </action>
  <verify>
1. **Function-scoped** `awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -c "create_access_token(user.id"` returns **1** (was 2 inside magic_redeem before edit; file-wide stays at 4 because login/google/refresh paths are unchanged).
2. **Function-scoped** `awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' auth.py | grep -c "cached_access_token"` returns **3** (1 existence-check + 1 read-assign in grace branch, 1 write in first-redeem branch).
3. **Function-scoped** `awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' auth.py | grep -c "cached_refresh_token"` returns **3** (same pattern).
4. **Combined** `awk '...' auth.py | grep -cE "cached_(access|refresh)_token"` returns **6**.
5. `python -c "import ast; ast.parse(open('/Users/jeet/arthaBuild/src/backend/routers/auth.py').read())"` exits 0.
6. `grep -n "cache_missing" /Users/jeet/arthaBuild/src/backend/routers/auth.py` shows the new audit result string in the grace branch.
7. **M2 — bump-before-return ordering check** (the redeem_count must increment BEFORE the cached JWT is returned, otherwise Task 6 Step 6.4's `assert row[2] == 2` fails):
   ```bash
   awk '/^async def magic_redeem/,/^async def [a-z]|^@router/' /Users/jeet/arthaBuild/src/backend/routers/auth.py | grep -n "redeem_count\|return TokenResponse" | head -10
   ```
   Expected: `redeem_count = (token_record.redeem_count or 0) + 1` line appears BEFORE `return TokenResponse` line in the grace branch.
8. `grep -c "_debug_raw_token\|debug_raw_token" /Users/jeet/arthaBuild/src/backend/routers/auth.py` returns **≥2** (1 in `RequestAccessResponse` model + 1 in `request_access` endpoint return).
  </verify>
  <done>Grace branch returns cached JWT; first-redeem branch persists it; cache_missing 401 fallback in place; redeem_count bump happens BEFORE return; debug-raw-token hook gated by env var; ast.parse clean; create_access_token call count inside magic_redeem dropped from 2→1.</done>
</task>

<task type="auto">
  <name>Task 4: Extend test_magic_link_signup.py — assert SAME JWT bytes within grace window</name>
  <files>/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py</files>
  <action>
Modify the existing test `test_magic_redeem_second_attempt_within_grace_succeeds` (auth.py:205) and add 2 new test cases.

**Modify existing test (`test_magic_redeem_second_attempt_within_grace_succeeds` at line 204):**

**STEP 1 — Re-grep first to confirm variable name still matches:**
```bash
sed -n '205,247p' /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py | grep -nE "first_access|body1|r1\.json"
```
Expected: line 227 shows `first_access = r1.json()["access_token"]` (a STRING, not a dict). The current test discards `refresh_token` and the rest of the body. We need the full dict to compare both tokens.

**STEP 2 — Replace the string capture with a dict capture.** Find this exact line (auth.py:227):
```python
    first_access = r1.json()["access_token"]
```
Replace with:
```python
    body1 = r1.json()
```

**STEP 3 — Add same-JWT assertions after `body2 = r2.json()` (currently line 231).** Insert AFTER line 234 (`assert body2["email"].lower() == _email(5)`) and BEFORE the `# DB state:` block at line 236:
```python
    # quick-323 — within the grace window, the SAME JWT bytes must come back,
    # not a fresh pair. Otherwise we double the token lifetime (new jti, new iat).
    assert body2["access_token"] == body1["access_token"], (
        "quick-323: grace-window redeem returned a DIFFERENT access_token. "
        "This doubles JWT lifetime via fresh jti+iat. The cached_access_token "
        "column on magic_link_tokens must be returned verbatim."
    )
    assert body2["refresh_token"] == body1["refresh_token"], (
        "quick-323: grace-window redeem returned a DIFFERENT refresh_token."
    )
```

**STEP 4 — Sanity grep after both edits:**
```bash
grep -n "first_access\|body1\|body2" /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py | head -10
```
Expected: zero hits for `first_access` (variable removed), `body1` appears once (~line 227), `body2` appears 3-5 times (existing 3 + new 2). If `first_access` still shows up, Step 2 missed.

**Add new tests (after the LAST test in the file — append at EOF):**

**Note on helpers:** `_issue_magic_link` and `_capture_send_link` DO NOT exist in this file (verified `grep -n "_issue_magic_link\|_capture_send_link" /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` returns ZERO hits). The existing tests inline the `_capture` async function and call `client.post("/api/auth/request-access", ...)` directly — replicate that exact pattern below. Do NOT introduce new helpers.

```python
@pytest.mark.asyncio
async def test_magic_redeem_two_different_uas_get_same_jwt(client, db_session, monkeypatch):
    """quick-323 — UA-agnostic cache. CriOS (Gmail iOS preview) hits redeem
    first, Safari iOS hits a beat later: BOTH must receive the SAME JWT
    bytes. Confirms the cached column does not depend on User-Agent."""
    captured = {}

    async def _capture(to_email, name, magic_link, expiry_hours=24):
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(magic_link).query)
        captured["token"] = q.get("token", [""])[0]

    import routers.auth as auth_mod
    monkeypatch.setattr(auth_mod, "send_magic_link_email", _capture)

    await client.post("/api/auth/request-access", json={
        "name": "UA Race", "email": _email(20),
    })
    raw = captured["token"]

    # First redeem — simulate CriOS (Chrome iOS / Gmail in-app preview).
    r1 = await client.post(
        "/api/auth/magic/redeem",
        json={"token": raw},
        headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) CriOS/145.0.0.0 Mobile/15E148 Safari/604.1"},
    )
    assert r1.status_code == 200, r1.text
    body1 = r1.json()

    # Second redeem — simulate Safari iOS (the user's actual tap), well inside grace window.
    r2 = await client.post(
        "/api/auth/magic/redeem",
        json={"token": raw},
        headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"},
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()

    # Same JWT bytes regardless of UA.
    assert body1["access_token"] == body2["access_token"], "UA-agnostic cache must return SAME access_token"
    assert body1["refresh_token"] == body2["refresh_token"], "UA-agnostic cache must return SAME refresh_token"


@pytest.mark.asyncio
async def test_magic_redeem_no_cross_token_jwt_leak(client, db_session, monkeypatch):
    """quick-323 — Two distinct magic tokens must yield two DIFFERENT JWT
    pairs. Confirms cache is keyed on the row, not shared across rows."""
    captures = {"a": {}, "b": {}}

    def _make_capture(slot):
        async def _capture(to_email, name, magic_link, expiry_hours=24):
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(magic_link).query)
            captures[slot]["token"] = q.get("token", [""])[0]
        return _capture

    import routers.auth as auth_mod

    # Issue token A
    monkeypatch.setattr(auth_mod, "send_magic_link_email", _make_capture("a"))
    await client.post("/api/auth/request-access", json={"name": "Iso A", "email": _email(21)})
    raw_a = captures["a"]["token"]

    # Issue token B (different user)
    monkeypatch.setattr(auth_mod, "send_magic_link_email", _make_capture("b"))
    await client.post("/api/auth/request-access", json={"name": "Iso B", "email": _email(22)})
    raw_b = captures["b"]["token"]

    ra = await client.post("/api/auth/magic/redeem", json={"token": raw_a})
    rb = await client.post("/api/auth/magic/redeem", json={"token": raw_b})
    assert ra.status_code == 200, ra.text
    assert rb.status_code == 200, rb.text
    body_a = ra.json()
    body_b = rb.json()
    assert body_a["access_token"] != body_b["access_token"], "different tokens must yield different access JWTs"
    assert body_a["refresh_token"] != body_b["refresh_token"], "different tokens must yield different refresh JWTs"
```

**Note on `_email(N)` helper:** The existing test file uses `_email(N)` to build deterministic emails (see usages at lines 168, 221, 234, 239). Use indices 20+ to avoid collision with existing tests (1-10 are taken). Verify with: `grep -nE "^def _email|_email\(" /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py | head -5`. If `_email()` isn't defined in this file, fall back to inline literal emails like `f"ua-race-{int(time.time())}@arthaBuild-test.com"` (and add `import time` to the top).

**Note on `import asyncio`:** Not used in the new tests above (no `asyncio.sleep`). If the existing file already imports `asyncio` at the top, leave it; otherwise no new import needed.

**Run tests:**
```
cd /Users/jeet/arthaBuild
pytest src/backend/tests/test_magic_link_signup.py -v 2>&1 | tail -30
```

All 4 existing magic_redeem tests + 2 new tests pass = 6 magic_redeem assertions green. The modified `test_magic_redeem_second_attempt_within_grace_succeeds` will FAIL on unmodified code (proving it catches regression) but PASS after Task 3 is applied.

Then run the full suite:
```
cd /Users/jeet/arthaBuild
pytest src/backend/tests/ 2>&1 | tail -5
```

Compare to PREFLIGHT.txt baseline. Must show: `(baseline_passed + 2) passed, (baseline_failed) failed, (baseline_skipped) skipped`. Failed count MUST NOT increase. If it does, STOP and revert.
  </action>
  <verify>
1. `pytest src/backend/tests/test_magic_link_signup.py -v` — 6 magic_redeem tests pass (4 original + 2 new).
2. `pytest src/backend/tests/ 2>&1 | grep -E "passed|failed"` — passed count = baseline+2 (or +N where N = new tests added), failed count unchanged from baseline.
3. `grep -c "test_magic_redeem" /Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` returns 6.
  </verify>
  <done>2 new tests added; 1 existing test strengthened with same-JWT assertion; full pytest suite passes baseline+new with zero new failures.</done>
</task>

<task type="auto">
  <name>Task 5: Capture rollback baseline and deploy to prod (build → force-recreate → migration check)</name>
  <files>(prod ops — no source edits)</files>
  <action>
**SSH into prod — pre-resolved per quick-322 precedent: `ubuntu@44.194.34.223` with key `~/.ssh/techcloudpro-key-1764031372.pem`.** All `ssh ...` commands below use this exact host + key. No interactive lookup needed.

**Step 5.1 — Capture rollback artifacts on prod (BEFORE deploy):**

The prod box has no `.git` directory (per quick-322 record). Capture the live files via `docker cp` from the running container OR from the prod-checkout dir:

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'set -e; cd /home/ubuntu/arthaBuild && \
  cp src/backend/models.py src/backend/models.py.323-rollback && \
  cp src/backend/routers/auth.py src/backend/routers/auth.py.323-rollback && \
  ls src/backend/alembic/versions/k6l7m8n9o0p1_netsuite_connect_requests.py && \
  echo "current head before deploy: k6l7m8n9o0p1" > /home/ubuntu/arthaBuild/.323-rollback-state && \
  md5sum src/backend/models.py.323-rollback src/backend/routers/auth.py.323-rollback >> /home/ubuntu/arthaBuild/.323-rollback-state && \
  cat /home/ubuntu/arthaBuild/.323-rollback-state'
```

Record the printed md5sum output in the executor's notes — these are the rollback fingerprints.

**Step 5.2 — Sync code to prod via git (or rsync if no remote):**

If user has a github remote `arthabuild` (per memory: `github.com/jeet-avatar/arthabuild`), use git push from local then `git pull` on prod. Otherwise rsync:

```bash
# Local: ensure repo is committed first (Task 6 will commit before this — but the deploy task does the rsync)
rsync -av --include='src/backend/models.py' \
          --include='src/backend/routers/auth.py' \
          --include='src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py' \
          --include='src/backend/tests/test_magic_link_signup.py' \
          --exclude='*' \
          -e "ssh -i ~/.ssh/techcloudpro-key-1764031372.pem" \
          /Users/jeet/arthaBuild/ ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/
```

(If a different sync mechanism is in use — e.g., `deploy.sh` script in the repo root — invoke that instead. Read `/Users/jeet/arthaBuild/deploy.sh` first.)

**Step 5.3 — Build + recreate backend container:**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'cd /home/ubuntu/arthaBuild && \
  docker compose build backend 2>&1 | tail -10 && \
  docker compose up -d --force-recreate backend 2>&1 | tail -5'
```

**Step 5.4 — Verify alembic migration applied:**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'docker exec arthaBuild-backend python -c "
import sqlite3
con = sqlite3.connect(\"file:/app/data/arthaBuild.db?mode=ro\", uri=True)
cur = con.execute(\"SELECT version_num FROM alembic_version\")
print(\"head:\", cur.fetchone())
cur = con.execute(\"PRAGMA table_info(magic_link_tokens)\")
cols = [row[1] for row in cur.fetchall()]
print(\"columns:\", cols)
assert \"cached_access_token\" in cols, \"cached_access_token missing — migration did not run\"
assert \"cached_refresh_token\" in cols, \"cached_refresh_token missing — migration did not run\"
print(\"OK\")
"'
```

Expected output:
```
head: ('l7m8n9o0p1q2',)
columns: ['id', 'user_id', 'token_hash', 'expires_at', 'consumed_at', 'issued_ip', 'created_at', 'redeem_count', 'cached_access_token', 'cached_refresh_token']
OK
```

If `head` is still `k6l7m8n9o0p1`, migration didn't run on container start — check `entrypoint.sh` for the alembic upgrade call. If columns are missing, STOP and roll back (Step 5.6).

**Step 5.5 — Smoke /healthz / /api/auth (sanity that container is up):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'curl -sf https://artha.build/api/health && echo OK || echo FAIL'
```

If FAIL, container did not come up — check `docker logs arthaBuild-backend --tail 50` and roll back.

**Step 5.6 — Rollback procedure (RUN ONLY IF Step 5.4 OR Step 5.5 fails):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'set -e; cd /home/ubuntu/arthaBuild && \
  cp src/backend/models.py.323-rollback src/backend/models.py && \
  cp src/backend/routers/auth.py.323-rollback src/backend/routers/auth.py && \
  rm -f src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py && \
  docker exec arthaBuild-backend alembic -c src/backend/alembic.ini downgrade -1 && \
  docker compose build backend && docker compose up -d --force-recreate backend'
```

Then rerun Step 5.4 — head should be back to `k6l7m8n9o0p1`, cached_* columns absent.
  </action>
  <verify>
1. `ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'cat /home/ubuntu/arthaBuild/.323-rollback-state'` shows captured md5sums.
2. Migration head on prod = `l7m8n9o0p1q2`.
3. `magic_link_tokens` columns include both `cached_access_token` and `cached_refresh_token`.
4. `curl -sf https://artha.build/api/health` returns success.
5. `docker logs arthaBuild-backend --tail 30` shows no errors mentioning "cached_access_token", "magic_link_tokens", or "alembic".
  </verify>
  <done>Rollback artifacts saved with md5sums; new migration applied (head=l7m8n9o0p1q2); both new columns visible on prod DB; backend container healthy.</done>
</task>

<task type="auto">
  <name>Task 6: LIVE acceptance gate — real-mailbox end-to-end with two UAs and SAME-JWT proof</name>
  <files>(prod live test — no edits)</files>
  <action>
This is the hard go/no-go for go-live. Three observable proofs MUST come back true.

**Step 6.0 — ENABLE the debug env var on prod (REVERSIBLE, MANDATORY-CLEAN-UP at Step 6.7):**

Per Task 3.5, the backend reads `MAGIC_LINK_DEBUG_RETURN_RAW` at request time. Setting it BEFORE Step 6.1 makes `/api/auth/request-access` echo back a `_debug_raw_token` field for the duration of this test.

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'cd /home/ubuntu/arthaBuild && \
  grep -q "^MAGIC_LINK_DEBUG_RETURN_RAW=" .env && echo "ALREADY SET — abort, investigate" && exit 1; \
  echo "MAGIC_LINK_DEBUG_RETURN_RAW=true" >> .env && \
  docker compose up -d --force-recreate backend 2>&1 | tail -3 && \
  echo "DEBUG MODE ON — MUST be cleaned at Step 6.7"'
```

If the env var is already present, abort and investigate — it should NEVER be on outside this test.

**Step 6.1 — Issue a fresh magic link to a real mailbox (per memory rule):**

```bash
TS=$(date +%s)
TEST_EMAIL="jeetnair.in+323-test-${TS}@gmail.com"
echo "Test email: ${TEST_EMAIL}"

RESP_REQ=$(curl -sS -X POST 'https://artha.build/api/auth/request-access' \
  -H 'Content-Type: application/json' \
  -H "X-Real-IP: 127.0.0.99" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"name\":\"Quick323 Tester\",\"role\":\"consultant\",\"company\":\"Test\",\"what_youd_build\":\"go-live verification\"}")
echo "$RESP_REQ" | jq .

# Pull the raw token from the debug field (only present because Step 6.0 set the env var)
RAW_TOKEN=$(echo "$RESP_REQ" | jq -r '._debug_raw_token // empty')
if [ -z "$RAW_TOKEN" ]; then
  echo "FAIL: _debug_raw_token missing from response. Either Step 6.0 was skipped or the backend didn't restart cleanly. Check 'docker exec arthaBuild-backend env | grep MAGIC_LINK_DEBUG'."
  exit 1
fi
echo "RAW_TOKEN length: ${#RAW_TOKEN}"  # should be 40-80 chars (urlsafe random)
```

Expected: 200 with `_debug_raw_token` field populated (a real email is also sent in the background — that's fine, just ignore it; the test does NOT depend on opening Gmail).

**Step 6.2 — Confirm DB state pre-redeem (sanity, NOT for token retrieval):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem "docker exec arthaBuild-backend python -c \"
import sqlite3
con = sqlite3.connect('file:/app/data/arthaBuild.db?mode=ro', uri=True)
cur = con.execute('''
  SELECT m.id, m.consumed_at, m.redeem_count,
         m.cached_access_token IS NOT NULL AS has_cached_a,
         m.cached_refresh_token IS NOT NULL AS has_cached_r
  FROM magic_link_tokens m JOIN users u ON u.id = m.user_id
  WHERE u.email = ? ORDER BY m.id DESC LIMIT 1
''', ('${TEST_EMAIL}',))
row = cur.fetchone()
print('PRE-REDEEM row:', row)
# Expected: (<id>, None, 0, 0, 0) — unconsumed, no cache yet
assert row[1] is None, f'token already consumed: {row}'
assert row[2] == 0, f'redeem_count nonzero: {row}'
assert row[3] == 0 and row[4] == 0, f'cached cols already populated: {row}'
print('OK')
\""
```

**Step 6.3 — TWO redeems, < 5 second gap, different UAs (the Bhavya scenario):**

`$RAW_TOKEN` was already captured in Step 6.1 from the `_debug_raw_token` response field — no Gmail copy-paste needed.

```bash
# Call 1: CriOS (Gmail iOS in-app browser preview)
RESP_A=$(curl -sS -X POST 'https://artha.build/api/auth/magic/redeem' \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) CriOS/145.0.0.0 Mobile/15E148 Safari/604.1' \
  -d "{\"token\":\"${RAW_TOKEN}\"}")
echo "$RESP_A" | jq .
JWT_A=$(echo "$RESP_A" | jq -r .access_token)
RT_A=$(echo "$RESP_A" | jq -r .refresh_token)

sleep 3  # simulate user-tap delay

# Call 2: Safari iOS (the user's actual default browser handoff)
RESP_B=$(curl -sS -X POST 'https://artha.build/api/auth/magic/redeem' \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' \
  -d "{\"token\":\"${RAW_TOKEN}\"}")
echo "$RESP_B" | jq .
JWT_B=$(echo "$RESP_B" | jq -r .access_token)
RT_B=$(echo "$RESP_B" | jq -r .refresh_token)

# Proof 1: same access_token bytes
if [ "$JWT_A" = "$JWT_B" ]; then echo "PROOF 1 PASS: access tokens match"; else echo "PROOF 1 FAIL"; exit 1; fi
# Proof 2: same refresh_token bytes
if [ "$RT_A" = "$RT_B" ]; then echo "PROOF 2 PASS: refresh tokens match"; else echo "PROOF 2 FAIL"; exit 1; fi
# Proof 3: same JTI in JWT (decode payload via Python — handles base64url padding cross-platform)
JTI_A=$(python3 -c "import base64,json,sys; t=sys.argv[1].split('.')[1]; t+='='*(-len(t)%4); print(json.loads(base64.urlsafe_b64decode(t))['jti'])" "$JWT_A")
JTI_B=$(python3 -c "import base64,json,sys; t=sys.argv[1].split('.')[1]; t+='='*(-len(t)%4); print(json.loads(base64.urlsafe_b64decode(t))['jti'])" "$JWT_B")
if [ "$JTI_A" = "$JTI_B" ]; then echo "PROOF 3 PASS: JTI matches ($JTI_A)"; else echo "PROOF 3 FAIL: $JTI_A vs $JTI_B"; exit 1; fi
```

(Python is preinstalled on macOS + the prod EC2 box. The Python decoder handles base64url padding consistently — bash `base64 -d` differs across macOS/Linux and silently fails on missing pad chars.)

**Step 6.4 — DB state proof (cached columns populated, redeem_count=2):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem "docker exec arthaBuild-backend python -c \"
import sqlite3
con = sqlite3.connect('file:/app/data/arthaBuild.db?mode=ro', uri=True)
cur = con.execute('''
  SELECT m.id, m.consumed_at, m.redeem_count,
         length(m.cached_access_token), length(m.cached_refresh_token)
  FROM magic_link_tokens m JOIN users u ON u.id = m.user_id
  WHERE u.email = ? ORDER BY m.id DESC LIMIT 1
''', ('${TEST_EMAIL}',))
row = cur.fetchone()
print(row)
assert row[2] == 2, f'redeem_count expected 2, got {row[2]}'
assert row[3] > 100 and row[4] > 100, f'cached tokens too short: access={row[3]}, refresh={row[4]}'
print('OK')
\""
```

Expected: `(<id>, <ts>, 2, <len>, <len>)` with both lengths > 100. `redeem_count=2` confirms the grace branch was taken.

**Step 6.5 — Window-expiry hard-fail proof:**

```bash
sleep 65  # window is 60s; sleep 65s to ensure we're past it

RESP_C=$(curl -sS -w "\nHTTP_CODE:%{http_code}" -X POST 'https://artha.build/api/auth/magic/redeem' \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: curl/8.0 (post-window test)' \
  -d "{\"token\":\"${RAW_TOKEN}\"}")
echo "$RESP_C"
# Must contain HTTP_CODE:401
echo "$RESP_C" | grep -q 'HTTP_CODE:401' && echo "PROOF 4 PASS: post-window 401" || (echo "PROOF 4 FAIL"; exit 1)
```

**Step 6.6 — Audit trail proof (3 audit rows for this token):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem "docker exec arthaBuild-backend python -c \"
import sqlite3
con = sqlite3.connect('file:/app/data/arthaBuild.db?mode=ro', uri=True)
cur = con.execute('''
  SELECT action, result, ip_address FROM audit_logs
  WHERE action LIKE 'signup.magic_link%'
  ORDER BY id DESC LIMIT 5
''')
for row in cur:
  print(row)
\""
```

Expected to see (most recent first):
- `('signup.magic_link_redeem_failed', 'already_consumed', ...)`  ← Step 6.5
- `('signup.magic_link_grace_redeem', 'success', ...)`  ← Step 6.3 second call
- `('signup.magic_link_redeemed', 'success', ...)`  ← Step 6.3 first call
- `('signup.magic_link_issued', 'success', ...)`  ← Step 6.1

If any of those are missing, audit trail broke. Investigate.

**Step 6.7 — Cleanup (TWO PARTS, BOTH MANDATORY):**

**Step 6.7.a — REMOVE the debug env var (HARD REQUIREMENT — never leave production with this on):**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem 'cd /home/ubuntu/arthaBuild && \
  sed -i "/^MAGIC_LINK_DEBUG_RETURN_RAW=/d" .env && \
  ! grep -q "MAGIC_LINK_DEBUG_RETURN_RAW" .env && echo "ENV VAR REMOVED" && \
  docker compose up -d --force-recreate backend 2>&1 | tail -3'
```

**Verify the debug field is gone (post-cleanup smoke):**
```bash
TS2=$(date +%s)
RESP_VERIFY=$(curl -sS -X POST 'https://artha.build/api/auth/request-access' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"jeetnair.in+323-cleanup-${TS2}@gmail.com\",\"name\":\"Cleanup Verify\",\"role\":\"consultant\",\"company\":\"Test\",\"what_youd_build\":\"verify debug off\"}")
DEBUG_FIELD=$(echo "$RESP_VERIFY" | jq -r '._debug_raw_token // "ABSENT"')
if [ "$DEBUG_FIELD" = "ABSENT" ]; then
  echo "PROOF 5 PASS: _debug_raw_token field is gone — env var removed cleanly"
else
  echo "PROOF 5 FAIL: debug env var still active — RE-RUN step 6.7.a"
  exit 1
fi
```

**If PROOF 5 FAILS, quick-323 is NOT done. The system is in an insecure state until the env var is removed.**

**Step 6.7.b — Soft-delete the test users per the smoke-test memory rule:**

```bash
ssh ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem "docker exec arthaBuild-backend python -c \"
import sqlite3
con = sqlite3.connect('/app/data/arthaBuild.db')
con.execute('UPDATE users SET is_active=0 WHERE email LIKE ?', ('jeetnair.in+323-%@gmail.com',))
con.commit()
cur = con.execute('SELECT COUNT(*) FROM users WHERE email LIKE ? AND is_active=0', ('jeetnair.in+323-%@gmail.com',))
print('soft-deleted users:', cur.fetchone()[0])
\""
```

**ALL 5 PROOFS MUST PASS** before declaring quick-323 complete:
- PROOF 1-3 (Step 6.3): same access_token, same refresh_token, same JTI
- PROOF 4 (Step 6.5): post-window 401
- PROOF 5 (Step 6.7.a): `_debug_raw_token` field absent post-cleanup

If any fail, immediately roll back via Step 5.6 AND re-run Step 6.7.a to confirm the debug env var is off.
  </action>
  <verify>
1. PROOF 1 PASS — access_tokens identical byte-for-byte across CriOS + Safari calls.
2. PROOF 2 PASS — refresh_tokens identical byte-for-byte.
3. PROOF 3 PASS — JTI decoded from both JWTs is the same UUID.
4. PROOF 4 PASS — post-window redeem returns HTTP 401.
5. DB confirms `redeem_count=2`, both `cached_*` columns populated (length > 100).
6. audit_logs shows 4 rows: issued + redeemed + grace_redeem + redeem_failed(already_consumed).
7. Test user soft-deleted (`is_active=0`).
  </verify>
  <done>All 6 proofs pass on live prod. Bhavya scenario reproduced and validated as fixed. Test user cleaned up. Go-live unblocked.</done>
</task>

<task type="auto">
  <name>Task 7: Commit changes to arthaBuild repo (scoped, audit-clean)</name>
  <files>
/Users/jeet/arthaBuild/src/backend/models.py
/Users/jeet/arthaBuild/src/backend/routers/auth.py
/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py
/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py
  </files>
  <action>
ONLY these 4 files. No unrelated edits. No formatting churn elsewhere.

```bash
cd /Users/jeet/arthaBuild
git status -s
# Confirm exactly 4 files modified/added (3 modified + 1 new). If more, STOP.

git diff --stat src/backend/models.py src/backend/routers/auth.py src/backend/tests/test_magic_link_signup.py
git diff --stat --no-renames -- src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py 2>/dev/null

git add src/backend/models.py \
        src/backend/routers/auth.py \
        src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py \
        src/backend/tests/test_magic_link_signup.py

git commit -m "$(cat <<'EOF'
fix(quick-323): cache magic-link JWT pair to fix iOS Gmail in-app browser race

The Phase 40 grace window minted a fresh JWT pair (new jti, new iat) on the
second redeem within 60s — effectively doubling token lifetime. quick-323
persists the JWT pair on the magic_link_tokens row at first redeem and
returns the SAME bytes verbatim during the grace window.

Verified live on prod: CriOS (Gmail iOS preview) + Safari iOS calls within
5s now receive identical access_token + refresh_token + jti. Post-60s
redeem still 401s. Audit trail unchanged (issued + redeemed + grace_redeem
+ already_consumed when expired).

Schema: 2 nullable TEXT columns added via alembic l7m8n9o0p1q2.
Tests: 2 new cases + 1 existing test strengthened with same-JWT assertion.
Pytest baseline: 552 → 554 passed (zero new failures).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git log --oneline -1
```

(Do NOT push without explicit user instruction. The commit is local; push is a separate decision.)
  </action>
  <verify>
1. `git log -1 --stat` shows exactly 4 files in the commit (models.py, auth.py, alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py, tests/test_magic_link_signup.py).
2. `git status -s` returns empty (clean tree).
3. Commit message references "quick-323" and the security fix rationale.
  </verify>
  <done>Single scoped commit on arthaBuild main; 4 files; no unrelated changes; tree clean.</done>
</task>

</tasks>

<verification>
**Phase-level go/no-go gate (all must pass before declaring quick-323 done):**

| Gate | Source of truth | Pass criteria |
|------|-----------------|---------------|
| 1. PRE-FLIGHT facts match | Task 1 PREFLIGHT.txt | All 6 stop conditions pass; baseline pytest count captured |
| 2. Local pytest green | Task 4 | (baseline_passed + 2) passed, baseline_failed unchanged, 0 new errors |
| 3. Migration applied on prod | Task 5 Step 5.4 | alembic head = l7m8n9o0p1q2; both cached_* columns visible |
| 4. SAME JWT bytes proof | Task 6 Step 6.3 | access_token, refresh_token, jti all identical across CriOS + Safari calls |
| 5. Post-window 401 proof | Task 6 Step 6.5 | HTTP 401 after 65s sleep |
| 6. Audit trail proof | Task 6 Step 6.6 | 4 audit rows: issued + redeemed + grace_redeem + redeem_failed(already_consumed) |
| 7. Rollback artifacts captured | Task 5 Step 5.1 | `.323-rollback-state` file with md5sums on prod |
| 8. Commit scoped | Task 7 | Exactly 4 files in the commit on arthaBuild main |
| 9. Debug env var REMOVED | Task 6 Step 6.7.a (PROOF 5) | `_debug_raw_token` field absent from `/api/auth/request-access` response after cleanup. **HARD GATE — system is insecure until this passes.** |

If gate 4 fails (different JWTs returned), the security regression Phase 40 introduced is still live. STOP, roll back via Step 5.6, do NOT release for go-live.

If gate 9 fails (debug env var still set), even though the JWT fix is correct, the system is leaking raw magic-link tokens to anyone who hits `/api/auth/request-access`. STOP, re-run Step 6.7.a until the field is gone, do NOT release for go-live.
</verification>

<success_criteria>
- Bhavya scenario reproduced on prod with TWO real curl calls (different UAs, <5s gap, same token) → BOTH receive identical JWT bytes (proven via direct string comparison + JTI decode).
- Phase 40's 60s grace window unchanged in semantics (still 60s, still capped at 2 redemptions).
- Post-60s rejection unchanged (HTTP 401).
- Local pytest baseline maintained: 552 + 2 new = 554 passed; 54 pre-existing failures unchanged.
- 4-file scoped commit on arthaBuild main (no push).
- Rollback runbook captured on prod (`.323-rollback-state` + 2 `.323-rollback` file copies + md5sums).
- Test users soft-deleted (no orphan in prod users table per smoke-test memory rule).
- **MAGIC_LINK_DEBUG_RETURN_RAW env var REMOVED** post-Task-6 (PROOF 5 confirms `_debug_raw_token` is absent from `/api/auth/request-access` response).
</success_criteria>

<follow_ups>
Captured during quick-323 planning, deferred to keep this task scoped:

- **Scrub cached JWT post-expiry (security hardening, NOT blocking go-live).** After the access JWT's 24h `exp` passes, the `cached_access_token` + `cached_refresh_token` columns remain on the row. If the DB is exfiltrated post-expiry, an attacker recovers metadata (jti, iat) but NOT a usable session (the JWT is past `exp` and would be rejected by `decode_token`). Still: cleaner to NULL these columns when the row passes `expires_at`. Implementation: add a periodic job (or in-line check at next redeem attempt) that sets `cached_access_token = NULL, cached_refresh_token = NULL` where `expires_at < now() - interval '1 hour'`. **Estimated effort:** ~30min separate quick task. Not in quick-323 scope.

- **Promote `_debug_raw_token` to a permanent admin-only echo.** The env-gated debug field works for one-off prod tests but is fragile (depends on env var hygiene). Long-term, consider an admin-authed `/api/admin/magic-tokens/issue` endpoint that returns the raw token in the response (admin JWT required). Removes the need for the env-toggle dance entirely. **Estimated effort:** ~1hr separate quick task. Not in quick-323 scope.
</follow_ups>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/323-fix-ios-magic-link-single-use-token-race/323-SUMMARY.md` capturing:
- Files changed (4) with line counts
- pytest delta (552 → 554)
- Live proof artifacts: JWT_A, JWT_B, JTI (mask middle 80% of each — first 6 + last 6 chars only)
- Audit row IDs: issued, redeemed, grace_redeem, redeem_failed
- Rollback md5sums (paste from `.323-rollback-state`)
- Final go-live verdict: GO / NO-GO + rationale
</output>
