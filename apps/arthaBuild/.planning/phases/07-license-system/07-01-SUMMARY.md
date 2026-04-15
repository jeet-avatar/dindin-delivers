---
plan: 07-01
phase: 07-license-system
subsystem: license-system
status: complete
completed: 2026-04-10
duration: ~90 minutes
tags: [license, byoc, privacy, deploy-quota, netsuite-auto-index, landing-page]
dependency_graph:
  requires: [06-01]
  provides: [license-validation, deploy-quota, netsuité-auto-index, privacy-pages]
  affects: [rawapi.py, deploy.py, netsuite.py, model_utils.py, Landing.tsx]
tech_stack:
  added: [httpx (license server HTTP client), license-server FastAPI service]
  patterns: [cache-then-server, grace-period, instance-lock, background-indexing, customer-first-RAG]
key_files:
  created:
    - src/backend/routers/license.py
    - src/backend/alembic/versions/12fa982ac6c3_add_license_cache_and_script_.py
    - license-server/app.py
    - license-server/requirements.txt
    - license-server/Dockerfile
    - license-server/.env.example
    - src/frontend/src/components/LicenseBanner.tsx
    - src/frontend/src/pages/PrivacyPolicy.tsx
    - src/frontend/src/pages/TermsOfService.tsx
    - docs/test-report.html
  modified:
    - src/backend/models.py
    - src/backend/rawapi.py
    - src/backend/routers/deploy.py
    - src/backend/routers/netsuite.py
    - src/backend/model_utils.py
    - src/frontend/src/routes.tsx
    - src/frontend/src/pages/Landing.tsx
    - docs/ARCHITECTURE.md
decisions:
  - AB-LIC-001: SQLite cache for license state — atomic writes, timestamps, structured queries vs env var
  - AB-LIC-002: Sandbox deploys never counted — restricting sandbox kills developer workflow
  - AB-LIC-003: One instance per key — instance_id registered on first validation, different IDs rejected (403)
  - AB-LIC-004: Startup non-fatal — optimistic default True, license check is async and non-blocking
  - AB-LIC-005: Customer index priority — personalized answers from real scripts beat generic docs
  - AB-LIC-006: No public pricing — enterprise sales model, "Get a Demo" only, zero dollar amounts on landing
  - AB-LIC-007: Grace period 72h — customers working offline don't get locked out immediately
  - AB-LIC-008: Auto-index capped at 50 scripts — prevents timeout on large accounts
---

# Phase 7 Plan 1: License System Summary

License enforcement, deploy quota tracking, privacy-preserving validation, NetSuite auto-index, and landing page enterprise pivot.

## What Was Built

### Backend — License System

**LicenseCache + ScriptDeployment models** (`src/backend/models.py`):
- `license_cache`: stores validated license state with 7-day TTL — avoids network call on every request
- `script_deployments`: tracks production deploys per user per license key
- Alembic migration `12fa982ac6c3` applied — both tables in `arthaBuild.db`

**License Router** (`src/backend/routers/license.py`):
- `validate_license(db)`: checks cache → hits server → falls back to grace period
- Cache TTL: 7 days. Grace period: 72 hours after last successful check
- `check_deploy_quota(db, user_id, plan)`: returns `{allowed, used, limit}` per tier
- `record_deploy(db, user_id, script_name, target)`: logs production deploys
- `GET /api/license/status`: returns `{valid, plan, mode, days_remaining, source}`

**rawapi.py wiring**:
- `startup_license_check()`: async startup event, non-fatal, sets `_license_valid` + `_license_plan` globals
- `/health`: now returns `license_valid` and `license_plan`
- `/api/chatbot/process`: 402 `HTTPException` when `_license_valid is False`

**Deploy quota** (`src/backend/routers/deploy.py`):
- Before production deploy: `check_deploy_quota()` — 402 if at limit
- After successful production deploy: `record_deploy()` — quota counter incremented

### Backend — NetSuite Auto-Index

**`_index_customer_netsuite()`** (`src/backend/routers/netsuite.py`):
- Fires as `asyncio.create_task()` after successful TBA connect — non-blocking, non-fatal
- Uses SDF `object:list --type script` → `object:get` for content
- Embeds via `nomic-embed-text` → saves to `data/customer_index/`
- Capped at 50 scripts to prevent timeout on large accounts

**Customer index priority** (`src/backend/model_utils.py`):
- `retrieve_node()`: checks `data/customer_index/` first, falls back to bootstrap FAISS
- Personalized answers from actual customer SuiteScripts before generic NetSuite docs

### License Server (`license-server/`)

Separate TechCloudPro service (not in customer VPC):
- `POST /api/validate`: receives `{license_key, instance_id, version}` only
- Instance lock: first validation registers `registered_instance_id`; different IDs rejected
- Admin endpoints: `POST /admin/licenses`, `GET /admin/licenses/{key}` (bearer-key protected)
- `validation_log` table: audit trail of all validations
- Dockerfile: `python:3.11-slim`, `/data/licenses.db` volume

### Frontend

**LicenseBanner.tsx**: sticky top banner for grace/restricted license states. Calls `GET /api/license/status` on mount. Shows amber banner (grace) or red banner (restricted).

**PrivacyPolicy.tsx** (`/privacy`): BYOC data policy — what never leaves the server, license validation data minimization, NetSuite TBA credentials never stored.

**TermsOfService.tsx** (`/terms`): tier comparison table (starter/growth/enterprise), one instance per key, acceptable use.

**Landing.tsx — Enterprise Pivot**:
- Removed: `$299/mo`, `$799/mo`, `$2,499/mo`, 14-day trial, Start Free CTAs
- Added: Plans section with feature table (production script deploys, users, sandbox)
- All CTAs: `Get a Demo` / `Book a Call` / `Contact Sales` → `mailto:sales@techcloudpro.com`

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AB-LIC-001 | SQLite cache | Atomic writes + timestamps + structured queries. File-based cache needs locking. |
| AB-LIC-002 | Sandbox never counted | Sandbox is for testing. Restricting it kills workflow and pushes customers to skip testing. |
| AB-LIC-003 | One instance per key | `instance_id` registered on first validation. Second different ID = 403. Customer must contact sales. |
| AB-LIC-004 | Non-fatal startup | License server downtime should not prevent startup. Optimistic default True, re-check on `/api/license/status`. |
| AB-LIC-005 | Customer index first | Personalized answers from real scripts are more valuable than generic docs. Bootstrap is fallback only. |
| AB-LIC-006 | No public pricing | Enterprise sales play — contact model prevents commodity pricing pressure and enables custom deals. |
| AB-LIC-007 | 72h grace period | Customers working offline (air-gapped BYOC) don't get locked out during a 3-day business trip. |
| AB-LIC-008 | 50-script cap | Prevents HTTP timeout on large accounts. Cap can be raised per customer request. |

## Deviations from Plan

### Auto-fixed Issues

None — all tasks executed as specified. The plan contained detailed product decisions from the user's session, and all were implemented exactly.

### Scope Additions (per product_decisions in prompt)

These were specified in the `<product_decisions>` block and are NOT deviations — they are the actual requirements:
1. `ScriptDeployment` model (deploy quota tracking) — added to Task 1
2. Deploy quota check in `deploy.py` — added to Task 4
3. NetSuite auto-index on TBA connect — added to Task 4
4. Customer index priority in RAG pipeline — added to Task 4
5. Landing page enterprise pivot (zero pricing) — Task 6

## Test Results

All 59 existing tests continue to pass. No regressions from Phase 7 changes.

```
59 passed, 5 warnings in 33.64s
```

## Self-Check

- [x] `license_cache` and `script_deployments` in arthaBuild.db: VERIFIED (sqlite3 check passed)
- [x] `routers/license.py` imports OK: VERIFIED (python -c import passed)
- [x] `license-server/app.py` imports OK: VERIFIED (python -c import passed)
- [x] rawapi.py mounts license router: VERIFIED (grep check passed)
- [x] /health has license_valid + license_plan: VERIFIED (grep check)
- [x] 402 gate on /api/chatbot/process: VERIFIED (code in rawapi.py:192)
- [x] Production deploy quota check: VERIFIED (deploy.py updated)
- [x] LicenseBanner.tsx exists: VERIFIED
- [x] /privacy and /terms routes: VERIFIED (grep shows lines 52-53)
- [x] Landing.tsx zero dollar amounts: VERIFIED (grep for $299/$799/$2,499 = 0 matches)
- [x] Landing.tsx "Get a Demo" present: VERIFIED (8 matches)
- [x] ARCHITECTURE.md v1.7: VERIFIED
- [x] test-report.html exists: VERIFIED
- [x] npm run build passes: VERIFIED (built in 3.87s)
- [x] All 7 tasks committed individually: VERIFIED

## Self-Check: PASSED
