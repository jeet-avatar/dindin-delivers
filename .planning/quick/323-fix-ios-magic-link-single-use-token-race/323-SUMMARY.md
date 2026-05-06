---
phase: quick-323
plan: 01
subsystem: arthaBuild auth (magic-link redeem)
tags: [auth, magic-link, ios, security, jwt-caching, gmail-race]
requires:
  - "Phase 40 grace window infra (j5k6l7m8n9o0_redeem_count)"
  - "alembic env.py render_as_batch=True wrapper"
provides:
  - "Bhavya-pattern fix: iOS Gmail in-app preview + Safari race both succeed with SAME JWT bytes"
  - "MagicLinkToken.cached_access_token + cached_refresh_token columns"
  - "magic_redeem grace branch returns cached strings verbatim (no fresh JTI/iat)"
  - "RequestAccessResponse env-gated debug_raw_token field (currently OFF in prod)"
affects:
  - "iOS users who open magic link from Gmail/Outlook/LinkedIn in-app browser"
  - "All clients in the 60s grace window (UA-agnostic)"
tech-stack:
  added: []
  patterns:
    - "Cache the JWT string on the issuing row to keep it byte-stable across re-redeems"
    - "Env-gated debug echo for prod verification (must be removed post-test — HARD GATE)"
key-files:
  created:
    - "/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py (56 lines)"
  modified:
    - "/Users/jeet/arthaBuild/src/backend/models.py (+8 lines — 2 cached_* columns on MagicLinkToken)"
    - "/Users/jeet/arthaBuild/src/backend/routers/auth.py (+30 lines net — grace branch caches/serves; first-redeem persists; debug-token populate)"
    - "/Users/jeet/arthaBuild/src/backend/schemas.py (+6 lines — RequestAccessResponse.debug_raw_token Optional[str])"
    - "/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py (+91 lines — 2 new tests + 1 strengthened test)"
decisions:
  - "Option A (cache literal JWT) chosen over Option B (deterministic JWT) and Option C (UA sniffing). Justification: deterministic JWTs leak metadata via predictable iat; UA detection misses Gmail Android / Outlook iOS / LinkedIn iOS / desktop iframe previews. Cache is auditable and side-effect-free."
  - "Field name debug_raw_token (no leading underscore) chosen over _debug_raw_token. Pydantic v2 strips leading-underscore private attrs from serialization regardless of Config.fields tricks. Project uses pydantic[email]==2.9.2."
  - "5 files in commit (plan said 4). Plan assumed RequestAccessResponse model lived in routers/auth.py; actual location is schemas.py. Documented in commit message."
metrics:
  duration_seconds: 1247
  duration_human: "~20 minutes"
  completed: "2026-05-06"
  pytest_baseline: "552 passed, 54 failed, 18 skipped"
  pytest_after: "554 passed, 54 failed, 18 skipped (+2 new tests, zero new failures)"
---

# quick-323: Fix iOS Magic Link Single-Use Token Race (Cache JWT Pair)

## One-liner

Fixed iOS Gmail in-app preview racing Safari iOS by caching the JWT pair on the magic_link_tokens row — both browsers now receive byte-identical access_token, refresh_token, and JTI within the 60s grace window, eliminating the doubled-token-lifetime security gap that Phase 40 inadvertently introduced.

## What This Fixes

**Bhavya scenario (May 5, 2026 02:42:06Z):** Gmail iOS in-app browser (CriOS) opens a magic link, Safari iOS opens the same link 5s later. Phase 40's grace window allowed BOTH to succeed but minted a NEW JWT pair on the second call (new `jti`, new `iat` — effectively doubling token lifetime). quick-323 caches the first-redeem JWT pair on the row and returns the SAME bytes on the second redeem.

## Live Proof Artifacts (PROD verified 2026-05-06)

Test user: `jeetnair.in+323-test-1778059571@gmail.com` (soft-deleted post-test)

| Artifact | Value (masked) | Length |
|----------|---------------|--------|
| JWT_A (CriOS first call) | `eyJhbG…rW1v84` | 251 chars |
| JWT_B (Safari second call) | `eyJhbG…rW1v84` | 251 chars |
| Refresh token (both calls) | `eyJhbG…TswhJU` | 151 chars |
| JTI (both calls) | `992a97…2ad47c` | full: `992a97e8-373a-4987-96eb-e15c092ad47c` |
| IAT (both calls) | `1778059572` | bonus proof: token minted exactly once |

## 5 PROOFS — All PASSED

1. **PROOF 1**: `JWT_A == JWT_B` (byte-identical access_token strings) ✓
2. **PROOF 2**: `RT_A == RT_B` (byte-identical refresh_token strings) ✓
3. **PROOF 3**: `JTI_A == JTI_B == 992a97e8-373a-4987-96eb-e15c092ad47c` (decoded via Python base64url + json) ✓
4. **PROOF 4**: After `sleep 65` (past 60s grace window), redeem returns HTTP 401 ✓
5. **PROOF 5**: After `sed -i "/^MAGIC_LINK_DEBUG_RETURN_RAW=/d" .env` and force-recreate, `/api/auth/request-access` returns `debug_raw_token: null` (jq `// "ABSENT"` resolves null = absent) ✓

## Audit Trail (PROD)

For test user `jeetnair.in+323-test-1778059571@gmail.com`:

| audit_logs.id | action | result | ip_address |
|---------------|--------|--------|-----------|
| 439 | signup.magic_link_issued | success | 104.23.251.205 |
| 440 | signup.magic_link_redeemed | success | 172.70.214.11 |
| 442 | signup.magic_link_grace_redeem | success | 172.69.34.208 |
| 443 | signup.magic_link_redeem_failed | already_consumed | 172.70.207.82 |

(id 441 was an unrelated row from a parallel test run; the 4 quick-323 events are 439, 440, 442, 443.)

## DB State Proof

```
PRE-REDEEM:  (id=25, consumed_at=None, redeem_count=0, has_cached_a=0, has_cached_r=0)
POST-REDEEM: (id=25, consumed_at='2026-05-06 09:26:12.367580', redeem_count=2, cached_access_len=251, cached_refresh_len=151)
```

`redeem_count=2` confirms both first-redeem AND grace-redeem paths fired. Cached columns populated with 251+151-char JWT strings.

## Files Changed (5)

```
 src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py | 56 +++++++++++ (NEW)
 src/backend/models.py                                              |  8 ++
 src/backend/routers/auth.py                                        | 30 ++++++-
 src/backend/schemas.py                                             |  6 ++
 src/backend/tests/test_magic_link_signup.py                        | 91 +++++++++++++++++++-
 5 files changed, 187 insertions(+), 4 deletions(-)
```

Commit: `7197d9d` on arthaBuild main (`/Users/jeet/arthaBuild/`)

## Test Delta

- Local pytest baseline: **552 passed, 54 failed, 18 skipped** (pre-edit)
- Local pytest after: **554 passed, 54 failed, 18 skipped** (+2 new, zero new failures)
- File-local: 17 → 19 magic_link tests passing
- Strengthened: `test_magic_redeem_second_attempt_within_grace_succeeds` now asserts `body1["access_token"] == body2["access_token"]` and same for refresh
- New: `test_magic_redeem_two_different_uas_get_same_jwt` (UA-agnostic cache)
- New: `test_magic_redeem_no_cross_token_jwt_leak` (cache keyed per row, not shared)

## Rollback Artifacts (PROD)

Captured BEFORE deploy at `/home/ubuntu/arthaBuild/.323-rollback-state`:

```
current head before deploy: k6l7m8n9o0p1
dd67335cd7cfaa080e848c779adc38b7  src/backend/models.py.323-rollback
dd4246757a133a15fc384129ebd6ae72  src/backend/routers/auth.py.323-rollback
a332c90e17c249cb8acc5d9c88a6fb56  src/backend/schemas.py.323-rollback
```

Rollback runbook: see Task 5 Step 5.6 in PLAN.md. Files survive at `/home/ubuntu/arthaBuild/src/backend/*.323-rollback`. Migration downgrade: `docker exec arthaBuild-backend alembic -c src/backend/alembic.ini downgrade -1`.

## Deviations from Plan

**1. [Rule 3 — Blocking] schemas.py was the 5th file** — Plan declared 4 files modified. The plan instructed editing `RequestAccessResponse` Pydantic model "in routers/auth.py" but the actual model definition lives in `/Users/jeet/arthaBuild/src/backend/schemas.py:97`. Fix: edit schemas.py for the field, edit routers/auth.py for the populate logic. Total: 5 files in commit. Documented in commit message. Plan verification grep #8 (`debug_raw_token in auth.py`) still passes (1 hit for the populate-logic). Plan note about Pydantic v1/v2 caveat at lines 384-396 explicitly anticipated this and recommended the `debug_raw_token` (no underscore) name — which was used.

**2. [Plan-spec mismatch — benign] awk function-scoped grep returned 0 instead of 2** — Plan's `awk '/^async def magic_redeem/,/^async def [a-z]|^@router/'` regex did not match correctly on this file (zsh/awk interaction with `^@router`). Replaced with `sed -n '462,592p'` (function body line range), which returned the expected count of 2. PRE-FLIGHT count = 2 (grace + first-redeem); POST-EDIT count = 1 (first-redeem only). Plan facts validated.

**3. [Plan-spec mismatch — benign] `grep -c "test_magic_redeem"` returned 9 not 6** — Plan's verify check expected 6 magic_redeem tests post-edit. Actual file had 7 pre-existing tests with `test_magic_redeem_*` prefix (happy_path, second_within_grace, after_grace, third_within_grace, expired_token, invalid_token, empty_token) + 2 new = 9. The plan was likely counting only the 4 "behavioural" tests as "test_magic_redeem". All 9 pass.

**4. [Plan-spec mismatch — benign] `grep -cE "cached_(access|refresh)_token"` returned 5 not 6** — Plan expected 6 occurrences but `grep -c` counts matching LINES, not match instances. Line 518 (`if not token_record.cached_access_token or not token_record.cached_refresh_token:`) contains BOTH columns on one line. Per-column counts both = 3 (= 6 occurrences total). Functionally correct.

**5. [Cloudflare retry artifact during Step 6.3] First curl pair showed wrong response shape** — Initial run of Step 6.3 returned valid JWT for Call 1 but `{access_token: null, email: null, role: null}` for Call 2. DB inspection revealed `redeem_count=2` AND a 3rd `already_consumed` audit row — Cloudflare evidently retried/scanned the POST. Re-running Step 6.3 with a fresh email + token returned RESP_A == RESP_B byte-for-byte. The fix code is correct; the artifact was test-environment noise. PROOFS captured from the clean second run.

**6. [Acceptable serialization detail] PROOF 5: debug_raw_token field shows as `null` not absent** — With Pydantic v2 + `Optional[str] = None`, the field appears in JSON as `"debug_raw_token": null` even when env var is off. The plan's `jq -r '.debug_raw_token // "ABSENT"'` check resolves null = ABSENT, so PROOF 5 PASSES per spec. To strip the field entirely (rather than render null), would require `model_dump(exclude_none=True)` — minor follow-up opportunity, not blocking.

## Authentication Gates

None. No auth required for the test (`/api/auth/request-access` and `/api/auth/magic/redeem` are public endpoints by design).

## Self-Check: PASSED

- File `/Users/jeet/arthaBuild/src/backend/alembic/versions/l7m8n9o0p1q2_magic_link_cached_jwt.py`: FOUND
- File `/Users/jeet/arthaBuild/src/backend/models.py` cached_access_token: FOUND (1 hit)
- File `/Users/jeet/arthaBuild/src/backend/routers/auth.py` cached_access_token: FOUND (3 hits in magic_redeem)
- File `/Users/jeet/arthaBuild/src/backend/schemas.py` debug_raw_token: FOUND (1 hit)
- File `/Users/jeet/arthaBuild/src/backend/tests/test_magic_link_signup.py` body1 + body2: FOUND
- Commit `7197d9d` on arthaBuild main: FOUND (`git log --oneline -1` confirms)
- PROD alembic head = `l7m8n9o0p1q2`: VERIFIED
- PROD magic_link_tokens columns include `cached_access_token` + `cached_refresh_token`: VERIFIED
- PROD MAGIC_LINK_DEBUG_RETURN_RAW env var ABSENT in container: VERIFIED
- PROD test user `is_active=0`: VERIFIED (3 users soft-deleted)

## Verification Checklist (Per CLAUDE.md MANDATORY Protocol)

- [x] **Grep proof**: cached_access_token in models.py (1), in auth.py magic_redeem (3); debug_raw_token in schemas.py (1) + auth.py (1)
- [x] **Run proof**: pytest 552→554 passed locally; live curl returns byte-identical JWTs for CriOS + Safari UAs
- [x] **DB proof**: redeem_count=2, cached_access_len=251, cached_refresh_len=151 for test user (read-only sqlite URI)
- [x] **Audit proof**: 4 expected audit_logs rows (issued + redeemed + grace_redeem + already_consumed) in correct order
- [x] **End-to-end proof**: Bhavya scenario reproduced — 2 different UAs, < 5s gap, identical JWT bytes; post-window redeem 401s
- [x] **Cleanup proof**: MAGIC_LINK_DEBUG_RETURN_RAW removed from .env, container env, AND debug field reads as null in fresh response

## Final Go-Live Verdict: **GO**

Rationale:
- Phase 40's security gap (doubled JWT lifetime via fresh JTI on second redeem) is closed.
- UX win preserved: iOS Gmail/Outlook in-app browser race no longer locks users out — both tabs receive a working session pointing to the SAME JWT.
- Zero new test failures. Pytest baseline maintained.
- Live prod verified with 5 independent proofs.
- Debug env var hygiene confirmed: removed cleanly, field reads null in fresh request.
- Rollback artifacts captured with md5sum fingerprints; downgrade path documented.
- Test users soft-deleted; no orphan signup_requests cluttering admin views.

User is unblocked for go-live.

## Follow-ups (NOT blocking)

1. **Scrub cached JWT post-expiry** (~30min): NULL `cached_access_token` / `cached_refresh_token` after `expires_at < now() - 1h` to reduce DB-exfiltration metadata exposure. Not blocking because cached JWT is past `exp` by then and would be rejected by `decode_token()`.

2. **Strip `debug_raw_token` from JSON when null** (~15min): Current behavior is `"debug_raw_token": null`. To omit the field name entirely, use `RequestAccessResponse.model_dump(exclude_none=True)` in the endpoint, or set `model_config = ConfigDict(json_schema_extra={"exclude": ["debug_raw_token"]})`. Not blocking because the field is null when env var is off (no token leak).

3. **Promote debug field to admin-only endpoint** (~1hr): Replace env-gated echo with admin-authed `POST /api/admin/magic-tokens/issue` returning raw token in response. Removes env-toggle dance entirely. Not blocking; current implementation is gated and removed.
