---
phase: 292-deploy-option-a-versioned-consent-captur
plan: 01
subsystem: auth
tags: [consent, gdpr, soc2, signup, alembic, sqlite, docker-compose, nginx, fastapi, react]

# Dependency graph
requires:
  - phase: arthabuild-standalone-repo
    provides: Standalone repo at /Users/jeet/arthaBuild + EC2 docker-compose stack at 44.194.34.223
provides:
  - user_consents table (GDPR Art.7 / SOC 2 consent receipt trail) in prod SQLite
  - UserConsent ORM model + POST /api/user/register writes 3 consent rows (terms, privacy, scope_ack) with real IP + captured User-Agent
  - SignUp.tsx: 3-phase "How ArthaBuild works" card (Free → Enterprise → After training), "In plain English" summary, scope-ack checkbox
  - Backend image rebuilt (source baked in at build time) + frontend dist swapped atomically (inode-safe nginx restart)
affects: [arthabuild-google-oauth-signup, arthabuild-re-consent-on-version-bump, arthabuild-delete-account-flow, arthabuild-security-trust-center]

# Tech tracking
tech-stack:
  added: []  # No new deps — used existing FastAPI / SQLAlchemy / Alembic / React + TS
  patterns:
    - Versioned consent receipts (document_version string, not boolean) — enables re-consent prompts on ToS bump
    - request.client.host + request.headers['user-agent'] capture in register handler (512-char UA truncation)
    - Atomic dist swap: mv dist dist.bak.$TS && tar xzf && docker compose restart nginx (nginx bind-mount is inode-bound)

key-files:
  created:
    - /Users/jeet/arthaBuild/src/backend/alembic/versions/23a_user_consents.py (new migration, down_revision='g2h3i4j5k6l7')
  modified:
    - /Users/jeet/arthaBuild/src/backend/models.py (added class UserConsent)
    - /Users/jeet/arthaBuild/src/backend/schemas.py (RegisterRequest: terms_version, privacy_version, scope_ack_version)
    - /Users/jeet/arthaBuild/src/backend/routers/user.py (captures UA + IP, writes 3 UserConsent rows)
    - /Users/jeet/arthaBuild/src/frontend/src/pages/SignUp.tsx (3-phase card, plain-English summary, scope-ack checkbox)
    - /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts (RegisterPayload 3 optional fields)

key-decisions:
  - Single arthaBuild-repo commit 47d4a77 pushed to github.com/jeet-avatar/arthabuild main — scoped to exactly 6 Option A files (other unrelated repo modifications left uncommitted)
  - Smoke-test domain swap: @techcloudpro.com hit FREE_ACCOUNTS_PER_DOMAIN=3 cap → used fresh @optiona-smoke.com to exercise the register path
  - alembic upgrade head ran against the SAME /app/data/arthaBuild.db the live backend mounts — no snapshot/replay needed
  - Backend rebuild required (docker compose build backend) because source is baked into image at build time; plain restart would NOT pick up the new .py files
  - Nginx bind-mount is inode-bound → docker compose restart nginx is mandatory after `mv dist && untar` (permanent memory `feedback_arthaBuild_nginx_dist_inode.md`)

patterns-established:
  - "Consent receipts as first-class DB records: one row per consent_type per acceptance, versioned (not boolean), with IP + UA + server timestamp — supports GDPR Art.7 + SOC 2 proof-of-consent auditing + future re-consent-on-bump prompts"
  - "Atomic frontend dist swap: keep .bak.$TS directory for rollback; restart nginx (not reload) to force inode rebind"

requirements-completed:
  - OPTION-A-DEPLOY-01
  - OPTION-A-DEPLOY-02
  - OPTION-A-DEPLOY-03

# Metrics
duration: 3min
completed: 2026-04-20
---

# Quick Task 292: Deploy Option A Versioned Consent Capture Summary

**ArthaBuild prod (https://artha.build) now captures GDPR Art.7 / SOC 2 versioned consent receipts (terms, privacy, scope_ack) with real IP + User-Agent on every /api/user/register call, and the SignUp page now shows a 3-phase "How ArthaBuild works" card that reconciles the previous contradictory "NetSuite creds never leave browser" copy with the actual free-tier scope.**

## Performance

- **Duration:** ~3 min (code was already written + validated — pure deploy)
- **Started:** 2026-04-20T20:05:28Z
- **Completed:** 2026-04-20T20:08:35Z
- **Tasks:** 3 (scoped commit + push + build → scp + alembic → dist swap + E2E smoke)
- **Files modified:** 6 (in arthaBuild repo, committed)

## Accomplishments

- Single scoped commit `47d4a77` pushed to `github.com/jeet-avatar/arthabuild` main — exactly 6 Option A files (others in the repo left uncommitted per instruction)
- EC2 backend image rebuilt + container recreated; `alembic upgrade head` advanced from `g2h3i4j5k6l7` → `23a_user_consents (head)`
- `user_consents` table live in `/app/data/arthaBuild.db` with 7 columns (id, user_id FK→users.id, consent_type, document_version, accepted_at, ip_address, user_agent)
- New frontend bundle `index-Dfhk7SuD.js` served via nginx after inode-safe dist swap + restart; `dist.bak.1776715666` retained for rollback
- End-to-end smoke test: POST /api/user/register → 201 Created → 3 rows written to user_consents with real Cloudflare edge IP `162.158.187.83` + captured UA `OptionA-smoketest/1.0`
- No regressions: `/health` 200, `/` 200, no stack traces in backend logs

## Task Commits

1. **Task 1: Scoped git commit (6 files) + push + local frontend build** — `47d4a77` (feat) on arthaBuild repo
2. **Task 2: scp backend + docker build + alembic upgrade head** — remote-only (no arthaBuild repo commit; changes live as scp'd files + rebuilt image on EC2)
3. **Task 3: Ship dist + nginx restart + E2E smoke test** — remote-only (same — dist.bak.1776715666 retained)

_Note: arthaBuild repo has a single commit (`47d4a77`). Task 2 + Task 3 produce no additional repo commits — they deploy the already-pushed code. Per quick-task protocol, the dindin orchestrator commits the SUMMARY + STATE updates._

## Task 1 Output

**Commit pushed to github.com/jeet-avatar/arthabuild main:**

```
commit 47d4a776ddd095d6b115f01b1e4e41cd76f6bd0f
Author: jeet-avatar <jm@techcloudpro.com>
Date:   Mon Apr 20 13:05:36 2026 -0700

    feat(signup): capture versioned consent receipts + scope ack (Option A)

 src/backend/alembic/versions/23a_user_consents.py |  36 ++++
 src/backend/models.py                             |  14 ++
 src/backend/routers/user.py                       |  79 +++++++-
 src/backend/schemas.py                            |   3 +
 src/frontend/src/pages/SignUp.tsx                 | 217 ++++++++++++++++++----
 src/frontend/src/services/authService.ts          |   3 +
 6 files changed, 319 insertions(+), 33 deletions(-)
```

Push: `5949d84..47d4a77  main -> main` — exactly 6 files touched.

**Frontend build:** `✓ 3558 modules transformed.` → `dist/assets/index-Dfhk7SuD.js` (3,594 kB / 837 kB gzip) + sitemap (95 URLs).

## Task 2 Output

**docker compose build backend:** `Image arthabuild-backend Built` — container recreated, ollama healthy, backend Started.

**Alembic migration:**

```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade g2h3i4j5k6l7 -> 23a_user_consents, Add user_consents table for versioned ToS/Privacy/scope acknowledgment receipts.
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
23a_user_consents (head)
```

**user_consents schema (pulled via python sqlite3 — container has no sqlite3 binary):**

```sql
CREATE TABLE user_consents (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    consent_type VARCHAR NOT NULL,
    document_version VARCHAR NOT NULL,
    accepted_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    ip_address VARCHAR,
    user_agent VARCHAR,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
)
```

**UserConsent importable:**
```
$ docker exec arthaBuild-backend python -c "from models import UserConsent; print(UserConsent.__tablename__)"
user_consents
```

**Container health:** `arthaBuild-backend   Up 19 seconds (healthy)` · `/health` → 200 `{"status":"ok"}`.

## Task 3 Output

**Dist swap + nginx restart:**
```
=== backup old dist ===
backed up to dist.bak.1776715666
=== extract new dist ===
-rw-r--r-- 1 ubuntu ubuntu 3076 Apr 20 20:05 dist/index.html
=== nginx restart (inode-bound bind mount) ===
Container arthaBuild-nginx Restarting
Container arthaBuild-nginx Started
arthaBuild-nginx   Up 3 seconds
```

**Smoke test POST /api/user/register:**
```
$ curl -X POST https://artha.build/api/user/register \
  -H "Content-Type: application/json" \
  -H "User-Agent: OptionA-smoketest/1.0" \
  -d '{"first_name":"Test","last_name":"Consent","email":"consent-smoke-1776715684@optiona-smoke.com","password":"Consent123!","organization":"OptionA Smoke","terms_version":"2026-04-19","privacy_version":"2026-04-19","scope_ack_version":"2026-04-20"}'

{"message":"Registration successful. Please check your email to verify your account."}
HTTP_CODE:201
```

**3 consent rows written (SQLite SELECT — newest 3):**
```
(3, 15, 'scope_ack', '2026-04-20', '162.158.187.83', 'OptionA-smoketest/1.0')
(2, 15, 'privacy',   '2026-04-19', '162.158.187.83', 'OptionA-smoketest/1.0')
(1, 15, 'terms',     '2026-04-19', '162.158.187.83', 'OptionA-smoketest/1.0')
```

All 3 rows: user_id=15 (the just-created user), real Cloudflare edge IP `162.158.187.83` (NOT literal `"unknown"`), UA `OptionA-smoketest/1.0`, types = {terms, privacy, scope_ack}, versions = {2026-04-19, 2026-04-19, 2026-04-20}.

**New frontend copy served:**
```
Bundle served at: /assets/index-Dfhk7SuD.js (matches local build hash)

How ArthaBuild works: 1 occurrence
In plain English: 1 occurrence
free tier answers NetSuite: 1 occurrence
```

All 3 new strings present in the bundled JS — proving nginx picked up the new dist inode.

## Files Created/Modified

### In arthaBuild repo (committed in `47d4a77`)

- `src/backend/alembic/versions/23a_user_consents.py` — New migration, `revision='23a_user_consents'`, `down_revision='g2h3i4j5k6l7'`, creates user_consents table + `ix_user_consents_user_id` index
- `src/backend/models.py` — Appended `class UserConsent(Base)` with FK→users.id, indexed consent_type/document_version, server_default accepted_at, 512-char UA column
- `src/backend/schemas.py` — `RegisterRequest` gained 3 optional fields (terms_version, privacy_version, scope_ack_version)
- `src/backend/routers/user.py` — Imports UserConsent; register() captures request.client.host + UA, inserts 3 consent rows post-user-commit, default versions `"2026-04-19"` / `"2026-04-20"` if client omits
- `src/frontend/src/pages/SignUp.tsx` — Constants TERMS/PRIVACY/SCOPE_ACK_VERSION, form.acceptScope boolean, validate() rejects without scope-ack, handleSubmit forwards versions, new "How ArthaBuild works" 3-phase card replaces old contradictory Enterprise security panel, "In plain English" summary block, second checkbox for scope acknowledgment
- `src/frontend/src/services/authService.ts` — `RegisterPayload` gained 3 optional fields (runtime unchanged — JSON.stringify forwards them)

### On EC2 (deployed, not in repo)

- `/home/ubuntu/arthaBuild/src/backend/{models.py, schemas.py, routers/user.py, alembic/versions/23a_user_consents.py}` — scp'd + baked into `arthabuild-backend:latest` image
- `/home/ubuntu/arthaBuild/src/frontend/dist/` — new bundle `index-Dfhk7SuD.js` + `index-CcTsr0tw.css`
- `/home/ubuntu/arthaBuild/src/frontend/dist.bak.1776715666/` — **RETAINED for rollback** (previous bundle)

## Decisions Made

- **Scoped commit over blanket:** Repo had 14 modified/untracked files, only 6 are Option A. Staged paths individually (not `git add -A`) so the handoff's 6-file commit was clean.
- **Fresh domain for smoke test:** `@techcloudpro.com` returned 400 "free account limit (3 accounts per domain)" — swapped to `@optiona-smoke.com` to complete the E2E proof. Plan explicitly warned about this cap.
- **python sqlite3 over sqlite3 CLI:** The backend container doesn't have a `sqlite3` binary. Used `docker exec ... python -c "import sqlite3; ..."` — same DB, same query, standard library in the image.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Smoke test domain swap (`@techcloudpro.com` → `@optiona-smoke.com`)**
- **Found during:** Task 3 Step 3c (first smoke-test attempt)
- **Issue:** `POST /api/user/register` with `consent-smoke-${TIMESTAMP}@techcloudpro.com` returned HTTP 400 `{"detail":"Your company has reached the free account limit (3 accounts per domain). Contact sales@artha.build to add more seats."}`. The plan itself warns: "EXEMPT_DOMAINS=artha.build + FREE_ACCOUNTS_PER_DOMAIN=3 → use a fresh domain per smoke test to avoid hitting the cap" — techcloudpro.com was already at cap.
- **Fix:** Used a fresh domain `@optiona-smoke.com` (not in EXEMPT_DOMAINS, no prior accounts). Single curl retry.
- **Files modified:** None — test-payload-only change.
- **Verification:** 201 Created + 3 consent rows written. Proves the register + consent-capture path works; domain-cap enforcement is an intentional backend guard, not a bug.
- **Committed in:** N/A (runtime test, not code)

**2. [Rule 3 - Blocking] sqlite3 CLI missing in container → use python sqlite3**
- **Found during:** Task 2 verify + Task 3 Step 3d
- **Issue:** `docker exec arthaBuild-backend sqlite3 ...` failed with `exec: "sqlite3": executable file not found in $PATH`. The image isn't shipped with the sqlite3 client binary.
- **Fix:** Swapped to `docker exec arthaBuild-backend python -c "import sqlite3; c=sqlite3.connect('/app/data/arthaBuild.db'); ..."` — python's stdlib sqlite3 module reads the same DB file.
- **Files modified:** None — verify-command-only change.
- **Verification:** Returned full CREATE TABLE DDL + 3 consent rows with all expected columns.
- **Committed in:** N/A (runtime test, not code)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking verify commands)
**Impact on plan:** Zero — both are pure test-harness adjustments. The deployed code + database migrations are unchanged from the plan. No scope creep.

## Issues Encountered

- **Backend `/api/health` returns 404 (not a regression):** Plan verify step `curl https://artha.build/api/health` returned 404, but `/health` returns 200. Backend logs confirm this path layout pre-exists — the frontend and nginx already hit `/health`, not `/api/health`. Used `/health` for the real health check.
- **bcrypt `__about__` AttributeError in logs (non-fatal, pre-existing):** `passlib/handlers/bcrypt.py:620` emits a trapped warning `AttributeError: module 'bcrypt' has no attribute '__about__'` due to bcrypt ≥4.1 removing the `__about__` attr passlib still probes. Trapped, non-fatal — the 201 Created immediately follows. Pre-existing issue, not introduced by this deploy.

## User Setup Required

None — backend image already had SMTP/JWT env vars + EC2 nginx config was unchanged. Verification email sends automatically via existing Gmail SMTP.

## Open Items (deferred to follow-up tasks)

- **Google OAuth signup path does NOT capture consents** — only `/api/user/register` writes to `user_consents`. The OAuth callback in `routers/auth.py` bypasses the scope-ack checkbox entirely. Needs a parallel consent write (default to current versions since OAuth users click through a Google-hosted consent that points at our ToS/Privacy).
- **Delete account flow (`/account` settings)** — plain-English summary on SignUp promises "you can delete your account anytime", but the UI may not yet have this button. Verify `/account` has a delete flow; if not, build one.
- **`/security` trust center content** — page exists (HTTP 200) but should list SOC 2 status, subprocessors, DPA link, pen-test state.
- **Re-consent prompt on version bump** — when `TERMS_VERSION` or `PRIVACY_VERSION` is incremented in code, prompt logged-in users to re-accept on next login. Schema ready (we store document_version as string, not boolean) — needs a comparison check on login + a modal.

## Next Phase Readiness

- Phase 21 (MixMind) work can resume unblocked — this quick task is orthogonal.
- ArthaBuild trust/security follow-ups (listed above) are now the natural next batch if we want to close the OAuth consent gap before a wider launch push.

## Self-Check: PASSED

Verification of claims made in this summary:

- Commit `47d4a77` exists on origin/main: FOUND (`git log --oneline | grep 47d4a77` → `47d4a776 feat(signup): capture versioned consent receipts...`)
- 6 files in HEAD commit: FOUND (count = 6 matches for models.py/schemas.py/user.py/23a_user_consents.py/SignUp.tsx/authService.ts)
- `/Users/jeet/arthaBuild/src/frontend/dist/index.html`: FOUND (3076 bytes)
- `/Users/jeet/arthaBuild/src/frontend/dist/assets/index-Dfhk7SuD.js`: FOUND (local build, identical hash as served bundle)
- EC2 `user_consents` table exists: FOUND (CREATE TABLE DDL returned, 7 columns)
- EC2 `alembic current` = `23a_user_consents (head)`: FOUND
- EC2 `arthaBuild-backend` container Up + healthy: FOUND
- 3 consent rows for user_id=15: FOUND (terms/privacy/scope_ack with real IP `162.158.187.83`, UA `OptionA-smoketest/1.0`)
- Bundled JS contains all 3 new strings: FOUND (1 occurrence each of "How ArthaBuild works", "In plain English", "free tier answers NetSuite")
- `dist.bak.1776715666/` retained on EC2: IMPLIED by successful Task 3 output (`backed up to dist.bak.1776715666`)
- `/health` returns 200: FOUND
- `/` returns 200: FOUND

No failed checks.

---

*Quick Task: 292-deploy-option-a-versioned-consent-captur*
*Completed: 2026-04-20*
