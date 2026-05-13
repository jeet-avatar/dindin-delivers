---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 01
subsystem: turion-satellite-backend
tags: [lookup-endpoints, zero-hardcode, turion-satellite]
requires: []
provides:
  - "GET /api/lookups/satellite-statuses (canonical satellite-status enum as {code,label,sequence_order})"
  - "Confirmed satellite backend lookup-complete for every DB-derivable list the satellite frontend renders"
affects:
  - "/Users/jeet/turion-satellite/backend (new lookups router + shared SATELLITE_STATUSES enum)"
tech-stack:
  added: []
  patterns: ["lookups.ts router holds the canonical enum; PATCH validator imports it (single source of truth)"]
key-files:
  created:
    - /Users/jeet/turion-satellite/backend/src/routes/lookups.ts
    - /Users/jeet/turion-satellite/backend/tests/lookups.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/app.ts
    - /Users/jeet/turion-satellite/backend/src/routes/satellites.ts
decisions:
  - "Added GET /api/lookups/satellite-statuses — sat.html hardcoded SAT_STATUSES (mirroring a backend const with no GET endpoint); now the enum has a single source of truth and a read API. PROGRAM_STAGES maps to the already-existing /api/lifecycle-stages — no new endpoint needed there (36-03's job)."
  - "Did NOT add endpoints for domain constants: make/buy 2-value enum, the 3D part-family→geometry map (satellite-3d.js), 3d-test.html sample dims — left in place."
metrics:
  duration: ~25min
  completed: 2026-05-12
---

# Phase 36 Plan 01: Satellite Backend Lookup-Completeness Summary

Confirmed the turion-satellite backend is lookup-complete for every DB-derivable list the satellite frontend renders, and closed the one genuine gap by adding `GET /api/lookups/satellite-statuses` (the satellite-status enum, previously hardcoded in `sat.html` and mirrored as a private const in `satellites.ts` with no read endpoint). `PROGRAM_STAGES` maps to the already-existing `/api/lifecycle-stages` (returns `{id,code,label,icon,sequence_order,color_hex,created_at}` — confirmed by reading the route handler).

## Satellite Frontend List → Backend Inventory

| Frontend list (file:line) | Kind | Verdict |
| --- | --- | --- |
| `satellite-render.js:135` `PROGRAM_STAGES` (6 lifecycle stages) | DB-derivable (`lifecycle_stages` table) | Served by existing `GET /api/lifecycle-stages` — 36-03 points the frontend at it. No new endpoint. |
| `sat.html:180` `SAT_STATUSES = ['design','build','test','ship','launch','orbit']` | Domain enum, mirrored in `satellites.ts` const, **no GET endpoint** | **GAP — fixed.** Added `GET /api/lookups/satellite-statuses`; `satellites.ts` PATCH validator now imports `SATELLITE_STATUSES` from `lookups.ts`. |
| `kanban.html`/`parts.html`/`bom.html`/`part.html`/`sat.html` subsystem `<select>` | DB-derivable (`subsystems` table) | Served by existing `GET /api/subsystems`. |
| `part.html`/`bom.html`/`work-orders.html` vendor `<select>` | DB-derivable (`vendors` table) | Served by existing `GET /api/vendors`. |
| `bom.html`/`part.html` make/buy `<select>` (2 values) | Domain constant | Leave inline — 2-value enum, not DB-derived. |
| `cost.html` "All satellites" + per-sat `<option>` | DB-derivable (satellites list) | Served by existing `GET /api/satellites`. |
| `satellite-3d.js` part-family → geometry/palette map | Domain constant (rendering config, not data) | Leave. |
| `3d-test.html` sample dims | Dev harness | Leave (consider excluding from deploy — out of scope). |
| labor-rates / fx-rates lists | DB-derivable | Served by existing `GET /api/labor-rates`, `GET /api/fx-rates`. |

**Existing satellite lookup/list routes (from `src/app.ts`):** `health`, `files/presign`, `satellites`, `parts`, `subsystems`, `lifecycle-stages`, `vendors`, `work-orders` (+`/steps`), `labor-rates`, `fx-rates`, `make-costs`, `buy-costs`, `make-buy-decisions`, `analytics/cost-rollup`, `integration`, `sales-orders`, `assistant`, **+ new `lookups`**.

## New Endpoints Added

- `GET /api/lookups/satellite-statuses` — `requireAuth`, hardened catch (no `err.message` leak), returns `[{code, label, sequence_order}]` in advance order. Canonical `SATELLITE_STATUSES` exported from `lookups.ts`; `satellites.ts` PATCH `/api/satellites/:id` validator imports it (single source of truth — drift impossible).

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 407 passed | 1 skipped (46 files); new `tests/lookups.test.ts` (4 tests: shape, 401-unauth, no-detail-leak, enum-drift via PATCH validator).
- `node scripts/audit-satellite-buttons.mjs` — routes 75, violations 0 (new route allowlisted automatically from `app.ts`).
- Commit `404a968` in `/Users/jeet/turion-satellite` — author `jeet-avatar <jm@techcloudpro.com>`. **Not pushed** (plan 36-09 owns the push + `build-and-push.sh` Lambda redeploy).

## Deviations from Plan

**1. [Rule 2 - missing critical functionality] Added `/api/lookups/satellite-statuses` instead of "no new endpoint needed"**
- **Found during:** Task 1 inventory grep of `turion-space-demo/satellite/*.html`.
- **Issue:** RESEARCH flagged only `PROGRAM_STAGES`; the grep surfaced a second frontend hardcode — `SAT_STATUSES` in `sat.html:180` — mirroring a private const in `satellites.ts` with no GET endpoint. To honor the PERMANENT "Turion frontend zero-hardcoding" rule, this list needs an API.
- **Fix:** New `lookups.ts` router + `app.use('/api/lookups', lookupsRouter)`; refactored `satellites.ts` to import the shared `SATELLITE_STATUSES`; added `tests/lookups.test.ts`.
- **Files modified:** `backend/src/routes/lookups.ts` (new), `backend/src/app.ts`, `backend/src/routes/satellites.ts`, `backend/tests/lookups.test.ts` (new).
- **Commit:** `404a968`.

(36-04/36-03 follow-up: wire `sat.html` to fetch `/api/lookups/satellite-statuses` and `programProgress()` to fetch `/api/lifecycle-stages` — that's the frontend de-hardcode plan's job, not this one.)

## Self-Check: PASSED

- `backend/src/routes/lookups.ts` — FOUND
- `backend/tests/lookups.test.ts` — FOUND
- commit `404a968` — FOUND in `/Users/jeet/turion-satellite` git log
