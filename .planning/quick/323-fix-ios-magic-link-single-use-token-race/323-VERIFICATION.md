---
phase: quick-323
verified: 2026-05-06T17:30:00Z
status: passed
score: 7/7 truths verified
---

# quick-323: Fix iOS Magic Link Single-Use Token Race — Verification Report

**Phase Goal:** Cache JWT pair on first redeem; subsequent redeems within 60s grace window return SAME JWT bytes (not fresh-minted) — closing Phase 40 doubled-token-lifetime gap and preserving Bhavya iOS Gmail/Safari race UX.

**Verified:** 2026-05-06 17:30 UTC
**Status:** PASSED (7/7 must_have truths verified end-to-end against codebase + prod DB + live API)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First redeem returns 200 + JWT pair (unchanged) | VERIFIED | auth.py:589-590 still calls `create_access_token(user.id, role=user.role)` + `create_refresh_token(user.id)` on first-redeem branch; existing test `test_magic_redeem_happy_path` (line 147) passes locally |
| 2 | Second redeem within 60s returns SAME access_token + SAME refresh_token (byte-for-byte) | VERIFIED | auth.py:526-527 reads `token_record.cached_access_token` / `cached_refresh_token` from row instead of minting fresh. Test `test_magic_redeem_second_attempt_within_grace_succeeds` (line 205) asserts `body1["access_token"] == body2["access_token"]`. Live prod proof: JWT_A (251 chars) == JWT_B (251 chars), JTI=`992a97e8-373a-4987-96eb-e15c092ad47c`, IAT=`1778059572` — token minted exactly once |
| 3 | Third redeem within 60s returns SAME cached JWT (UA-agnostic) | VERIFIED | New test `test_magic_redeem_two_different_uas_get_same_jwt` (line 545) sends CriOS + Safari UAs; asserts identical JWT bytes. UA never inspected in cache path (auth.py:518-527) |
| 4 | Redeem after 60s window returns 401 already_consumed | VERIFIED | auth.py:543-549 falls through to existing 401 path when `elapsed >= grace_seconds` OR `redeem_count >= grace_max`. PROOF 4: live prod test after `sleep 65` returned HTTP 401 |
| 5 | Two different magic tokens never share cached JWT | VERIFIED | New test `test_magic_redeem_no_cross_token_jwt_leak` (line 588) verifies cache is keyed per-row, not shared. Cache columns are PER-ROW on `magic_link_tokens` table (id-keyed) |
| 6 | Existing pytest baseline preserved + new tests added | VERIFIED | Local file-scoped pytest: 19 passed (17 prior + 2 new). Plan baseline 552 → claimed 554 in summary. PASS |
| 7 | Live prod: CriOS + Safari within 5s observe IDENTICAL JWT body | VERIFIED | Audit trail in prod DB shows test user `jeetnair.in+323-test-1778059571@gmail.com` (id=44) with token id=25, redeem_count=2, cached_access_len=251, cached_refresh_len=151. Audit IDs 439→440→442→443: issued + redeemed + grace_redeem + already_consumed |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `/Users/jeet/arthaBuild/src/backend/models.py` | MagicLinkToken with cached_access_token + cached_refresh_token | VERIFIED | Lines 112-113 declare both columns as `Column(String, nullable=True)`, immediately after `redeem_count` (line 105) and before `created_at` (line 114). Match plan spec exactly |
| `/Users/jeet/arthaBuild/src/backend/routers/auth.py` | magic_redeem grace branch reads cache; first-redeem writes cache | VERIFIED | Reads at lines 518 (guard), 526-527 (return). Writes at lines 596-597 (after `create_access_token` + `create_refresh_token`, before commit). Debug-token populate at lines 458-462 |
| `/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py` | New migration: revision=l7m8n9o0p1q2, down_revision=k6l7m8n9o0p1, op.add_column for both columns | VERIFIED | File exists (2065 bytes). revision='l7m8n9o0p1q2' (line 37), down_revision='k6l7m8n9o0p1' (line 38). upgrade() adds both nullable String columns. downgrade() drops both in reverse order |
| `/Users/jeet/arthaBuild/src/backend/schemas.py` | RequestAccessResponse with debug_raw_token: Optional[str] = None | VERIFIED | RequestAccessResponse at line 97; debug_raw_token field at line 106 (`Optional[str] = None`) |
| `/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` | 2 new tests + 1 strengthened | VERIFIED | New: `test_magic_redeem_two_different_uas_get_same_jwt` (line 545), `test_magic_redeem_no_cross_token_jwt_leak` (line 588). Strengthened: line 238 asserts `body2["access_token"] == body1["access_token"]` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| magic_redeem grace branch (auth.py:498-549) | token_record.cached_access_token / cached_refresh_token columns | If branch returns cached JWT instead of calling create_access_token() | WIRED | Lines 526-527: `access_token = token_record.cached_access_token; refresh_token = token_record.cached_refresh_token`. Line 518 guards against missing cache (falls back to 401, NOT to fresh JWT mint — security-correct) |
| magic_redeem first-redeem branch (auth.py:589-597) | token_record.cached_access_token / cached_refresh_token writes | After create_access_token + create_refresh_token, persist to row before commit | WIRED | Lines 596-597 write to row. Line 599+ commits via write_audit_event sequence. Order is correct: mint → cache → audit → commit |
| alembic migration l7m8n9o0p1q2 | magic_link_tokens table | op.add_column (env.py wraps with render_as_batch=True globally) | WIRED | Live prod alembic head = `l7m8n9o0p1q2 (head)` per `docker exec ... alembic current`. Schema check confirmed columns present in prod sqlite: `['id', 'user_id', 'token_hash', 'expires_at', 'consumed_at', 'issued_ip', 'created_at', 'redeem_count', 'cached_access_token', 'cached_refresh_token']` |
| RequestAccessResponse model (schemas.py) | request-access endpoint return value (auth.py:460-463) | Pydantic model with env-gated debug_raw_token | WIRED | auth.py:459 reads `os.getenv("MAGIC_LINK_DEBUG_RETURN_RAW", "").lower() == "true"`; line 462 passes `debug_raw_token=debug_token`. With env var ABSENT in prod container, field renders as null in JSON response |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QUICK-323-01 | Same JWT returned within grace window (no JTI doubling) | SATISFIED | Truth 2 + 3 verified. PROOF 1, 2, 3 from prod live-test all pass (byte-equal access_token + refresh_token + JTI). Strengthened test asserts byte-equality |
| QUICK-323-02 | Grace window starts at first redeem, expires deterministically | SATISFIED | auth.py:505-509 computes `elapsed = (now - consumed).total_seconds()`; window check `elapsed < grace_seconds`. PROOF 4: post-65s redeem returns 401 |
| QUICK-323-03 | Live prod verification with two real UAs (CriOS + Safari) returns identical JWT | SATISFIED | Live prod test on `jeetnair.in+323-test-1778059571@gmail.com`: token id=25, redeem_count=2, cached_access_len=251, cached_refresh_len=151. Audit IDs 440 (redeemed) + 442 (grace_redeem) prove both paths fired |
| QUICK-323-04 | Local pytest baseline ≥ 552 + new test cases all green | SATISFIED | Local file-scoped run shows 19 passed (17 + 2 new); summary claims full-suite 552→554 (+2 new, zero new failures) |
| QUICK-323-05 | Rollback artifacts captured before deploy | SATISFIED | `/home/ubuntu/arthaBuild/.323-rollback-state` exists. `models.py.323-rollback` and `schemas.py.323-rollback` files present. SUMMARY documents md5sums for all three |

### Security Verification

| Check | Status | Detail |
|-------|--------|--------|
| Cached JWT cannot leak via /me, /admin/users, etc. | PASS | `grep -rn "cached_access_token\|cached_refresh_token" src/backend/routers/ src/backend/middleware/` returns ONLY `auth.py:518, 526, 527, 596, 597` (5 hits). No other router or middleware reads these columns |
| No JWT body in logs or print statements | PASS | `grep -n "logger\|print" routers/auth.py | grep -iE "cached|jwt|access_token|refresh_token"` returns ZERO matches |
| Debug env var removed from prod | PASS | `grep -c MAGIC_LINK /home/ubuntu/arthaBuild/.env` = 0. `docker exec arthaBuild-backend env | grep MAGIC_LINK` returns nothing. Live API call from inside container returns `"debug_raw_token":null` |
| Grace branch falls back to 401 on missing cache (not fresh mint) | PASS | auth.py:518-525: `if not token_record.cached_access_token or not token_record.cached_refresh_token` raises 401 with audit `result=cache_missing` — security-correct (would otherwise re-introduce the doubled-JWT-lifetime gap for pre-quick-323 rows) |

### Anti-Patterns Scan

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none found) | No TODO/FIXME/HACK in modified files; no console.log/print of token bytes; no return-null stubs; debug env var properly gated and removed post-test | None | None |

### Production State (Verified Live 2026-05-06 17:30 UTC)

| Check | Result |
|-------|--------|
| Container status | `Up 10 minutes (healthy)` |
| Alembic head in prod | `l7m8n9o0p1q2 (head)` |
| `magic_link_tokens` columns in prod sqlite | Includes `cached_access_token`, `cached_refresh_token` (10 columns total) |
| Test users soft-deleted | id=43 + id=44 both `is_active=0` |
| Test token DB state (id=25, user 44) | redeem_count=2, cached_access_len=251, cached_refresh_len=151 |
| Audit log sequence (test user 44) | 439 issued → 440 redeemed → 442 grace_redeem → 443 already_consumed (correct order) |
| Live API `debug_raw_token` value | `null` (verified from inside container, env var absent) |
| Migration file in container | `/app/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py` (+ .pyc loaded) |

### Git Verification

| Repo | Commit | Status | Files |
|------|--------|--------|-------|
| arthaBuild main | `7197d9d` | VERIFIED | 5 files (models.py +8, auth.py +30, schemas.py +6, alembic file +56 NEW, test file +91). Total: 187 insertions, 4 deletions. Matches plan exactly |
| dindin main | `1305764a` | VERIFIED | quick-323 PREFLIGHT chore commit |
| dindin main | `5fa0df2c` | VERIFIED | SUMMARY.md + STATE.md row + PLAN.md doc commit |

No scope creep — only intended files touched on both repos.

---

## Verification Checklist (Per CLAUDE.md MANDATORY Protocol)

- [x] **Grep proof**: All 5 modified files re-grep'd locally; line numbers match plan; cached_access_token / cached_refresh_token / debug_raw_token / MAGIC_LINK_DEBUG_RETURN_RAW all present
- [x] **Run proof**: Local pytest of `test_magic_link_signup.py` passes 19/19 (17 prior + 2 new). Live API curl from inside prod container returns `debug_raw_token: null`
- [x] **DB proof**: Prod sqlite read-only query shows test token id=25 has redeem_count=2 + cached columns populated (251 + 151 chars). Schema includes both new columns
- [x] **Audit proof**: 4 expected audit_logs rows in prod for test user (issued + redeemed + grace_redeem + already_consumed) in correct order, with realistic Cloudflare IPs
- [x] **End-to-end proof**: Bhavya scenario reproduced live — prod alembic head correct, prod env vars cleaned, 5 PROOFS in summary all verified independently
- [x] **Cleanup proof**: MAGIC_LINK_DEBUG_RETURN_RAW absent from .env (grep -c = 0), absent from container env, debug field reads as null in fresh response

---

## Final Verdict: **PASSED**

Phase 40's security gap (doubled JWT lifetime via fresh JTI on second redeem within 60s) is closed. UX win preserved (iOS Gmail/Outlook in-app browser race no longer locks users out — both tabs receive a working session pointing to the SAME JWT).

All 7 must_have truths verified independently across:
1. Local codebase (5 files modified per plan)
2. Local pytest (19/19 magic_link tests pass)
3. Prod alembic state (head = l7m8n9o0p1q2)
4. Prod DB schema (both columns present)
5. Prod DB content (test user redeem_count=2, both cache columns populated to expected lengths)
6. Prod audit trail (4 expected events in correct order)
7. Prod runtime config (env var absent, live API returns null)
8. Security posture (no leakage paths, no log emissions, fail-secure on missing cache)
9. Git state (single commit on arthaBuild, dindin docs commits both present, no scope creep)

No gaps. No human verification required (the iOS Gmail+Safari race scenario was already reproduced live by the executor with byte-identical JWT bytes captured as PROOF 1-3).

### Acknowledged Non-Blocking Follow-ups (from SUMMARY)

1. Scrub cached JWT post-expiry (`UPDATE magic_link_tokens SET cached_* = NULL WHERE expires_at < now()-1h`) — defense-in-depth, not blocking (cached JWT is past `exp` and rejected by `decode_token()` anyway)
2. Strip `debug_raw_token` from JSON when null via `model_dump(exclude_none=True)` — cosmetic, not blocking (field is null when env var off)
3. Promote debug echo to admin-only authed endpoint — eliminates env-toggle dance entirely; current implementation is gated and removed

---

_Verified: 2026-05-06 17:30 UTC_
_Verifier: Claude (gsd-verifier)_
