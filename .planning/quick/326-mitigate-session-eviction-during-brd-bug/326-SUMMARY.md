---
phase: quick-326
plan: 01
subsystem: arthaBuild-auth
tags: [mitigation, session-idle, frontend-copy, prod-deploy]
key-files:
  modified:
    - /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx
    - /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx
    - /home/ubuntu/arthaBuild/.env  # PROD ONLY (gitignored)
decisions:
  - "MITIGATION not root-cause: bump SESSION_IDLE_MINUTES 30->480 + add sibling card; defer refresh-token-flow wiring to next quick task tomorrow"
  - "Use backdated-iat behavioral test (NOT password-login curl) — schemas.py uses 'username' field and admin may have MFA; backdated-iat directly proves middleware threshold"
  - "rsync in-place (NOT mv && tar) for frontend deploy + mandatory docker restart arthaBuild-nginx (per inode-bound bind-mount memory)"
metrics:
  duration_sec: 215
  completed: "2026-05-07T06:32:02Z"
  tasks_completed: 5
  files_modified: 2  # repo files only (frontend); .env on prod is gitignored
  tests_added: 1
---

# Quick-326: Session-Eviction Mitigation — LIVE (MITIGATION, not root-cause fix)

**One-liner:** Bumped prod `SESSION_IDLE_MINUTES` from default 30 → 480 minutes and added a sibling "Returning user?" help card above the existing "First time here?" card on `/auth`, so live-launch BRD users don't lose work mid-task to idle eviction. **This is MITIGATION**; the proper fix (frontend refresh-token wiring) is filed as a follow-up.

## Verification Proofs (all 9 acceptance gates)

### 1. Token survives 8h idle window — middleware updated
- `docker exec arthaBuild-backend printenv SESSION_IDLE_MINUTES` → `480` ✅
- Note: `IdleTimeoutMiddleware` info log only emits to a logger that doesn't surface in container stdout in this prod config; **behavioral proof below is load-bearing.**

### 2. Returning-user card renders above first-time card
- Local + prod bundle: `index-DXadPvq4.js`
- `curl -A 'Mozilla/5.0...' https://artha.build/assets/index-DXadPvq4.js | grep -c "Returning user"` → `1` ✅
- DOM-order vitest assertion (`TC-FE-Q326-01`) passes — sibling card precedes first-time card

### 3. Existing card preserved (no regression)
- `curl ... | grep -c "First time here"` → `1` ✅
- 3 pre-existing it() blocks in `loginEducationCard.test.tsx` still green

### 4. Vitest baseline holds — `140 passed | 2 failed`
```
 Test Files  1 failed | 21 passed (22)
      Tests  2 failed | 140 passed (142)
```
- 1 net new passing test (139 → 140) ✅
- 2 pre-existing `authService.test.ts` failures preserved (NOT in scope — not introduced by 326)

### 5. Pytest baseline (env-only change, no source modification)
- pytest is not installed in the prod container (production image, no test deps).
- The change is a single env var — **no Python code modified** — so backend behavior is verified by:
  - **Positive behavioral test** (Gate 1.1 below): 35-min-old token → HTTP 200
  - **Negative control** (Gate 1.2 below): 9-hour-old token → HTTP 401
- Local pytest baseline (per quick-322 memory): `554 passed`. Will hold by construction (no `.py` files touched).

### 6. Prod env propagated to running process
- `docker exec arthaBuild-backend printenv SESSION_IDLE_MINUTES` → `480` ✅
- Backend force-recreated 06:30:14 UTC; container reports `Up About a minute (healthy)`

### 7. Five quick-324 dirty backend files preserved (UNTOUCHED)
- `git status --short | grep "src/backend/brd/" | wc -l` → `5` ✅
- Files preserved: `pipeline.py`, `renderers.py`, `runtime.py`, `schemas.py`, `status_verbs.yaml`

### 8. Atomic commit — exactly 2 files
- Commit `1cae2f1` on `arthabuild/main`:
  ```
  src/frontend/src/pages/Auth.tsx                   | 16 ++++++++++++++++
  src/frontend/src/test/loginEducationCard.test.tsx | 17 +++++++++++++++++
  2 files changed, 33 insertions(+)
  ```
- Pushed to `origin/main`: `b874c63..1cae2f1` ✅

### 9. Rollback feasible (<5 min ETA)
- Snapshot file: `.planning/quick/326-mitigate-session-eviction-during-brd-bug/326-rollback-snapshot.txt`
- Pre-deploy `SESSION_IDLE_MINUTES` value: **UNSET** (defaulted to 30 in code)
- Frontend dist tarball: `/tmp/dist.326-rollback.tar.gz` on prod (1.3 MB, mtime 06:28 UTC)

### 1.1. Behavioral PROOF — positive gate (load-bearing)
Backdated JWT minted inside container using runtime `JWT_SECRET_KEY`:
- `iat = now - 2100` (35 minutes old)
- `sub=14` (jm@techcloudpro.com, is_active=1, confirmed via read-only sqlite probe)

```
HTTP: 200 (expect 200)
{"drafts":[{"id":"348c8f45-69b6-4f76-bca2-9bd21036c303","owner_user_id":14,...}],"total":1}
```
**PASS:** A 35-minute-old token returned **HTTP 200**. Under the old 30-min limit this would have been **401**. This is direct behavioral proof the bumped threshold is live at request time.

### 1.2. Behavioral PROOF — negative control
- `iat = now - 32400` (9 hours old)
```
Negative-control HTTP: 401 (expect 401)
{"detail":"Session expired"}
```
**PASS:** A 9-hour-old token still returns **401**. Middleware still functions; idle eviction was not accidentally disabled.

## Bundle Hash Before/After

| When | Bundle Hash | Source |
|------|-------------|--------|
| Pre-deploy | (snapshot in tarball) | `/tmp/dist.326-rollback.tar.gz` on prod |
| Post-deploy local | `index-DXadPvq4.js` | `/Users/jeet/arthaBuild/src/frontend/dist/index.html` |
| Post-deploy prod | `index-DXadPvq4.js` | `curl -A Mozilla https://artha.build/auth` |

Local == Prod hash → rsync + `docker restart arthaBuild-nginx` succeeded (no inode-bound stale-mount).

## What Changed

### A) Backend env (prod-only, gitignored)
- File: `/home/ubuntu/arthaBuild/.env`
- Change: appended `SESSION_IDLE_MINUTES=480` (was unset → defaulted to 30)
- Effect: `IdleTimeoutMiddleware.__init__` reads env at process start (`idle_timeout.py:67`); container force-recreated to pick up new value.

### B) Frontend copy
- File: `/Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx` (+16 lines)
- Inserted a NEW sibling `<div>` IMMEDIATELY before the existing Phase 43 "First time here?" card. The existing card is **unchanged** (lines 79-103 → now 95-119 after insertion).
- New copy: *"**Returning user?** Sign in below — your session may have expired during a long task. Your account and any saved BRDs are unchanged."*
- Visual style: neutral slate palette (vs existing card's indigo) so the two siblings are visually distinct — returning-user is subdued/muted, first-time stays inviting/highlighted.
- Positioning-compliant per `feedback_arthaBuild_positioning.md`: no "Try free", no "Start trial", no pricing language.

### C) Frontend test
- File: `/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx` (+17 lines)
- Added 4th `it()` block: `TC-FE-Q326-01` — asserts both copies render AND DOM order (returning before first-time).

## What Did NOT Change

- **24h JWT `exp`** (hardcoded in `auth_utils.py:76`) — unchanged. Was NOT the bug.
- **Refresh-token endpoint or wiring** — unchanged. Backend already issues refresh_token (`auth.py:153,590,753`) but frontend still discards it. **THIS IS THE ROOT CAUSE**, deferred.
- **Quick-324's 5 dirty backend files** (`brd/pipeline.py`, `renderers.py`, `runtime.py`, `schemas.py`, `status_verbs.yaml`) — preserved exactly, still `M ` unstaged.
- **Backend Python source** — zero `.py` files modified.

## MITIGATION Disclaimer (explicit)

This task is **MITIGATION**, not a root-cause fix. Three reasons it is mitigation, not solution:

1. **It widens the idle window from 30 minutes to 8 hours** instead of fixing the actual bug (frontend never calls `/api/auth/refresh` on 401).
2. **The frontend copy is reactive comfort**, not a flow fix. Users still get redirected to `/auth` after their idle window expires — the card just makes that redirect less confusing.
3. **It is meant to last <24 hours**: the proper refresh-token-flow fix is the next quick task and lands tomorrow. After it ships, `SESSION_IDLE_MINUTES` reverts to 30-60 min.

## Security Tradeoff (explicit)

Bumping `SESSION_IDLE_MINUTES` from 30 → 480 means a stolen access JWT can replay for up to **8 hours** instead of **30 minutes**. Access-token theft is already protected by:
- HTTPS-only transport
- Memory-only client storage (per arthaBuild CLAUDE.md frozen interface)
- 24-hour hardcoded `exp` (PyJWT-enforced)

The widened idle-replay window is **acceptable for live launch** because Rajesh's UAT-data-loss risk is the larger live-launch hazard. The tradeoff goes back to baseline when the refresh-token-flow follow-up ships tomorrow and we revert SESSION_IDLE_MINUTES to 30-60 min.

## Follow-Up: Proper Root-Cause Fix (next quick task tomorrow)

See `<follow_ups>` section in `326-PLAN.md`. Estimate 1-2h. Steps:

1. Frontend stores `refresh_token` from login response (currently discarded by `authService.ts`).
2. Frontend `api.ts` interceptor on 401 with `detail: "Session expired"` or `detail: "Token expired"` → POST `/api/auth/refresh` BEFORE wiping auth state.
3. On refresh success → retry original request transparently. On refresh failure → clear auth + redirect to `/auth`.
4. Storage: memory-only (frozen interface per CLAUDE.md).
5. Once shipped, **revert** `SESSION_IDLE_MINUTES` to 30-60 minutes — refresh flow makes the long idle window unnecessary, security tradeoff goes back to baseline.

**Filing destination:** `.planning/quick/<next-id>-wire-frontend-refresh-token-flow/`

## Rollback Commands (<5 min ETA)

**Backend rollback:**
```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild && sed -i '/^SESSION_IDLE_MINUTES=/d' .env && \
   docker compose up -d --force-recreate backend"
```

**Frontend rollback:**
```bash
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild/src/frontend && rm -rf dist && \
   tar xzf /tmp/dist.326-rollback.tar.gz && docker restart arthaBuild-nginx"
```

## Deviations from Plan

**None.** All 5 tasks executed exactly as written. One pre-emptive note flagged in plan was hit:

- **Cloudflare WAF on default curl UA** — first behavioral curl returned `403 Just a moment...` (Cloudflare challenge) on the default curl user-agent. Retried with browser UA per `feedback_brandmonkz_403_is_waf_not_outage.md` pattern. Behavioral test then passed. **Not a deviation — a known WAF pattern.**

## Self-Check: PASSED

- File `/Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx`: FOUND, 1 hit "Returning user?"
- File `/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx`: FOUND, 2 hits "Returning user"
- File `/home/ubuntu/arthaBuild/.env`: FOUND on prod, contains `SESSION_IDLE_MINUTES=480`
- Commit `1cae2f1`: FOUND on `origin/main`, 2 files, 33 insertions
- Snapshot file `326-rollback-snapshot.txt`: FOUND
- 5 quick-324 dirty files: PRESERVED (count == 5)
- Bundle hash local==prod: MATCH (`index-DXadPvq4.js`)
- Behavioral positive: HTTP 200 on 35-min-old token
- Behavioral negative: HTTP 401 on 9h-old token
- Container `arthaBuild-backend`: healthy
- Container `arthaBuild-nginx`: restarted, healthy
