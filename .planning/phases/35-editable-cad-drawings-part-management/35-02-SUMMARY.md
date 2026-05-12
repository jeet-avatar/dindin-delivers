---
phase: 35-editable-cad-drawings-part-management
plan: 02
subsystem: turion-satellite (backend routes)
tags: [cad, parts-crud, drawing-mutation, api]
requires: [35-01]
provides:
  - "POST /api/parts — create part_definition w/ auto-generated drawing (drawing_rev=1)"
  - "PATCH /api/parts/:id — update editable field subset, 409 on part_number collision"
  - "PATCH /api/parts/:id/drawing — replace SVG, bump drawing_rev, append part_revisions row, optional expected_rev 409"
  - "POST /api/parts/:id/drawing/regenerate — regenerate via generateDrawingSvg, bump rev, append revision, return new SVG"
  - "POST /api/parts/:id/restore — clear retired_at"
affects: [35-03, 35-05, 35-06]
tech-stack:
  added: []
  patterns: [hardened-catch, best-effort-audit-log, parametrized-dynamic-set, shared-helper-applyDrawingChange]
key-files:
  created:
    - /Users/jeet/turion-satellite/backend/tests/parts.write.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
decisions:
  - "Tasks 1+2 committed as one commit (7cb7de1) — both add routes to the same file region; splitting would have produced a meaningless intermediate state"
  - "part_definitions.created_by has a FK to team_members(id) but the JWT sub is a Supabase auth UUID — left created_by unset (nullable) on POST rather than risk an FK violation; part_revisions.edited_by has no FK so it gets req.user.id"
  - "audit actions use migration-022's CHECK list verbatim: create_part_definition / edit_part_definition / edit_part_drawing (source: manual|regenerate) / restore_part_definition"
  - "req.params.id typed as string|string[] under this express version — coerced with String() in each route before passing to typed helpers"
  - "DELETE/retire route + retired_at filter sweep deliberately NOT added — owned by 35-03 (sequenced after 35-02 to avoid a parts.ts merge race)"
metrics:
  duration: ~30min
  tasks: 3
  files: 2
  completed: 2026-05-12
---

# Phase 35 Plan 02: Parts CRUD + drawing-mutation routes Summary

Added the five write routes the drawing editor (35-05) and part-management UI (35-06) call, all into the already-mounted `parts` router — no `app.ts` change, button audit picks them up automatically.

## What shipped

### Task 1 + 2 — five new routes in `backend/src/routes/parts.ts` (commit `7cb7de1`)
- `POST /api/parts` (requireAuth): validates `part_number` non-empty, `description` non-empty, `subsystem_id` non-empty, `default_make_buy ∈ {make,buy}`, optional `dimensions_mm` (object), `itar_flag` (bool, default false). Looks up the subsystem's `code`, builds `specifications = {dimensions_mm}` (or `{}`), generates `drawing_svg` via `generateDrawingSvg({part_number, subsystem_code, specifications})`, INSERTs with `drawing_rev=1`, `flagged_for_review=false`. Returns 201 with the row; 400 on validation failure / unknown subsystem; 409 on `23505` (duplicate part_number). Best-effort `audit_log` action `create_part_definition`.
- `PATCH /api/parts/:id` (requireAuth): accepts any subset of `{part_number, description, default_make_buy, itar_flag, subsystem_id, dimensions_mm}`. Validates each provided key; builds a parametrized dynamic `SET` clause (`dimensions_mm` → `jsonb_set(coalesce(specifications,'{}'::jsonb), '{dimensions_mm}', $::jsonb)`). `WHERE id=$ AND retired_at IS NULL RETURNING …`. 400 if no updatable fields / bad value / unknown subsystem; 404 if no row; 409 on `23505`. Audit `edit_part_definition`. Does NOT auto-regenerate the drawing.
- `PATCH /api/parts/:id/drawing` (requireAuth): body `{drawing_svg, expected_rev?}`. Validates `drawing_svg` is a string, trimmed `startsWith('<svg')` + `includes('</svg>')`, `length < 500_000`. If `expected_rev` given: SELECT current `drawing_rev` (404 if no active row), 409 `{error, current_rev}` on mismatch. Then `UPDATE … SET drawing_svg=$, drawing_rev=drawing_rev+1 WHERE id=$ AND retired_at IS NULL RETURNING id, drawing_rev` (404 if no row) + INSERT `turion_satellite.part_revisions (part_def_id, rev, drawing_svg, edited_by)` with the NEW rev. Returns `{part_id, drawing_rev}`. Audit `edit_part_drawing` (source: manual).
- `POST /api/parts/:id/drawing/regenerate` (requireAuth): fetches `part_number` + `specifications` + subsystem `code`, calls `generateDrawingSvg(...)` (500 on generator throw), then the same update+bump+`part_revisions` flow via the shared `applyDrawingChange()` helper. Returns `{part_id, drawing_rev, drawing_svg}` so the frontend re-renders without a refetch. Audit `edit_part_drawing` (source: regenerate).
- `POST /api/parts/:id/restore` (requireAuth): `UPDATE part_definitions SET retired_at=NULL WHERE id=$ RETURNING id` — 404 if no row, else `{ok:true, id}`. Audit `restore_part_definition`.

All five have hardened catch blocks (log `err` server-side, return a generic `{error}`, never `err.message`). Shared helpers: `auditPart()` (best-effort `audit_log` insert, never fatal — mirrors `make-buy-decisions`/`fx-rates`) and `applyDrawingChange()` (update + bump + append `part_revisions`). `import { generateDrawingSvg } from '../cad-templates'` (bare specifier, matching 35-01's commonjs convention). `npx tsc --noEmit` → clean; `node backend/scripts/audit-satellite-buttons.mjs` → `routes: 72, violations: 0`.

### Task 3 — `backend/tests/parts.write.test.ts` (commit `b4a88b5`)
22 vitest+supertest cases (modeled on `parts.test.ts` — `vi.mock('../src/db')`, ES256 JWT via `crypto.generateKeyPairSync('ec',{namedCurve:'P-256'})` → `process.env.SUPABASE_JWT_PUBLIC_KEY`):
- `POST /api/parts`: 401 no-auth · 400 bad `default_make_buy` · 400 unknown `subsystem_id` · 201 happy (asserts `id` + `drawing_rev:1`) · 409 on a mock `{code:'23505'}` reject.
- `PATCH /api/parts/:id`: 401 · 400 empty body · 404 (UPDATE→null) · 200 partial body · 200 `dimensions_mm` (asserts SQL contains `jsonb_set`) · 400 bad `subsystem_id`.
- `PATCH /api/parts/:id/drawing`: 401 · 400 non-SVG string · 404 (UPDATE→null) · 200 happy (asserts `drawing_rev:2` AND that a `part_revisions` INSERT ran) · 409 `expected_rev` mismatch (asserts `current_rev:5`).
- `POST /api/parts/:id/drawing/regenerate`: 401 · 404 (part lookup→null) · 200 happy (asserts `drawing_rev:3` + `drawing_svg` is a string starting `<svg` — exercises the real `generateDrawingSvg` on `ADCS-ASSY`).
- `POST /api/parts/:id/restore`: 401 · 404 (UPDATE→null) · 200 `{ok:true}`.

`npx vitest run tests/parts.write.test.ts` → 22/22 pass. Full suite `npx vitest run` → **390 passed | 1 skipped** (was 368+1 after 35-01; +22 new, zero regressions). `npx tsc --noEmit` clean.

## Deviations from Plan

**1. [pragmatic] Tasks 1 and 2 share one commit (`7cb7de1`).** Both add routes to the same contiguous block of `parts.ts` before `export default router;`. Committing Task 1's three routes separately, then Task 2's two, would have left a half-wired intermediate commit with no benefit. The done-criteria for both tasks are satisfied by `7cb7de1`.

**2. [Rule 3 — blocking] `created_by` FK.** Plan said `created_by = req.user.id` on `POST /api/parts`. `part_definitions.created_by` has `REFERENCES team_members(id)`, but the JWT `sub` is a Supabase **auth** user UUID, not a `team_members.id` — passing it would risk a `23503` FK violation on real data. Left `created_by` unset (column is nullable). `part_revisions.edited_by` has no FK, so it correctly gets `req.user?.id`. `audit_log.actor_user_id` likewise gets `req.user?.id` (matches the pattern in `make-buy-decisions.ts`).

**3. [Rule 3 — blocking] `req.params.id` is `string | string[]`** under this project's express typings — `String(req.params.id)` coercion added in each route before passing into the typed `applyDrawingChange()` / `auditPart()` helpers.

Otherwise the plan executed as written. No auth gates, no architectural changes.

## NOT done (owned by other plans)
- `git push` + `./build-and-push.sh` Lambda redeploy — owned by 35-07. Commits are local-only on `turion-satellite` main.
- The `DELETE /api/parts/:id` retire route + the `retired_at` active/retired filter on `GET /api/parts` — 35-03 (sequenced after 35-02 to avoid a `parts.ts` merge race).
- Frontend wiring (drawing editor, part-management UI) — 35-05 / 35-06. No frontend calls these routes yet; that's expected and the button audit still passes (routes auto-allowlisted via the mounted router).

## Self-Check: PASSED
- `backend/src/routes/parts.ts` — modified; `grep "router.post\|router.patch"` shows POST `/`, PATCH `/:id`, PATCH `/:id/drawing`, POST `/:id/drawing/regenerate`, POST `/:id/restore` — FOUND
- `backend/tests/parts.write.test.ts` — FOUND; 22/22 pass; full suite 390 pass / 1 skip
- `import { generateDrawingSvg } from '../cad-templates'` present in parts.ts — FOUND
- `INSERT INTO turion_satellite.part_revisions` present in parts.ts — FOUND
- `npx tsc --noEmit` clean; button audit `violations: 0`
- commits `7cb7de1`, `b4a88b5` — FOUND on turion-satellite main (`jeet-avatar <jm@techcloudpro.com>`)
